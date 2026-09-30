import { OnboardingEstado, User } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { env } from "../../config/env.js";
import { pegarDicaParaUsuario } from "./dicaPicker.js";
import { loadBaseRevisadaEm } from "../../knowledge/settings.js";
import { isAceiteTermos, isRecusaTermos, isSaudacao, parseTipoEmpresa } from "./intent.js";
import { carregarTextosOnboarding, preencher } from "./textos.js";
import { TERMOS_VERSAO, TRIAL_DIAS } from "../termos.js";

const URL_TERMOS = env.URL_TERMOS ?? `https://${env.JUDITH_DOMAIN}/termos`;

// Resultado de cada turno do onboarding:
// - "responder" → a JUDITH manda essas mensagens e termina o turno
// - "seguir_com_duvida" → onboarding terminou; chama o pipeline normal com `mensagemParaIA`
export type OnboardingResult =
  | { tipo: "responder"; mensagens: string[] }
  | { tipo: "seguir_com_duvida"; mensagemParaIA: string; mensagensExtras?: string[] };

// Os textos vivem na tabela OnboardingTexto (editável no Admin); aqui só se preenche.
async function textos() {
  const t = await carregarTextosOnboarding();
  const vars = { termos: URL_TERMOS, planos: `${env.WEB_JUDITH_URL}/planos` };
  return {
    boasVindas: preencher(t.boasVindas, vars),
    recebiDuvida: preencher(t.recebiDuvida, vars),
    perfilA: preencher(t.perfilA, vars),
    perfilB: preencher(t.perfilB, vars),
    recusa: preencher(t.recusa, vars),
    pedirPerfilDeNovo: preencher(t.pedirPerfilDeNovo, vars),
    confirmacaoA: (dica: string) => preencher(t.confirmacaoA, { ...vars, dica, reacao: t.dicaReacao }),
    confirmacaoB: (dica: string) => preencher(t.confirmacaoB, { ...vars, dica, reacao: t.dicaReacao }),
    revisaoBase: t.revisaoBase,
  };
}

// Primeiro contato: informa a data da última revisão da base (editada no Admin), antes do
// parágrafo dos termos. Sem data informada, a mensagem fica como está.
const PARAGRAFO = "\n\n";

export async function comRevisaoDaBase(mensagens: string[]): Promise<string[]> {
  const data = await loadBaseRevisadaEm();
  if (!data) return mensagens;
  const linha = preencher((await carregarTextosOnboarding()).revisaoBase, { revisao: data });
  return mensagens.map(m => {
    const paragrafos = m.split(PARAGRAFO);
    const termos = paragrafos.findIndex(p => p.includes(URL_TERMOS));
    if (termos < 1) return m;
    paragrafos.splice(termos, 0, linha);
    return paragrafos.join(PARAGRAFO);
  });
}

async function ensureUser(whatsappNumber: string, pushName?: string): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { whatsappNumber } });
  if (existing) return existing;
  return prisma.user.create({ data: { whatsappNumber, nome: pushName } });
}

// ------------------------------------------------------------
// Avalia o turno: decide se onboarding gerencia ou se deixa o pipeline normal rodar.
// ------------------------------------------------------------
export async function processarOnboarding(input: {
  whatsappNumber: string;
  pushName?: string;
  texto: string;
}): Promise<{ user: User; resultado: OnboardingResult }> {
  const user = await ensureUser(input.whatsappNumber, input.pushName);
  const texto = input.texto.trim();

  // --- Usuário já passou pelo onboarding ---
  if (user.onboarding === "CONCLUIDO") {
    // Quem entrou por cortesia (cadastro pelo painel) chega CONCLUIDO sem perfil.
    // A resposta muda bastante entre MEI, ME e autônomo: pergunta uma vez, na primeira conversa.
    if (!user.tipoEmpresa) {
      const saudacao = isSaudacao(texto);
      await prisma.user.update({
        where: { id: user.id },
        data: { onboarding: "AGUARDANDO_PERFIL", duvidaPendente: saudacao ? null : texto },
      });
      const t = await textos();
      return { user, resultado: { tipo: "responder", mensagens: [saudacao ? t.perfilA : t.perfilB] } };
    }
    return {
      user,
      resultado: { tipo: "seguir_com_duvida", mensagemParaIA: texto },
    };
  }

  const t = await textos();

  // --- Estado RECUSADO ---
  // Se voltou a interagir, tratamos como nova chance.
  if (user.onboarding === "RECUSADO") {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboarding: "AGUARDANDO_TERMOS", duvidaPendente: null },
    });
    user.onboarding = "AGUARDANDO_TERMOS";
  }

  // --- Estado AGUARDANDO_TERMOS ---
  if (user.onboarding === "AGUARDANDO_TERMOS") {
    // Primeira interação OU usuário ainda não aceitou
    const novoUsuario = !user.duvidaPendente && !user.aceitouTermos;

    // Se ele acabou de responder com SIM/aceite
    if (isAceiteTermos(texto)) {
      // O aceite grava a versão dos termos vigente e abre o trial de 30 dias (só na primeira vez).
      const abreTrial = !user.aceitouTermos && !user.trialFimEm && user.plano === "TRIAL";
      await prisma.user.update({
        where: { id: user.id },
        data: {
          aceitouTermos: true,
          aceitouTermosAt: new Date(),
          termosVersao: TERMOS_VERSAO,
          onboarding: "AGUARDANDO_PERFIL",
          ...(abreTrial ? { trialFimEm: new Date(Date.now() + TRIAL_DIAS * 24 * 60 * 60 * 1000) } : {}),
        },
      });
      // Diferencia Cenário A (saudação) e Cenário B (já tinha dúvida)
      return { user, resultado: { tipo: "responder", mensagens: [user.duvidaPendente ? t.perfilB : t.perfilA] } };
    }

    if (isRecusaTermos(texto)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { onboarding: "RECUSADO", duvidaPendente: null },
      });
      return { user, resultado: { tipo: "responder", mensagens: [t.recusa] } };
    }

    // Primeira mensagem — Cenário A (saudação) ou B (dúvida direta)
    if (novoUsuario) {
      if (isSaudacao(texto)) {
        return { user, resultado: { tipo: "responder", mensagens: await comRevisaoDaBase([t.boasVindas]) } };
      }
      // Cenário B — guarda a dúvida pra responder depois
      await prisma.user.update({
        where: { id: user.id },
        data: { duvidaPendente: texto },
      });
      return { user, resultado: { tipo: "responder", mensagens: await comRevisaoDaBase([t.recebiDuvida]) } };
    }

    // Reenvia o pedido de aceite (qualquer outra mensagem nesse estado)
    return { user, resultado: { tipo: "responder", mensagens: [t.recebiDuvida] } };
  }

  // --- Estado AGUARDANDO_PERFIL ---
  if (user.onboarding === "AGUARDANDO_PERFIL") {
    const tipo = parseTipoEmpresa(texto);
    if (!tipo) {
      return { user, resultado: { tipo: "responder", mensagens: [t.pedirPerfilDeNovo] } };
    }

    const userAtualizado = await prisma.user.update({
      where: { id: user.id },
      data: { tipoEmpresa: tipo, onboarding: "CONCLUIDO" },
    });

    const dica = await pegarDicaParaUsuario(userAtualizado.id, tipo);

    // Cenário A: dispara a confirmação + dica e fica esperando a primeira dúvida.
    if (!userAtualizado.duvidaPendente) {
      return {
        user: userAtualizado,
        resultado: { tipo: "responder", mensagens: [t.confirmacaoA(dica)] },
      };
    }

    // Cenário B: a dúvida original entra agora no pipeline normal.
    const duvidaOriginal = userAtualizado.duvidaPendente;
    await prisma.user.update({
      where: { id: user.id },
      data: { duvidaPendente: null },
    });

    return {
      user: userAtualizado,
      resultado: {
        tipo: "seguir_com_duvida",
        mensagemParaIA: duvidaOriginal,
        mensagensExtras: [t.confirmacaoB(dica)],
      },
    };
  }

  // Fallback: trata como concluído
  return {
    user,
    resultado: { tipo: "seguir_com_duvida", mensagemParaIA: texto },
  };
}

export { OnboardingEstado };
