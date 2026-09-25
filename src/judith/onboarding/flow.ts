import { OnboardingEstado, User } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { env } from "../../config/env.js";
import { pegarDicaParaUsuario } from "./dicaPicker.js";
import { loadBaseRevisadaEm } from "../../knowledge/settings.js";
import { isAceiteTermos, isRecusaTermos, isSaudacao, parseTipoEmpresa } from "./intent.js";

const URL_TERMOS = env.URL_TERMOS ?? `https://${env.JUDITH_DOMAIN}/termos`;

// Resultado de cada turno do onboarding:
// - "responder" → a JUDITH manda essas mensagens e termina o turno
// - "seguir_com_duvida" → onboarding terminou; chama o pipeline normal com `mensagemParaIA`
// - "ignorar" → não responde nada (não deveria ocorrer aqui)
export type OnboardingResult =
  | { tipo: "responder"; mensagens: string[] }
  | { tipo: "seguir_com_duvida"; mensagemParaIA: string; mensagensExtras?: string[] };

const SAUDACAO_BOAS_VINDAS = [
  `Oi! 👋 Eu sou a JUDITH, sua assistente jurídica e executiva.

Estou aqui pra te ajudar com dúvidas do dia a dia do seu negócio — contratos, notificações, obrigações, e muito mais — em linguagem simples, sem juridiquês.

Antes de começar, preciso que você leia e aceite os nossos Termos de Uso e Política de Privacidade: ${URL_TERMOS}

Você leu e aceita os termos? Responde com SIM para continuar. 😊`,
];

const RECEBI_DUVIDA_TERMOS = [
  `Boa pergunta! Já já te respondo.

Mas antes preciso de dois minutinhos: lê nossos Termos de Uso e Política de Privacidade e me confirma: ${URL_TERMOS}

Você leu e aceita? Responde SIM para continuar. 😊`,
];

const PERGUNTAR_PERFIL_CENARIO_A = [
  `Ótimo! Agora me conta: você tem MEI, empresa no Simples (ME ou EPP) ou é autônomo sem CNPJ?

Isso muda bastante a resposta dependendo da situação. 😊`,
];

const PERGUNTAR_PERFIL_CENARIO_B = [
  `Obrigada! Agora me conta: você tem MEI, empresa no Simples (ME ou EPP) ou é autônomo sem CNPJ?

Preciso saber pra te dar a resposta certa. 😊`,
];

const RECUSA_TERMOS = [
  `Tudo bem! Sem problema. Se quiser revisar os termos e voltar quando estiver pronta, é só me chamar de novo: ${URL_TERMOS}

Estarei aqui. 😊`,
];

const PEDIR_PERFIL_DE_NOVO = [
  `Quase! Preciso saber qual dos três: MEI, empresa no Simples (ME ou EPP) ou autônomo sem CNPJ?`,
];

// Primeiro contato: informa a data da última revisão da base (editada no Admin), antes do
// parágrafo dos termos. Sem data informada, a mensagem fica como está.
const PARAGRAFO = "\n\n";
export async function comRevisaoDaBase(mensagens: string[]): Promise<string[]> {
  const data = await loadBaseRevisadaEm();
  if (!data) return mensagens;
  return mensagens.map(m => {
    const paragrafos = m.split(PARAGRAFO);
    const termos = paragrafos.findIndex(p => p.includes(URL_TERMOS));
    if (termos < 1) return m;
    paragrafos.splice(termos, 0, `📚 Base jurídica revisada em ${data}.`);
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
    return {
      user,
      resultado: { tipo: "seguir_com_duvida", mensagemParaIA: texto },
    };
  }

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
      await prisma.user.update({
        where: { id: user.id },
        data: {
          aceitouTermos: true,
          aceitouTermosAt: new Date(),
          onboarding: "AGUARDANDO_PERFIL",
        },
      });
      // Diferencia Cenário A (saudação) e Cenário B (já tinha dúvida)
      const mensagens = user.duvidaPendente
        ? PERGUNTAR_PERFIL_CENARIO_B
        : PERGUNTAR_PERFIL_CENARIO_A;
      return { user, resultado: { tipo: "responder", mensagens } };
    }

    if (isRecusaTermos(texto)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { onboarding: "RECUSADO", duvidaPendente: null },
      });
      return { user, resultado: { tipo: "responder", mensagens: RECUSA_TERMOS } };
    }

    // Primeira mensagem — Cenário A (saudação) ou B (dúvida direta)
    if (novoUsuario) {
      if (isSaudacao(texto)) {
        return { user, resultado: { tipo: "responder", mensagens: await comRevisaoDaBase(SAUDACAO_BOAS_VINDAS) } };
      }
      // Cenário B — guarda a dúvida pra responder depois
      await prisma.user.update({
        where: { id: user.id },
        data: { duvidaPendente: texto },
      });
      return { user, resultado: { tipo: "responder", mensagens: await comRevisaoDaBase(RECEBI_DUVIDA_TERMOS) } };
    }

    // Reenvia o pedido de aceite (qualquer outra mensagem nesse estado)
    return { user, resultado: { tipo: "responder", mensagens: RECEBI_DUVIDA_TERMOS } };
  }

  // --- Estado AGUARDANDO_PERFIL ---
  if (user.onboarding === "AGUARDANDO_PERFIL") {
    const tipo = parseTipoEmpresa(texto);
    if (!tipo) {
      return { user, resultado: { tipo: "responder", mensagens: PEDIR_PERFIL_DE_NOVO } };
    }

    const userAtualizado = await prisma.user.update({
      where: { id: user.id },
      data: { tipoEmpresa: tipo, onboarding: "CONCLUIDO" },
    });

    const dica = await pegarDicaParaUsuario(userAtualizado.id, tipo);

    // Cenário A: dispara a confirmação + dica e fica esperando a primeira dúvida.
    if (!userAtualizado.duvidaPendente) {
      const confirmacao = `Perfeito! Antes de você mandar sua dúvida, uma coisa que vale saber:

${dica}

Pode mandar sua dúvida — estou aqui. 😊 Pode ser texto ou áudio.`;
      return {
        user: userAtualizado,
        resultado: { tipo: "responder", mensagens: [confirmacao] },
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
        mensagensExtras: [`Entendido! Aqui vai uma coisa que vale saber primeiro:\n\n${dica}\n\nAgora, sobre sua pergunta:`],
      },
    };
  }

  // Fallback: trata como concluído
  return {
    user,
    resultado: { tipo: "seguir_com_duvida", mensagemParaIA: texto },
  };
}
