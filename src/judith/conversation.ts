import { MessageRole, User } from "@prisma/client";
import { prisma } from "../db/client.js";
import { askJudith, ChatTurn } from "./claude.js";
import { processarOnboarding } from "./onboarding/flow.js";
import { checarCota, registrarUso } from "./quota.js";
import { routeIntent } from "./router.js";
import { KnowledgeSearchError, knowledgeMessage } from "../knowledge/errors.js";
import { smalltalk } from "./smalltalk.js";
import { createHash } from "node:crypto";
import { AREAS, Area } from "../knowledge/areas.js";

// Limite de histórico de sessão (Seção 4.5 do briefing v6): 8 turnos cheios.
const TURN_WINDOW = 8;
// Janela de sessão: após 30 min sem mensagem, abre nova sessão.
const SESSION_IDLE_MIN = 30;

async function getOrCreateActiveSession(userId: string) {
  const cutoff = new Date(Date.now() - SESSION_IDLE_MIN * 60_000);
  const recent = await prisma.session.findFirst({
    where: { userId, closed: false, lastSeenAt: { gte: cutoff } },
    orderBy: { lastSeenAt: "desc" },
  });
  if (recent) return recent;
  return prisma.session.create({ data: { userId } });
}

async function loadHistory(sessionId: string): Promise<ChatTurn[]> {
  const recent = await prisma.message.findMany({
    where: { sessionId, role: { in: [MessageRole.USER, MessageRole.ASSISTANT] } },
    orderBy: { createdAt: "desc" },
    take: TURN_WINDOW * 2,
  });
  return recent
    .reverse()
    .map((m) => ({
      role: m.role === MessageRole.USER ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
}

// Área usada na pergunta anterior mais recente desta sessão (dentro da mesma janela de
// histórico). O rastro de cada pergunta é gravado com o id da mensagem do usuário.
async function loadPreviousArea(sessionId: string): Promise<Area | null> {
  const questions = await prisma.message.findMany({
    where: { sessionId, role: MessageRole.USER },
    orderBy: { createdAt: "desc" },
    take: TURN_WINDOW,
    select: { id: true },
  });
  if (!questions.length) return null;
  const traces = await prisma.knowledgeInteraction.findMany({ where: { id: { in: questions.map(q => q.id) } } });
  for (const q of questions) {
    const area = (traces.find(t => t.id === q.id)?.payload as { area?: unknown } | undefined)?.area;
    if (typeof area === "string" && AREAS.includes(area as Area)) return area as Area;
  }
  return null;
}

export type HandleInput = {
  whatsappNumber: string;
  pushName?: string;
  text: string;
  hasAttachment: boolean;
  messageId?: string;
};

export type HandleOutput = {
  // Lista de mensagens pra mandar em sequência (WhatsApp-first style)
  replies: string[];
  sessionId?: string;
  userId: string;
  modelUsed?: string;
  knowledgeFailure?: string;
  // Resposta da base (função dúvida): a última mensagem de replies pode receber 👍/👎.
  feedbackInteractionId?: string;
};

export async function handleInbound(input: HandleInput): Promise<HandleOutput> {
  // 1. Passa pelo onboarding primeiro
  const { user, resultado } = await processarOnboarding({
    whatsappNumber: input.whatsappNumber,
    pushName: input.pushName,
    texto: input.text || "(anexo)",
  });

  if (resultado.tipo === "responder") {
    // Onboarding cuidou do turno — não chama IA
    return {
      replies: resultado.mensagens,
      userId: user.id,
    };
  }

  // 2. Onboarding deixou seguir — checa assinatura/cota antes de chamar IA
  const commonReply = !input.hasAttachment ? smalltalk(resultado.mensagemParaIA) : null;
  if (commonReply) return { replies: [commonReply], userId: user.id };
  const route = routeIntent({ text: resultado.mensagemParaIA, hasAttachment: input.hasAttachment });

  const cota = await checarCota(user, route.funcao);
  if (!cota.allowed) {
    if (cota.motivo === "pagamento_indisponivel") {
      return {
        replies: ["Sua cota para este serviço acabou e não consegui gerar o link de pagamento agora. Tente novamente em instantes; nenhum crédito foi consumido."],
        userId: user.id,
      };
    }
    if (cota.motivo === "cota_estourada") {
      return {
        replies: [
          `Você já usou tudo que seu plano inclui esse mês pra ${cota.servicoLabel}. Pra continuar agora, sem esperar o mês virar, é só pagar avulso por esse link:\n\n${cota.linkCompra}`,
        ],
        userId: user.id,
      };
    }
    return {
      replies: ["Sua assinatura não está ativa no momento. Manda um oi que a gente resolve o acesso pra você. 🙂"],
      userId: user.id,
    };
  }

  const session = await getOrCreateActiveSession(user.id);
  const history = await loadHistory(session.id);
  // Lida antes de gravar a mensagem atual, para não pegar a própria pergunta.
  // Só ajuda a busca: se a leitura falhar, segue como pergunta sem área anterior.
  const previousArea = route.funcao === "duvida" && history.length ? await loadPreviousArea(session.id).catch(() => null) : null;

  // Persist incoming text before any fallible search/generation. Stable transport ID prevents
  // duplicate history and charging on webhook redelivery; a new user message has a new ID.
  const incomingId = input.messageId ? createHash("sha256").update(JSON.stringify([user.id, input.messageId])).digest("hex") : undefined;
  let persistedIncomingId = incomingId;
  try {
    const saved = await prisma.message.create({ data: { ...(incomingId ? { id: incomingId } : {}), sessionId: session.id, role: MessageRole.USER, content: resultado.mensagemParaIA } });
    persistedIncomingId = saved.id;
  } catch (error) {
    if (incomingId && typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { replies: [], userId: user.id, sessionId: session.id };
    throw error;
  }
  await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });

  let result;
  try {
    result = await askJudith({
      tier: route.tier,
      funcao: route.funcao,
      user,
      history,
      userMessage: resultado.mensagemParaIA,
      interactionId: persistedIncomingId,
      previousArea,
    });
  } catch (error) {
    if (!(error instanceof KnowledgeSearchError)) throw error;
    return { replies: [knowledgeMessage(error.code)], sessionId: session.id, userId: user.id, knowledgeFailure: error.code };
  }

  if (!result.text.trim()) throw new Error("A IA retornou uma resposta vazia");

  await prisma.$transaction(async (db) => {
    await registrarUso(db, user.id, route.funcao);
    await db.message.create({
      data: {
        sessionId: session.id,
        role: MessageRole.ASSISTANT,
        content: result.text,
        model: route.tier,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cacheReadTokens: result.cacheReadTokens,
        cacheWriteTokens: result.cacheWriteTokens,
      },
    });
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }, { isolationLevel: "ReadCommitted" });

  return {
    replies: [...(resultado.mensagensExtras ?? []), result.text],
    sessionId: session.id,
    userId: user.id,
    modelUsed: result.model,
    ...(route.funcao === "duvida" && persistedIncomingId ? { feedbackInteractionId: persistedIncomingId } : {}),
  };
}
