import { MessageRole, User } from "@prisma/client";
import { prisma } from "../db/client.js";
import { askJudith, ChatTurn } from "./claude.js";
import { processarOnboarding } from "./onboarding/flow.js";
import { checarCota, registrarUso } from "./quota.js";
import { routeIntent } from "./router.js";

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

export type HandleInput = {
  whatsappNumber: string;
  pushName?: string;
  text: string;
  hasAttachment: boolean;
};

export type HandleOutput = {
  // Lista de mensagens pra mandar em sequência (WhatsApp-first style)
  replies: string[];
  sessionId?: string;
  userId: string;
  modelUsed?: string;
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
  const route = routeIntent({ text: resultado.mensagemParaIA, hasAttachment: input.hasAttachment });

  const cota = await checarCota(user, route.funcao);
  if (!cota.allowed) {
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

  const result = await askJudith({
    tier: route.tier,
    funcao: route.funcao,
    user,
    history,
    userMessage: resultado.mensagemParaIA,
  });

  await prisma.$transaction([
    prisma.message.create({
      data: {
        sessionId: session.id,
        role: MessageRole.USER,
        content: resultado.mensagemParaIA,
      },
    }),
    prisma.message.create({
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
    }),
    prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    }),
  ]);

  await registrarUso(user.id, route.funcao);

  return {
    replies: [...(resultado.mensagensExtras ?? []), result.text],
    sessionId: session.id,
    userId: user.id,
    modelUsed: result.model,
  };
}
