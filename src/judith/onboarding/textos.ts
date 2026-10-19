// Textos do onboarding editáveis no Admin (tabela OnboardingTexto). Sem linha salva, vale o
// texto reserva daqui. Marcadores: {termos} (link dos termos), {dica} (dica do perfil),
// {reacao} (instrução do 👍/👎), {planos} (link dos planos), {data} (data do fim do trial),
// {avulso} (link de pagamento avulso), {servico} (nome do serviço), {nome} (primeiro nome).
// Cache de 60s, como o prompt e as regras: o que o fundador salva vale em até 1 minuto.

import { prisma } from "../../db/client.js";

export const CHAVES_ONBOARDING = [
  "boasVindas", "recebiDuvida", "perfilA", "perfilB", "recusa", "pedirPerfilDeNovo",
  "perguntaFuncionarios", "pedirFuncionariosDeNovo",
  "confirmacaoA", "confirmacaoB", "dicaReacao", "retornoD1", "trialD3", "revisaoBase",
  "saudacaoRetorno", "avulsoSemPlano", "trialEncerrado", "entregaDocumento", "assinaturaAtiva",
] as const;
export type ChaveOnboarding = (typeof CHAVES_ONBOARDING)[number];

export const TEXTOS_RESERVA: Record<ChaveOnboarding, string> = {
  boasVindas: `Oi! 👋 Eu sou a JUDITH, sua assistente jurídica e executiva.

Estou aqui pra te ajudar com dúvidas do dia a dia do seu negócio — contratos, notificações, obrigações, e muito mais — em linguagem simples, sem juridiquês.

Antes de começar, preciso que você leia e aceite os nossos Termos de Uso e Política de Privacidade: {termos}

Você leu e aceita os termos? Responde com SIM para continuar. 😊`,
  recebiDuvida: `Boa pergunta! Já já te respondo.

Mas antes preciso de dois minutinhos: lê nossos Termos de Uso e Política de Privacidade e me confirma: {termos}

Você leu e aceita? Responde SIM para continuar. 😊`,
  perfilA: `Ótimo! Agora me conta: você tem MEI, empresa no Simples (ME ou EPP) ou é autônomo sem CNPJ?

Isso muda bastante a resposta dependendo da situação. 😊`,
  perfilB: `Obrigada! Agora me conta: você tem MEI, empresa no Simples (ME ou EPP) ou é autônomo sem CNPJ?

Preciso saber pra te dar a resposta certa. 😊`,
  recusa: `Tudo bem! Sem problema. Se quiser revisar os termos e voltar quando estiver pronta, é só me chamar de novo: {termos}

Estarei aqui. 😊`,
  pedirPerfilDeNovo: `Quase! Preciso saber qual dos três: MEI, empresa no Simples (ME ou EPP) ou autônomo sem CNPJ?`,
  perguntaFuncionarios: `Só mais uma: você tem funcionário registrado (CLT)? Responde SIM ou NÃO.

Assim eu só te lembro dos prazos de salário, FGTS e 13º se isso fizer parte da sua rotina. 😊`,
  pedirFuncionariosDeNovo: `Não entendi. Você tem funcionário registrado? Responde SIM ou NÃO, por favor.`,
  confirmacaoA: `Perfeito! Antes de você mandar sua dúvida, uma coisa que vale saber:

{dica}

Pode mandar sua dúvida — estou aqui. 😊 Pode ser texto ou áudio.

{reacao}`,
  confirmacaoB: `Entendido! Aqui vai uma coisa que vale saber primeiro:

{dica}

{reacao}

Agora, sobre sua pergunta:`,
  dicaReacao: `Depois de cada resposta, reaja com 👍 ou 👎 pra me dizer se ajudou. Isso me ajuda a melhorar.`,
  retornoD1: `Oi! 👋 Passando pra lembrar que estou por aqui. Se tiver qualquer dúvida do dia a dia do seu negócio — um contrato, uma cobrança, um funcionário, uma obrigação — é só me mandar por texto ou áudio. 😊`,
  trialD3: `Oi! Seu período de teste da JUDITH termina em 3 dias ({data}). Pra continuar com acesso sem interrupção, é só escolher um plano aqui: {planos}

Se tiver qualquer dúvida sobre os planos, me pergunta. 😊`,
  revisaoBase: `📚 Base jurídica revisada em {revisao}.`,
  saudacaoRetorno: `Oi{nome}! 👋 Que bom te ver de novo. Pode mandar sua dúvida por texto ou áudio, ou me pedir um documento. 😊

Minhas respostas são preparadas com auxílio de inteligência artificial, a partir da base jurídica da JUDITH.`,
  avulsoSemPlano: `Você ainda não tem um plano ativo, mas dá pra usar a JUDITH de duas formas:

1) Assinar um plano, com dúvidas, análises e redações todo mês: {planos}

2) Pagar só este atendimento, avulso, sem assinatura. Pra {servico} é só pagar por este link e me mandar a mensagem em seguida: {avulso}

As respostas são preparadas com auxílio de inteligência artificial e servem como orientação inicial. 😊`,
  trialEncerrado: `Seu período de teste da JUDITH terminou. 😊

Pra continuar, é só escolher um plano aqui: {planos}

Se preferir, pode pagar só este atendimento avulso ({servico}) por este link: {avulso}`,
  entregaDocumento: `Pronto, seu documento está aqui! Ele foi preparado com auxílio de inteligência artificial, a partir do que você me contou, para você usar. Confere tudo com calma antes de assinar ou enviar — e, se o valor for superior a 20 salários mínimos ou o risco for alto, vale passar por um advogado antes.`,
  assinaturaAtiva: `Pronto{nome}! Sua assinatura do plano {plano} está ativa. 🎉
Pode mandar sua dúvida por texto ou áudio, ou me pedir um documento. Para ver o que ainda tem no mês, é só escrever “minha cota”.`,
};

export const DESCRICAO_TEXTO: Record<ChaveOnboarding, string> = {
  boasVindas: "Boas-vindas: primeira mensagem quando a pessoa chega com um oi (Cenário A). Precisa conter {termos}.",
  recebiDuvida: "Aceite: quando a pessoa já chega com uma dúvida (Cenário B), e também quando insiste sem responder SIM. Precisa conter {termos}.",
  perfilA: "Pergunta de perfil depois do SIM, no Cenário A.",
  perfilB: "Pergunta de perfil depois do SIM, no Cenário B (dúvida guardada).",
  recusa: "Resposta a quem recusa os termos.",
  pedirPerfilDeNovo: "Quando a resposta de perfil não foi entendida.",
  perguntaFuncionarios: "Depois do perfil: pergunta se tem funcionário registrado (SIM/NÃO). Define quem recebe lembretes de salário, FGTS e 13º.",
  pedirFuncionariosDeNovo: "Quando a resposta sobre funcionário não foi SIM nem NÃO.",
  confirmacaoA: "Depois do perfil, no Cenário A: confirmação com a dica ({dica}) e a instrução de reação ({reacao}).",
  confirmacaoB: "Depois do perfil, no Cenário B: introdução antes de responder a dúvida guardada. Usa {dica} e {reacao}.",
  dicaReacao: "Instrução do 👍/👎, injetada onde houver {reacao}.",
  retornoD1: "Retorno D+1: enviada um dia depois do aceite a quem ainda não mandou nenhuma dúvida.",
  trialD3: "Aviso 3 dias antes do fim do trial. Usa {data} e {planos}.",
  revisaoBase: "Linha da data de revisão da base (Ajustes da base), inserida antes do parágrafo dos termos. Usa {revisao}.",
  saudacaoRetorno: "Saudação de quem já tem cadastro e manda só um oi. Pode usar {nome}.",
  avulsoSemPlano: "Resposta a quem não tem plano ativo e manda uma dúvida ou pede pra comprar avulso. Usa {planos}, {avulso} (link de pagamento) e {servico}.",
  trialEncerrado: "Resposta a quem mandou uma dúvida depois que o trial terminou. Usa {planos}, {avulso} e {servico}.",
  entregaDocumento: "Mensagem de entrega do documento redigido: legenda do PDF ou mensagem depois do texto. É ela que avisa do uso de IA e quando passar por um advogado.",
  assinaturaAtiva: "Enviada pelo site no WhatsApp quando o Mercado Pago confirma a assinatura de um plano. Usa {nome} e {plano}.",
};

const TTL_MS = 60_000;
let cache: { textos: Record<ChaveOnboarding, string>; expiraEm: number } | null = null;

export async function carregarTextosOnboarding(): Promise<Record<ChaveOnboarding, string>> {
  if (cache && Date.now() < cache.expiraEm) return cache.textos;
  const textos = { ...TEXTOS_RESERVA };
  try {
    const linhas = await prisma.onboardingTexto.findMany();
    for (const l of linhas) {
      if ((CHAVES_ONBOARDING as readonly string[]).includes(l.chave) && l.valor.trim()) textos[l.chave as ChaveOnboarding] = l.valor;
    }
  } catch {
    // Tabela ausente ou banco instável: o onboarding não pode parar por causa de texto editável.
  }
  cache = { textos, expiraEm: Date.now() + TTL_MS };
  return textos;
}

export function limparCacheTextos(): void {
  cache = null;
}

export function preencher(texto: string, vars: Record<string, string | null | undefined>): string {
  return texto.replace(/\{(\w+)\}/g, (m, chave: string) => (vars[chave] == null ? m : String(vars[chave])));
}

// "{nome}" vira ", Maria" (primeiro nome) ou nada: "Oi{nome}!" fica "Oi, Maria!" ou "Oi!".
export function nomeParaSaudacao(nome: string | null | undefined): string {
  const primeiro = (nome ?? "").trim().split(/\s+/)[0] ?? "";
  return primeiro && /^[\p{L}'-]{2,}$/u.test(primeiro) ? `, ${primeiro}` : "";
}
