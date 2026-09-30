// Exclusão de usuário (LGPD, política §6): o que fica por 5 anos vai para o ambiente segregado
// (ArquivoRetencao: aceite, log das conversas e pagamentos); todo o resto é apagado com o
// usuário (sessões, mensagens, lembretes, uso, assinaturas, créditos). Sai um comprovante
// (ExclusaoCertificado) com o que foi apagado, quando, por quem e por quê.

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/client.js";

export const RETENCAO_ARQUIVO_ANOS = 5;

export const hashWhatsapp = (numero: string) => createHash("sha256").update(numero).digest("hex");

export type ExclusaoInput = { userId: string; motivo: string; origem: "usuario" | "admin" | "retencao"; executadoPor?: string | null };

export async function excluirUsuario(input: ExclusaoInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: {
      sessions: { include: { messages: { orderBy: { createdAt: "asc" } } }, orderBy: { startedAt: "asc" } },
      subscriptions: { include: { payments: true } },
      avulsoCompras: true,
      reminders: true,
      usage: true,
      creditosCortesia: true,
    },
  });
  if (!user) return null;

  const mensagens = user.sessions.flatMap(s => s.messages);
  const aceite = {
    whatsappHash: hashWhatsapp(user.whatsappNumber), nome: user.nome, tipoEmpresa: user.tipoEmpresa, plano: user.plano,
    aceitouTermos: user.aceitouTermos, aceitouTermosAt: user.aceitouTermosAt, termosVersao: user.termosVersao,
    cadastroEm: user.createdAt, exclusaoSolicitadaEm: user.exclusaoSolicitadaEm,
  };
  const conversas = user.sessions.map(s => ({
    id: s.id, inicio: s.startedAt, fim: s.lastSeenAt,
    mensagens: s.messages.map(m => ({ role: m.role, content: m.content, createdAt: m.createdAt, meta: m.meta ?? undefined })),
  }));
  const pagamentos = {
    assinaturas: user.subscriptions.map(s => ({ id: s.id, plano: s.plano, status: s.status, metodo: s.paymentMethod, inicio: s.currentPeriodStart, fim: s.currentPeriodEnd, canceladaEm: s.canceledAt, mpSubscriptionId: s.mpSubscriptionId,
      pagamentos: s.payments.map(p => ({ id: p.id, valorCentavos: p.valorCentavos, status: p.status, metodo: p.metodo, mpPaymentId: p.mpPaymentId, pagoEm: p.paidAt, criadoEm: p.createdAt })) })),
    avulsos: user.avulsoCompras.map(a => ({ id: a.id, servico: a.servico, valorCentavos: a.precoCentavos, status: a.status, metodo: a.metodo, mpPaymentId: a.mpPaymentId, pagoEm: a.paidAt, consumidoEm: a.consumidoEm })),
  };
  const contagens = {
    sessoes: user.sessions.length, mensagens: mensagens.length, lembretes: user.reminders.length, usos: user.usage.length,
    assinaturas: user.subscriptions.length, pagamentos: user.subscriptions.reduce((n, s) => n + s.payments.length, 0), avulsos: user.avulsoCompras.length, creditosCortesia: user.creditosCortesia.length,
  };
  const expiraEm = new Date(); expiraEm.setFullYear(expiraEm.getFullYear() + RETENCAO_ARQUIVO_ANOS);
  const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

  return prisma.$transaction(async db => {
    const arquivo = await db.arquivoRetencao.create({ data: { whatsappHash: aceite.whatsappHash, aceite: json(aceite), conversas: json(conversas), pagamentos: json(pagamentos), expiraEm } });
    // Rastros de busca e reações são chaveados pela mensagem/usuário e não têm FK: apaga à mão.
    if (mensagens.length) await db.knowledgeInteraction.deleteMany({ where: { id: { in: mensagens.map(m => m.id) } } });
    await db.knowledgeFeedback.deleteMany({ where: { userId: user.id } });
    await db.lembreteEnvio.deleteMany({ where: { userId: user.id } });
    await db.adminAlert.updateMany({ where: { userId: user.id, status: "OPEN" }, data: { status: "RESOLVED", resolvedAt: new Date() } });
    await db.user.delete({ where: { id: user.id } });
    const certificado = await db.exclusaoCertificado.create({
      data: {
        whatsappHash: aceite.whatsappHash, whatsappFinal: user.whatsappNumber.slice(-4), nome: user.nome,
        motivo: input.motivo, origem: input.origem, executadoPor: input.executadoPor ?? null, solicitadoEm: user.exclusaoSolicitadaEm,
        contagens: json(contagens), arquivoId: arquivo.id,
      },
    });
    return certificado;
  }, { timeout: 60_000 });
}
