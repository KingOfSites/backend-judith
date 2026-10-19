import { MessageRole, ModelTier, User } from "@prisma/client";
import { prisma } from "../db/client.js";
import { carregarRegras } from "../regras/repository.js";
import { planejarTurno, PlanoTurno } from "../regras/fluxo.js";
import { isPedidoHumano, registrarPedidoHumano } from "./humano.js";
import { getKnowledgeContext } from "./conhecimento.js";
import { askJudith, ChatTurn } from "./claude.js";
import { processarOnboarding } from "./onboarding/flow.js";
import { carregarTextosOnboarding, nomeParaSaudacao, preencher, TEXTOS_RESERVA } from "./onboarding/textos.js";
import { checarCota, registrarUso, trialVencido } from "./quota.js";
import { routeIntent } from "./router.js";
import { classificarIntencao, MENSAGEM_FORA_DO_ESCOPO_RESERVA } from "./intencao.js";
import { KnowledgeSearchError, knowledgeMessage } from "../knowledge/errors.js";
import { smalltalk } from "./smalltalk.js";
import { createHash } from "node:crypto";
import { AREAS, Area } from "../knowledge/areas.js";
import { ehMesmaDuvida } from "./cota-duvida.js";
import { Leitura, LeituraCodigo, MENSAGEM_LEITURA, montarMensagemComDocumento } from "./leitura.js";
import { gerarPdf, nomeDoArquivo, pareceDocumentoPronto, tituloDoDocumento } from "./pdf.js";
import {
  confirmacaoPendente, confirmarCancelamento, desistirCancelamento, desistirExclusaoDados, iniciarCancelamento,
  isConfirmacao, isDesistenciaExclusao, isNegativa, isPedidoCancelamento, isPedidoExclusaoDados, limparConfirmacao, pedirExclusaoDados,
} from "./cancelamento.js";
import {
  criarLembrete, extrairLembrete, isPedidoAvulso, isPedidoCota, isPedidoLembretes, listarLembretes, pediuEmTexto, respostaSemPlano, resumoCota,
} from "./autoatendimento.js";

// Só usada se o fundador não tiver definido a mensagem no Admin (Classificadores e desvio).
export const MENSAGEM_ANEXO_RESERVA =
  "Não consegui ler esse arquivo agora. Pode mandar de novo em instantes, ou copiar e colar o texto do documento na conversa? Nada foi descontado da sua cota. 🙂";

// Mensagem de entrega do documento. Hoje é editada em Onboarding (entregaDocumento); a chave antiga
// de Regras (mensagemEntregaDocumento) continua valendo se for a única preenchida.
export const MENSAGEM_ENTREGA_RESERVA = TEXTOS_RESERVA.entregaDocumento;

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

// Arquivo recebido: lido (texto do documento) ou não lido (motivo).
export type AnexoInput = { leitura: Leitura; fileName?: string } | { erro: LeituraCodigo };

export type HandleInput = {
  whatsappNumber: string;
  pushName?: string;
  text: string;
  hasAttachment: boolean;
  anexo?: AnexoInput;
  messageId?: string;
};

export type DocumentoPronto = { pdf: Buffer; fileName: string; titulo: string; mensagemEntrega: string };

export type Autoatendimento = "cota" | "lembretes" | "lembrete_criado" | "avulso" | "sem_plano" | "fora_do_escopo";

export type HandleOutput = {
  // Lista de mensagens pra mandar em sequência (WhatsApp-first style)
  replies: string[];
  sessionId?: string;
  userId: string;
  modelUsed?: string;
  knowledgeFailure?: string;
  // Resposta da base (função dúvida): a última mensagem de replies pode receber 👍/👎.
  feedbackInteractionId?: string;
  // Turno resolvido sem modelo: arquivo que não foi lido, pedido de humano, cancelamento, exclusão.
  anexoNaoLido?: boolean;
  pedidoHumano?: boolean;
  cancelamento?: "pedido" | "confirmado" | "desistiu";
  exclusaoDados?: "pedido" | "desistiu";
  // Turno resolvido sem modelo: cota, lembretes, avulso, sem plano, fora do escopo.
  autoatendimento?: Autoatendimento;
  // Documento redigido: vai como PDF com a mensagem de encerramento no lugar do texto.
  documento?: DocumentoPronto;
  // Documento redigido entregue em texto (a pedido do cliente ou PDF indisponível): texto + entrega.
  entregaEmTexto?: boolean;
  // Intenção lida pelo classificador editável (ou "palavras-chave" quando ele falhou/não rodou).
  intencao?: { valor: string; origem: string };
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
  // Cota: se este turno consumiu e por quê (dúvida por tema).
  cota?: { cobrou: boolean; motivo: string };
};

function idEstavel(user: User, messageId?: string): string | undefined {
  return messageId ? createHash("sha256").update(JSON.stringify([user.id, messageId])).digest("hex") : undefined;
}

function duplicada(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}

// Turno resolvido sem modelo (humano, cancelamento, exclusão, autoatendimento): grava o par pergunta/resposta.
async function gravarTurnoFixo(user: User, sessionId: string, entrada: string, resposta: string, meta: Record<string, string>, messageId?: string): Promise<boolean> {
  const id = idEstavel(user, messageId);
  try {
    await prisma.message.create({ data: { ...(id ? { id } : {}), sessionId, role: MessageRole.USER, content: entrada } });
  } catch (error) {
    if (id && duplicada(error)) return false;
    throw error;
  }
  await prisma.message.create({ data: { sessionId, role: MessageRole.ASSISTANT, content: resposta, meta } });
  await prisma.session.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } });
  return true;
}

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
  const textos = await carregarTextosOnboarding();

  // Arquivo que não pôde ser lido (formato, tamanho, sem texto ou falha): aviso sem modelo e
  // sem cota. Com leitura, o texto do documento entra no pipeline como análise.
  if (input.hasAttachment && (!input.anexo || "erro" in input.anexo)) {
    const codigo = input.anexo && "erro" in input.anexo ? input.anexo.erro : "FALHA";
    const mensagem = codigo === "FALHA" ? regras.config.mensagemAnexoNaoLido?.trim() || MENSAGEM_ANEXO_RESERVA : MENSAGEM_LEITURA[codigo];
    return { replies: [mensagem], userId: user.id, anexoNaoLido: true };
  }
  const anexoLido = input.anexo && "leitura" in input.anexo ? input.anexo : null;
  const texto = anexoLido ? montarMensagemComDocumento(resultado.mensagemParaIA === "(anexo)" ? "" : resultado.mensagemParaIA, anexoLido.leitura, anexoLido.fileName) : resultado.mensagemParaIA;

  const session = await getOrCreateActiveSession(user.id);
  const history = await loadHistory(session.id);
  const fluxoAberto = regras.habilitadas && Boolean(session.fluxo);

  // 3. Cancelamento em confirmação: SIM cancela, NÃO mantém, qualquer outra coisa segue normal.
  if (!anexoLido && confirmacaoPendente(user)) {
    if (isConfirmacao(texto)) {
      const mensagem = await confirmarCancelamento(user);
      await gravarTurnoFixo(user, session.id, texto, mensagem, { funcao: "cancelamento", etapa: "confirmado" }, input.messageId);
      return { replies: [mensagem], userId: user.id, sessionId: session.id, cancelamento: "confirmado" };
    }
    if (isNegativa(texto)) {
      const mensagem = await desistirCancelamento(user);
      await gravarTurnoFixo(user, session.id, texto, mensagem, { funcao: "cancelamento", etapa: "desistiu" }, input.messageId);
      return { replies: [mensagem], userId: user.id, sessionId: session.id, cancelamento: "desistiu" };
    }
    await limparConfirmacao(user);
  }

  // Onboarding deixou seguir — checa assinatura/cota antes de chamar IA.
  // Com documento em andamento, um "ok" é resposta da coleta, não conversa fiada.
  // A saudação de quem volta é editável em Onboarding (saudacaoRetorno).
  const commonReply = !fluxoAberto && !anexoLido ? smalltalk(texto, { saudacao: preencher(textos.saudacaoRetorno, { nome: nomeParaSaudacao(user.nome) }) }) : null;
  if (commonReply) return { replies: [commonReply], userId: user.id };

  // Turnos resolvidos sem modelo e sem cota.
  const fixo = async (mensagem: string, meta: Record<string, string>, extra: Partial<HandleOutput>): Promise<HandleOutput> => {
    await gravarTurnoFixo(user, session.id, texto, mensagem, meta, input.messageId);
    return { replies: [mensagem], userId: user.id, sessionId: session.id, ...extra };
  };

  if (!fluxoAberto && !anexoLido) {
    // Cancelar a assinatura da JUDITH: pede confirmação com o uso do mês. Sem modelo e sem cota.
    if (isPedidoCancelamento(texto)) return fixo(await iniciarCancelamento(user), { funcao: "cancelamento", etapa: "pedido" }, { cancelamento: "pedido" });
    // LGPD: exclusão dos dados (ou desistência dela).
    if (user.exclusaoSolicitadaEm && isDesistenciaExclusao(texto)) return fixo(await desistirExclusaoDados(user), { funcao: "exclusao", etapa: "desistiu" }, { exclusaoDados: "desistiu" });
    if (isPedidoExclusaoDados(texto)) return fixo(await pedirExclusaoDados(user), { funcao: "exclusao", etapa: "pedido" }, { exclusaoDados: "pedido" });
    // Pedido de atendimento humano: mensagem fixa com o canal, alerta no painel, sem modelo e sem cota.
    if (isPedidoHumano(texto)) {
      const mensagem = await registrarPedidoHumano({ userId: user.id, whatsappNumber: user.whatsappNumber, nome: user.nome, texto, mensagemConfigurada: regras.config.mensagemAtendimentoHumano });
      return fixo(mensagem, { funcao: "humano" }, { pedidoHumano: true });
    }
    // Autoatendimento: cota do mês, lembretes (ver e criar) e avulso sem plano.
    if (isPedidoCota(texto)) return fixo(await resumoCota(user), { funcao: "autoatendimento", tipo: "cota" }, { autoatendimento: "cota" });
    if (isPedidoLembretes(texto)) return fixo(await listarLembretes(user), { funcao: "autoatendimento", tipo: "lembretes" }, { autoatendimento: "lembretes" });
    const lembrete = extrairLembrete(texto);
    if (lembrete) return fixo(await criarLembrete(user, lembrete), { funcao: "autoatendimento", tipo: "lembrete_criado", titulo: lembrete.titulo }, { autoatendimento: "lembrete_criado" });
    if (isPedidoAvulso(texto)) return fixo(await respostaSemPlano(user, "duvida", "pedido_avulso"), { funcao: "autoatendimento", tipo: "avulso" }, { autoatendimento: "avulso" });
  }

  // 4. Intenção: palavras-chave do router e, sem anexo nem fluxo aberto, o classificador editável
  //    (Regras → Classificadores). Ele decide dúvida / redação / análise / fora do escopo; se falhar,
  //    valem as palavras-chave.
  let route = routeIntent({ text: texto, hasAttachment: Boolean(anexoLido) });
  let intencao: HandleOutput["intencao"] = { valor: route.funcao, origem: "palavras-chave" };
  if (!anexoLido && !fluxoAberto) {
    const lida = await classificarIntencao(regras.config, texto, history);
    if (lida.origem === "classificador") {
      intencao = { valor: lida.intencao, origem: "classificador" };
      if (lida.intencao === "fora_do_escopo") {
        const mensagem = regras.config.mensagemForaDoEscopo?.trim() || MENSAGEM_FORA_DO_ESCOPO_RESERVA;
        return fixo(mensagem, { funcao: "fora_do_escopo", intencao: "fora_do_escopo" }, { autoatendimento: "fora_do_escopo", intencao });
      }
      if (lida.intencao !== route.funcao) {
        route = { ...route, funcao: lida.intencao, tier: lida.intencao === "duvida" ? route.tier : ModelTier.SONNET, reason: `classificador de intenção: ${lida.intencao}` };
      }
    }
  }

  let plano: PlanoTurno | null = null;
  if (regras.habilitadas) {
    plano = await planejarTurno({
      snapshot: regras,
      estado: { fluxo: session.fluxo, fluxoTipo: session.fluxoTipo, fluxoOcioso: session.fluxoOcioso, fluxoCobrado: session.fluxoCobrado },
      funcaoRoteada: route.funcao,
      texto,
      anteriores: history,
    });
    if (plano.funcao !== route.funcao) {
      route = { ...route, funcao: plano.funcao, tier: plano.funcao === "duvida" ? route.tier : ModelTier.SONNET, reason: plano.motivo };
    }

    if (plano.desvio) {
      // Desvio antes do modelo caro: mensagem fixa, sem chamada ao modelo e sem consumir cota.
      const desvioId = idEstavel(user, input.messageId);
      try {
        await prisma.message.create({ data: { ...(desvioId ? { id: desvioId } : {}), sessionId: session.id, role: MessageRole.USER, content: texto } });
      } catch (error) {
        if (desvioId && duplicada(error)) return { replies: [], userId: user.id, sessionId: session.id };
        throw error;
      }
      await prisma.message.create({ data: { sessionId: session.id, role: MessageRole.ASSISTANT, content: plano.desvio.mensagem } });
      await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(), ...plano.proximoEstado } });
      return {
        replies: [plano.desvio.mensagem],
        sessionId: session.id,
        userId: user.id,
        intencao,
        regras: { funcao: plano.funcao, tipo: plano.tipo, desvio: true, cobrou: false, usadas: [], motivo: plano.motivo },
      };
    }
  }

  // Cota é por documento (redação/análise) e por TEMA na dúvida: continuação da mesma dúvida,
  // resposta às perguntas de coleta e esclarecimentos não consomem de novo.
  let cobrar = plano ? plano.cobrar : true;
  let cotaMotivo = route.funcao === "duvida" ? "primeira dúvida da sessão" : "primeiro turno do documento";
  if (route.funcao === "duvida" && session.duvidaCobradaEm && session.duvidaTema) {
    const decisao = await ehMesmaDuvida(regras.config, session.duvidaTema, texto, history);
    if (decisao.mesma) {
      cobrar = false;
      cotaMotivo = decisao.origem === "falha" ? "classificador de tema indisponível: não cobra" : "continuação da mesma dúvida";
    } else {
      cotaMotivo = "dúvida nova (tema diferente)";
    }
  } else if (!cobrar && plano) {
    cotaMotivo = "turno seguinte do mesmo documento";
  }

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
    // Sem plano ativo: texto editável em Onboarding (trialEncerrado / avulsoSemPlano) com o link avulso.
    const mensagem = await respostaSemPlano(user, route.funcao, trialVencido(user) ? "trial_encerrado" : "sem_plano");
    return fixo(mensagem, { funcao: "autoatendimento", tipo: "sem_plano" }, { autoatendimento: "sem_plano", intencao });
  }

  // Lida antes de gravar a mensagem atual, para não pegar a própria pergunta.
  // Só ajuda a busca: se a leitura falhar, segue como pergunta sem área anterior.
  const previousArea = route.funcao === "duvida" && history.length ? await loadPreviousArea(session.id).catch(() => null) : null;

  // Persist incoming text before any fallible search/generation. Stable transport ID prevents
  // duplicate history and charging on webhook redelivery; a new user message has a new ID.
  const incomingId = idEstavel(user, input.messageId);
  let persistedIncomingId = incomingId;
  try {
    const saved = await prisma.message.create({
      data: {
        ...(incomingId ? { id: incomingId } : {}), sessionId: session.id, role: MessageRole.USER, content: texto,
        ...(anexoLido ? { meta: { anexo: { tipo: anexoLido.leitura.mimetype, paginas: anexoLido.leitura.paginas, caracteres: anexoLido.leitura.caracteres, arquivo: anexoLido.fileName ?? null, modeloLeitura: anexoLido.leitura.modelo } } } : {}),
      },
    });
    persistedIncomingId = saved.id;
  } catch (error) {
    if (incomingId && duplicada(error)) return { replies: [], userId: user.id, sessionId: session.id };
    throw error;
  }
  await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });

  // Redação que consulta a base (ex.: petição de Juizado): mesma busca da dúvida com o relato
  // do cliente, sempre puxando processual. Se a busca falhar, a redação segue só com as regras.
  let contextoBase: string | undefined;
  let blocosBase: string[] | undefined;
  if (plano?.consultaBase) {
    try {
      const ctx = await getKnowledgeContext(texto, history, null, ["processual"]);
      contextoBase = ctx.text;
      blocosBase = ctx.chunks.map(c => `${c.areas.join("/")} · ${c.chapter}`);
    } catch (error) {
      blocosBase = [];
      console.warn(JSON.stringify({ msg: "redacao.consultaBase.falhou", code: error instanceof KnowledgeSearchError ? error.code : String(error).slice(0, 120) }));
    }
  }

  let result;
  try {
    result = await askJudith({
      tier: route.tier,
      funcao: route.funcao,
      user,
      history,
      userMessage: texto,
      interactionId: persistedIncomingId,
      previousArea,
      regras: plano?.pacote ? { sempre: plano.pacote.sempre, doTipo: plano.pacote.doTipo, contextoBase } : undefined,
    });
  } catch (error) {
    if (!(error instanceof KnowledgeSearchError)) throw error;
    return { replies: [knowledgeMessage(error.code)], sessionId: session.id, userId: user.id, knowledgeFailure: error.code, intencao };
  }

  if (!result.text.trim()) throw new Error("A IA retornou uma resposta vazia");

  // Documento redigido pronto: PDF com logo e a mensagem de entrega como legenda. Se o cliente pediu
  // em texto (pra copiar e colar) ou o PDF falhar, o texto vai como mensagem e a entrega vai em seguida:
  // é ela que avisa do uso de IA e de quando passar por um advogado, então sai nos dois casos.
  let documento: DocumentoPronto | undefined;
  let entregaEmTexto = false;
  let mensagemEntregaTexto: string | undefined;
  if (route.funcao === "redacao" && pareceDocumentoPronto(result.text)) {
    const mensagemEntrega = textos.entregaDocumento !== TEXTOS_RESERVA.entregaDocumento
      ? textos.entregaDocumento
      : regras.config.mensagemEntregaDocumento?.trim() || textos.entregaDocumento;
    const emTexto = pediuEmTexto(texto) || history.filter(h => h.role === "user").slice(-3).some(h => pediuEmTexto(h.content));
    if (emTexto) {
      entregaEmTexto = true;
    } else {
      try {
        const titulo = tituloDoDocumento(result.text);
        const pdf = await gerarPdf(result.text, { titulo });
        documento = { pdf, fileName: nomeDoArquivo(titulo), titulo, mensagemEntrega };
      } catch (error) {
        entregaEmTexto = true;
        console.warn(JSON.stringify({ msg: "redacao.pdf.falhou", erro: error instanceof Error ? error.message : String(error) }));
      }
    }
    if (entregaEmTexto) { documento = undefined; mensagemEntregaTexto = mensagemEntrega; }
  }

  const estadoDuvida = route.funcao === "duvida" && cobrar ? { duvidaTema: texto.slice(0, 1000), duvidaCobradaEm: new Date() } : {};

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
        // Dados técnicos do turno, visíveis no painel sem abrir o conteúdo.
        meta: {
          funcao: route.funcao,
          modelo: result.model,
          cobrou: cobrar,
          cotaMotivo,
          intencao: intencao.valor,
          intencaoOrigem: intencao.origem,
          ...(result.fallback ? { fallback: result.fallback } : {}),
          ...(documento ? { pdf: documento.fileName, entrega: "pdf" } : {}),
          ...(entregaEmTexto ? { entrega: "texto" } : {}),
          ...(plano && plano.funcao !== "duvida"
            ? { tipo: plano.tipo, regras: plano.pacote?.usadas.map(u => `${u.papel}:${u.codigo} · ${u.titulo}`) ?? [], trocouDeFluxo: plano.trocouDeFluxo, ...(blocosBase ? { blocosBase } : {}) }
            : {}),
        },
      },
    });
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(), ...(plano ? plano.proximoEstado : {}), ...estadoDuvida },
    });
  }, { isolationLevel: "ReadCommitted" });

  return {
    replies: [...(resultado.mensagensExtras ?? []), ...(documento ? [] : [result.text]), ...(mensagemEntregaTexto ? [mensagemEntregaTexto] : [])],
    sessionId: session.id,
    userId: user.id,
    modelUsed: result.model,
    cota: { cobrou: cobrar, motivo: cotaMotivo },
    intencao,
    ...(documento ? { documento } : {}),
    ...(entregaEmTexto ? { entregaEmTexto } : {}),
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
