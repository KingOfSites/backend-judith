import { MessageRole, ModelTier, User } from "@prisma/client";
import { prisma } from "../db/client.js";
import { carregarRegras } from "../regras/repository.js";
import { planejarTurno, PlanoTurno } from "../regras/fluxo.js";
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
  // Rastro das Regras de Composição/Análise: o que subiu neste turno (vai pro log).
  regras?: {
    funcao: string;
    tipo: string | null;
    desvio: boolean;
    cobrou: boolean;
    motivo: string;
    trocouDeFluxo?: boolean;
    usadas: string[];
    ausentes?: string[];
    cortadas?: string[];
  };
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

  // 2. Regras de Composição/Análise: só entram em cena quando há tipos cadastrados no Admin.
  //    Sem cadastro, o fluxo é exatamente o de antes.
  const regras = await carregarRegras();
  const sessaoDoFluxo = regras.habilitadas ? await getOrCreateActiveSession(user.id) : null;
  const historicoDoFluxo = sessaoDoFluxo ? await loadHistory(sessaoDoFluxo.id) : null;
  const fluxoAberto = Boolean(sessaoDoFluxo?.fluxo);

  // 3. Onboarding deixou seguir — checa assinatura/cota antes de chamar IA.
  //    Com documento em andamento, um "ok" é resposta da coleta, não conversa fiada.
  const commonReply = !input.hasAttachment && !fluxoAberto ? smalltalk(resultado.mensagemParaIA) : null;
  if (commonReply) return { replies: [commonReply], userId: user.id };
  let route = routeIntent({ text: resultado.mensagemParaIA, hasAttachment: input.hasAttachment });

  let plano: PlanoTurno | null = null;
  if (sessaoDoFluxo && historicoDoFluxo) {
    plano = await planejarTurno({
      snapshot: regras,
      estado: { fluxo: sessaoDoFluxo.fluxo, fluxoTipo: sessaoDoFluxo.fluxoTipo, fluxoOcioso: sessaoDoFluxo.fluxoOcioso, fluxoCobrado: sessaoDoFluxo.fluxoCobrado },
      funcaoRoteada: route.funcao,
      texto: resultado.mensagemParaIA,
      anteriores: historicoDoFluxo,
    });
    if (plano.funcao !== route.funcao) {
      route = { ...route, funcao: plano.funcao, tier: plano.funcao === "duvida" ? route.tier : ModelTier.SONNET, reason: plano.motivo };
    }

    if (plano.desvio) {
      // Desvio antes do modelo caro: mensagem fixa, sem chamada ao modelo e sem consumir cota.
      const desvioId = input.messageId ? createHash("sha256").update(JSON.stringify([user.id, input.messageId])).digest("hex") : undefined;
      try {
        await prisma.message.create({ data: { ...(desvioId ? { id: desvioId } : {}), sessionId: sessaoDoFluxo.id, role: MessageRole.USER, content: resultado.mensagemParaIA } });
      } catch (error) {
        if (desvioId && typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { replies: [], userId: user.id, sessionId: sessaoDoFluxo.id };
        throw error;
      }
      await prisma.message.create({ data: { sessionId: sessaoDoFluxo.id, role: MessageRole.ASSISTANT, content: plano.desvio.mensagem } });
      await prisma.session.update({ where: { id: sessaoDoFluxo.id }, data: { lastSeenAt: new Date(), ...plano.proximoEstado } });
      return {
        replies: [plano.desvio.mensagem],
        sessionId: sessaoDoFluxo.id,
        userId: user.id,
        regras: { funcao: plano.funcao, tipo: plano.tipo, desvio: true, cobrou: false, usadas: [], motivo: plano.motivo },
      };
    }
  }

  // Cota é por documento: turnos seguintes do mesmo fluxo não consomem de novo.
  const cobrar = plano ? plano.cobrar : true;
  const cota = cobrar ? await checarCota(user, route.funcao) : { allowed: true as const };
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

  const session = sessaoDoFluxo ?? await getOrCreateActiveSession(user.id);
  const history = historicoDoFluxo ?? await loadHistory(session.id);
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
      regras: plano?.pacote ? { sempre: plano.pacote.sempre, doTipo: plano.pacote.doTipo } : undefined,
    });
  } catch (error) {
    if (!(error instanceof KnowledgeSearchError)) throw error;
    return { replies: [knowledgeMessage(error.code)], sessionId: session.id, userId: user.id, knowledgeFailure: error.code };
  }

  if (!result.text.trim()) throw new Error("A IA retornou uma resposta vazia");

  await prisma.$transaction(async (db) => {
    if (cobrar) await registrarUso(db, user.id, route.funcao);
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
      data: { lastSeenAt: new Date(), ...(plano ? plano.proximoEstado : {}) },
    });
  }, { isolationLevel: "ReadCommitted" });

  return {
    replies: [...(resultado.mensagensExtras ?? []), result.text],
    sessionId: session.id,
    userId: user.id,
    modelUsed: result.model,
    ...(route.funcao === "duvida" && persistedIncomingId ? { feedbackInteractionId: persistedIncomingId } : {}),
    ...(plano && plano.funcao !== "duvida"
      ? {
          regras: {
            funcao: plano.funcao, tipo: plano.tipo, desvio: false, cobrou: cobrar, motivo: plano.motivo,
            trocouDeFluxo: plano.trocouDeFluxo,
            usadas: plano.pacote?.usadas.map(u => `${u.papel}:${u.codigo}`) ?? [],
            ausentes: plano.pacote?.ausentes, cortadas: plano.pacote?.cortadas,
          },
        }
      : {}),
  };
}
