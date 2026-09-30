// Avisos automáticos pelo WhatsApp, em horário comercial de Brasília:
//  - trial D-3: três dias antes do fim do período de teste, com o link dos planos;
//  - retorno D+1: um dia depois do aceite, para quem ainda não mandou nenhuma dúvida.
// Textos editáveis no Admin (Onboarding). Sem modelo, sem cota.

import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { sendText } from "../evolution/client.js";
import { carregarTextosOnboarding, preencher } from "../judith/onboarding/textos.js";
import { dataLocal, horaLocal, instanteLocal, somarDias } from "./lembretes.js";

export type ResultadoAvisos = { trialD3: number; retornoD1: number; falhas: number };

export async function enviarAvisos(agora = new Date(), enviar: (numero: string, texto: string) => Promise<unknown> = sendText): Promise<ResultadoAvisos> {
  const r: ResultadoAvisos = { trialD3: 0, retornoD1: 0, falhas: 0 };
  const hora = horaLocal(agora);
  if (hora < 8 || hora >= 20) return r;
  const textos = await carregarTextosOnboarding();
  const planos = `${env.WEB_JUDITH_URL}/planos`;
  const hoje = dataLocal(agora);

  // Trial que termina daqui a 3 dias (data de Brasília), sem assinatura paga e sem aviso enviado.
  const alvo = somarDias(hoje, 3);
  const trials = await prisma.user.findMany({
    where: {
      plano: "TRIAL", trialAvisoD3Em: null, exclusaoSolicitadaEm: null, onboarding: "CONCLUIDO",
      trialFimEm: { gte: instanteLocal(alvo), lt: instanteLocal(somarDias(alvo, 1)) },
      subscriptions: { none: { status: { in: ["ACTIVE", "PAST_DUE", "PENDING"] } } },
    },
  });
  for (const u of trials) {
    const data = u.trialFimEm!.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    try {
      await enviar(u.whatsappNumber, preencher(textos.trialD3, { data, planos, nome: u.nome }));
      await prisma.user.update({ where: { id: u.id }, data: { trialAvisoD3Em: agora } });
      r.trialD3++;
    } catch { r.falhas++; }
  }

  // Retorno D+1: aceitou entre 24h e 72h atrás e nunca mandou uma mensagem depois do onboarding.
  const candidatos = await prisma.user.findMany({
    where: {
      retornoD1Em: null, exclusaoSolicitadaEm: null, onboarding: "CONCLUIDO",
      aceitouTermosAt: { lte: new Date(agora.getTime() - 24 * 3_600_000), gte: new Date(agora.getTime() - 72 * 3_600_000) },
    },
  });
  for (const u of candidatos) {
    const falou = await prisma.message.findFirst({ where: { role: "USER", session: { userId: u.id } }, select: { id: true } });
    if (falou) { await prisma.user.update({ where: { id: u.id }, data: { retornoD1Em: agora } }); continue; }
    try {
      await enviar(u.whatsappNumber, preencher(textos.retornoD1, { nome: u.nome, planos }));
      await prisma.user.update({ where: { id: u.id }, data: { retornoD1Em: agora } });
      r.retornoD1++;
    } catch { r.falhas++; }
  }
  return r;
}
