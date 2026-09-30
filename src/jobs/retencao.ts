// Retenção automática (política de privacidade §6):
//  - exclusão pedida pelo usuário: apaga em até 30 dias;
//  - conta cancelada: 30 dias depois do fim do acesso, sem uso no período, apaga;
//  - arquivo segregado (aceite, conversas, pagamentos): 5 anos;
//  - registros de acesso ao conteúdo pelo painel: 6 meses (art. 15 do Marco Civil).

import { prisma } from "../db/client.js";
import { excluirUsuario } from "../retencao/exclusao.js";

export const DIAS_APOS_PEDIDO = 30;
export const DIAS_APOS_CANCELAMENTO = 30;
export const MESES_LOG_ACESSO = 6;

export type ResultadoRetencao = { excluidosPorPedido: number; excluidosPorCancelamento: number; arquivosExpirados: number; acessosExpirados: number };

export async function executarRetencao(agora = new Date()): Promise<ResultadoRetencao> {
  const r: ResultadoRetencao = { excluidosPorPedido: 0, excluidosPorCancelamento: 0, arquivosExpirados: 0, acessosExpirados: 0 };
  const dias = (n: number) => new Date(agora.getTime() - n * 24 * 60 * 60 * 1000);

  const pedidos = await prisma.user.findMany({ where: { exclusaoSolicitadaEm: { lte: dias(DIAS_APOS_PEDIDO) } }, select: { id: true } });
  for (const u of pedidos) {
    if (await excluirUsuario({ userId: u.id, motivo: `pedido do titular há mais de ${DIAS_APOS_PEDIDO} dias`, origem: "retencao" })) r.excluidosPorPedido++;
  }

  // Cancelados: a assinatura mais recente está CANCELED, o acesso acabou há 30+ dias e não houve mensagem nesse período.
  const canceladas = await prisma.subscription.findMany({
    where: { status: "CANCELED", OR: [{ currentPeriodEnd: { lte: dias(DIAS_APOS_CANCELAMENTO) } }, { currentPeriodEnd: null, canceledAt: { lte: dias(DIAS_APOS_CANCELAMENTO) } }] },
    select: { id: true, userId: true, createdAt: true },
  });
  for (const sub of canceladas) {
    const maisNova = await prisma.subscription.findFirst({ where: { userId: sub.userId, createdAt: { gt: sub.createdAt } } });
    if (maisNova) continue;
    const atividade = await prisma.session.findFirst({ where: { userId: sub.userId, lastSeenAt: { gte: dias(DIAS_APOS_CANCELAMENTO) } }, select: { id: true } });
    if (atividade) continue;
    if (await excluirUsuario({ userId: sub.userId, motivo: `conta cancelada há mais de ${DIAS_APOS_CANCELAMENTO} dias, sem uso`, origem: "retencao" })) r.excluidosPorCancelamento++;
  }

  r.arquivosExpirados = (await prisma.arquivoRetencao.deleteMany({ where: { expiraEm: { lte: agora } } })).count;
  const limiteAcessos = new Date(agora); limiteAcessos.setMonth(limiteAcessos.getMonth() - MESES_LOG_ACESSO);
  r.acessosExpirados = (await prisma.conversaAcesso.deleteMany({ where: { createdAt: { lte: limiteAcessos } } })).count;
  return r;
}
