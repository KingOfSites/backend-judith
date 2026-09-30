// Cancelamento pelo WhatsApp ("quero cancelar"): confirma antes, mostra o uso do mês, cancela
// no banco e no Mercado Pago (via site, que tem a credencial), avisa o painel. Dentro dos 7
// dias da compra (art. 49 do CDC) abre alerta de ESTORNO para o fundador fazer no gateway.
// Também trata o pedido de exclusão de dados (LGPD): marca a data e o job de retenção apaga
// em até 30 dias.

import axios from "axios";
import { Subscription, User } from "@prisma/client";
import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { sendText } from "../evolution/client.js";

export const CONFIRMACAO_VALIDA_MIN = 15;
export const DIAS_ARREPENDIMENTO = 7;

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[!?.,;:]/g, " ").replace(/\s+/g, " ").trim();

// Só o cancelamento DA JUDITH. "Como cancelo um contrato com fornecedor?" é dúvida jurídica.
export function isPedidoCancelamento(texto: string): boolean {
  const n = normalizar(texto);
  if (n.length > 160) return false;
  if (!/\b(cancel(ar|a|o|amento)|encerr(ar|a|o)|desassin(ar|o)|parar de pagar|nao quero mais (pagar|assinar|o servico|a judith))\b/.test(n)) return false;
  if (/\b(contrato|cliente|fornecedor|compra|pedido|venda|nota|funcionario|aluguel|locacao|multa|cnpj|mei|plano de saude|seguro|cartao de credito|conta de luz|internet|telefone|academia|curso)\b/.test(n) && !/\bjudith\b/.test(n)) return false;
  const alvo = /\b(assinatura|plano|minha conta|judith|mensalidade|cobranca|servico|renovacao)\b/.test(n);
  const curto = n.split(" ").length <= 4;
  return alvo || curto;
}

export function isPedidoExclusaoDados(texto: string): boolean {
  const n = normalizar(texto);
  if (n.length > 200) return false;
  return /\b(exclu|apag|delet|remov|elimin)\w*/.test(n)
    && /\b(meus dados|minhas informacoes|minha conta|meu cadastro|meu historico|minhas conversas|meu numero|tudo que voces tem)\b/.test(n);
}

export function isDesistenciaExclusao(texto: string): boolean {
  const n = normalizar(texto);
  return /\b(manter|mantenha|nao (apague|apaguem|exclua|excluam|delete)|desisto da exclusao)\b/.test(n) && /\b(dados|conta|exclusao|cadastro)\b/.test(n);
}

export function isConfirmacao(texto: string): boolean {
  const n = normalizar(texto);
  return /^(sim|s|confirmo|confirmar|pode cancelar|cancela|cancelar|quero cancelar|isso|ok|pode|pode sim|sim pode|sim quero|quero)( sim)?$/.test(n);
}

export function isNegativa(texto: string): boolean {
  const n = normalizar(texto);
  return /^(nao|n|nao quero|deixa|deixa pra la|esquece|manter|quero manter|nao cancela|nao cancelar|mudei de ideia|desisto)$/.test(n);
}

export function confirmacaoPendente(user: User, agora = new Date()): boolean {
  return Boolean(user.cancelamentoPendenteEm && agora.getTime() - user.cancelamentoPendenteEm.getTime() < CONFIRMACAO_VALIDA_MIN * 60_000);
}

const dataBr = (d: Date | null | undefined) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null);

async function assinaturaAtual(userId: string): Promise<Subscription | null> {
  return prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
}

function cancelavel(sub: Subscription | null): sub is Subscription {
  return Boolean(sub && ["ACTIVE", "PAST_DUE", "PENDING", "TRIALING"].includes(sub.status));
}

async function usoDoMes(userId: string): Promise<string> {
  const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const grupos = await prisma.usageEvent.groupBy({ by: ["kind"], where: { userId, createdAt: { gte: inicio } }, _count: { _all: true } });
  const n = (k: string) => grupos.find(g => g.kind === k)?._count._all ?? 0;
  return [
    `${n("DUVIDA")} dúvida${n("DUVIDA") === 1 ? "" : "s"}`,
    `${n("ANALISE")} análise${n("ANALISE") === 1 ? "" : "s"}`,
    `${n("REDACAO")} redaç${n("REDACAO") === 1 ? "ão" : "ões"}`,
  ].join(", ");
}

// Último pagamento aprovado da assinatura dentro do prazo de arrependimento.
async function pagamentoEstornavel(sub: Subscription) {
  const limite = new Date(Date.now() - DIAS_ARREPENDIMENTO * 24 * 60 * 60 * 1000);
  return prisma.payment.findFirst({ where: { subscriptionId: sub.id, status: "APPROVED", paidAt: { gte: limite } }, orderBy: { paidAt: "desc" } });
}

// Primeiro passo: mostra o uso e pede confirmação.
export async function iniciarCancelamento(user: User): Promise<string> {
  const sub = await assinaturaAtual(user.id);
  if (!cancelavel(sub)) {
    if (user.plano === "TRIAL" && user.trialFimEm && user.trialFimEm > new Date()) {
      return `Você está no período de teste, que termina sozinho em ${dataBr(user.trialFimEm)}, sem nenhuma cobrança. Não precisa cancelar nada. 🙂 Se quiser que eu apague seus dados, é só dizer "quero excluir meus dados".`;
    }
    return `Não encontrei uma assinatura ativa no seu número, então não há nada pra cancelar nem cobrança pendente. 🙂 Se quiser que eu apague seus dados, é só dizer "quero excluir meus dados".`;
  }
  await prisma.user.update({ where: { id: user.id }, data: { cancelamentoPendenteEm: new Date() } });
  const uso = await usoDoMes(user.id);
  const estorno = await pagamentoEstornavel(sub);
  const fim = dataBr(sub.currentPeriodEnd);
  return [
    `Entendi que você quer cancelar sua assinatura (plano ${sub.plano}).`,
    `Só pra você ter o quadro: neste mês você já usou ${uso}.`,
    estorno
      ? `Como o pagamento foi feito há menos de ${DIAS_ARREPENDIMENTO} dias, o valor é devolvido integralmente (art. 49 do CDC) e o acesso encerra na hora.`
      : fim
        ? `Se cancelar agora, você continua com acesso até ${fim} e não tem nenhuma cobrança nova.`
        : `Se cancelar agora, não tem nenhuma cobrança nova.`,
    `Confirma o cancelamento? Responde *SIM* pra cancelar ou *NÃO* pra manter.`,
  ].join("\n\n");
}

export type ResultadoCancelamento = { mensagem: string; estorno: boolean; subscriptionId: string };

// Cancela de fato: banco, Mercado Pago (pelo site) e alerta no painel.
export async function cancelarAssinatura(
  sub: Subscription,
  opts: { motivo: string; origem: "whatsapp" | "admin" | "gateway"; executadoPor?: string | null; user: Pick<User, "id" | "nome" | "whatsappNumber"> }
): Promise<ResultadoCancelamento> {
  const estorno = await pagamentoEstornavel(sub);
  const agora = new Date();
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "CANCELED", canceledAt: agora, cancelMotivo: opts.motivo, cancelOrigem: opts.origem,
      // Com estorno o acesso encerra na hora; sem estorno vale até o fim do período pago.
      ...(estorno ? { currentPeriodEnd: agora } : {}),
    },
  });
  await prisma.user.update({ where: { id: opts.user.id }, data: { cancelamentoPendenteEm: null } });

  let gateway = "sem assinatura recorrente no gateway";
  if (sub.mpSubscriptionId) {
    try {
      await axios.post(`${env.WEB_JUDITH_URL}/api/assinatura/cancelar`, { subscriptionId: sub.id }, { headers: { "x-internal-key": env.INTERNAL_API_KEY }, timeout: 15_000 });
      gateway = "recorrência cancelada no Mercado Pago";
    } catch {
      gateway = "FALHA ao cancelar a recorrência no Mercado Pago: cancelar manualmente";
    }
  }

  const quem = opts.user.nome ?? `final ${opts.user.whatsappNumber.slice(-4)}`;
  const valor = estorno ? `R$ ${(estorno.valorCentavos / 100).toFixed(2).replace(".", ",")}` : "";
  await prisma.adminAlert.create({
    data: {
      kind: estorno ? "ESTORNO" : "CANCELAMENTO",
      titulo: estorno ? `Estorno a fazer: ${quem}` : `Cancelou a assinatura: ${quem}`,
      detalhe: [
        `Plano ${sub.plano}, origem ${opts.origem}${opts.executadoPor ? ` (${opts.executadoPor})` : ""}. Motivo: ${opts.motivo}.`,
        `${gateway}.`,
        estorno
          ? `Pagamento ${estorno.mpPaymentId ?? estorno.id} de ${valor} aprovado em ${dataBr(estorno.paidAt)}: dentro dos ${DIAS_ARREPENDIMENTO} dias, estornar no Mercado Pago (botão em Alertas).`
          : `Acesso até ${dataBr(sub.currentPeriodEnd) ?? "hoje"}.`,
      ].join(" "),
      userId: opts.user.id,
      paymentId: estorno?.id ?? null,
    },
  });
  if (env.ALERTA_WHATSAPP && opts.origem === "whatsapp") {
    try { await sendText(env.ALERTA_WHATSAPP, `🔔 JUDITH: ${quem} cancelou a assinatura (${sub.plano}).${estorno ? " Está dentro dos 7 dias: tem estorno pra fazer." : ""} Veja em Alertas no painel.`); }
    catch { /* o alerta no painel já foi gravado */ }
  }

  const mensagem = estorno
    ? `Pronto, sua assinatura foi cancelada. Como estava dentro dos ${DIAS_ARREPENDIMENTO} dias, o valor pago será devolvido no mesmo meio de pagamento em até 7 dias úteis. Se mudar de ideia, é só me chamar. 💚`
    : `Pronto, sua assinatura foi cancelada. Você continua com acesso até ${dataBr(sub.currentPeriodEnd) ?? "o fim do período já pago"} e não terá nenhuma cobrança nova. Se mudar de ideia, é só me chamar. 💚`;
  return { mensagem, estorno: Boolean(estorno), subscriptionId: sub.id };
}

export async function confirmarCancelamento(user: User): Promise<string> {
  const sub = await assinaturaAtual(user.id);
  if (!cancelavel(sub)) {
    await prisma.user.update({ where: { id: user.id }, data: { cancelamentoPendenteEm: null } });
    return "Sua assinatura já não está ativa, então não há nada pra cancelar. 🙂";
  }
  return (await cancelarAssinatura(sub, { motivo: "pedido pelo WhatsApp", origem: "whatsapp", user })).mensagem;
}

export async function desistirCancelamento(user: User): Promise<string> {
  await prisma.user.update({ where: { id: user.id }, data: { cancelamentoPendenteEm: null } });
  return "Combinado, sua assinatura continua ativa como está. Qualquer coisa, é só me chamar. 😊";
}

export async function limparConfirmacao(user: User): Promise<void> {
  await prisma.user.update({ where: { id: user.id }, data: { cancelamentoPendenteEm: null } });
}

// LGPD: pedido de exclusão. O job de retenção apaga em até 30 dias (prazo da política, §6).
export async function pedirExclusaoDados(user: User): Promise<string> {
  if (!user.exclusaoSolicitadaEm) {
    await prisma.user.update({ where: { id: user.id }, data: { exclusaoSolicitadaEm: new Date() } });
    await prisma.adminAlert.create({
      data: {
        kind: "EXCLUSAO_DADOS",
        titulo: `Pediu exclusão dos dados: ${user.nome ?? `final ${user.whatsappNumber.slice(-4)}`}`,
        detalhe: "Será apagado automaticamente em 30 dias pela rotina de retenção; para apagar agora, use o botão em Usuários.",
        userId: user.id,
      },
    });
  }
  return `Registrei seu pedido de exclusão. Seus dados (conversas, perfil e cadastro) serão apagados em até 30 dias, como diz nossa Política de Privacidade. O registro do aceite dos termos e os comprovantes de pagamento ficam guardados por 5 anos em ambiente separado, por obrigação legal. Se mudar de ideia antes disso, é só me dizer "quero manter meus dados".`;
}

export async function desistirExclusaoDados(user: User): Promise<string> {
  await prisma.user.update({ where: { id: user.id }, data: { exclusaoSolicitadaEm: null } });
  return "Combinado, seus dados ficam como estão e nada será apagado. 😊";
}
