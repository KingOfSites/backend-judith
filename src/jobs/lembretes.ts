// Lembretes (spec §3.4): três disparos por obrigação, D-3, D-1 e no dia.
//
//  - Calendário global (ObrigacaoCalendario, editado no Admin): DAS do MEI todo dia 20,
//    DASN-SIMEI em 31/05 etc. Cada ocorrência vira um Reminder por usuário do perfil, com
//    acesso ativo, e é enviada em D-3, D-1 e no dia. LembreteEnvio impede repetição.
//  - Lembretes manuais (Reminder sem obrigacaoId), criados pelo painel ou pela conversa.
//
// Horário de envio: entre 8h e 20h de Brasília. Sem modelo, sem cota.

import { Prisma, TipoEmpresa } from "@prisma/client";
import { prisma } from "../db/client.js";
import { sendText } from "../evolution/client.js";
import { temAcessoAtivo } from "../judith/quota.js";

export const FUSO = "America/Sao_Paulo";

export type DataLocal = { ano: number; mes: number; dia: number };

export function dataLocal(instante = new Date()): DataLocal {
  const [ano, mes, dia] = instante.toLocaleDateString("en-CA", { timeZone: FUSO }).split("-").map(Number) as [number, number, number];
  return { ano, mes, dia };
}

export function horaLocal(instante = new Date()): number {
  return Number(instante.toLocaleTimeString("en-GB", { timeZone: FUSO, hour: "2-digit", hour12: false }).slice(0, 2));
}

export const chaveData = (d: DataLocal) => `${d.ano}-${String(d.mes).padStart(2, "0")}-${String(d.dia).padStart(2, "0")}`;

// Meia-noite de Brasília daquela data, em UTC (Brasília fica em UTC-3 o ano inteiro).
export function instanteLocal(d: DataLocal): Date {
  return new Date(Date.UTC(d.ano, d.mes - 1, d.dia, 3, 0, 0));
}

export function somarDias(d: DataLocal, n: number): DataLocal {
  const base = new Date(Date.UTC(d.ano, d.mes - 1, d.dia + n));
  return { ano: base.getUTCFullYear(), mes: base.getUTCMonth() + 1, dia: base.getUTCDate() };
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

// Próximas ocorrências de uma obrigação entre hoje e hoje+3 (o horizonte do D-3).
export function ocorrencias(obrigacao: { dia: number; mes: number | null }, hoje: DataLocal): DataLocal[] {
  const candidatas: DataLocal[] = [];
  for (let desloc = -1; desloc <= 13; desloc++) {
    const ano = hoje.ano + Math.floor((hoje.mes - 1 + desloc) / 12);
    const mes = ((hoje.mes - 1 + desloc) % 12 + 12) % 12 + 1;
    if (obrigacao.mes !== null && obrigacao.mes !== mes) continue;
    const dia = Math.min(obrigacao.dia, ultimoDiaDoMes(ano, mes));
    candidatas.push({ ano, mes, dia });
  }
  const min = chaveData(hoje);
  const max = chaveData(somarDias(hoje, 3));
  return candidatas.filter(c => chaveData(c) >= min && chaveData(c) <= max);
}

export type Etapa = "D3" | "D1" | "DIA";

export function etapaDe(alvo: DataLocal, hoje: DataLocal): Etapa | null {
  const diff = Math.round((instanteLocal(alvo).getTime() - instanteLocal(hoje).getTime()) / 86_400_000);
  return diff === 3 ? "D3" : diff === 1 ? "D1" : diff === 0 ? "DIA" : null;
}

const QUANDO: Record<Etapa, string> = { D3: "vence em 3 dias", D1: "vence amanhã", DIA: "vence hoje" };

export function textoLembrete(titulo: string, descricao: string | null, alvo: DataLocal, etapa: Etapa): string {
  const data = `${String(alvo.dia).padStart(2, "0")}/${String(alvo.mes).padStart(2, "0")}`;
  return `📅 *Lembrete:* ${titulo} ${QUANDO[etapa]} (${data}).${descricao?.trim() ? `\n\n${descricao.trim()}` : ""}`;
}

function perfisDe(valor: Prisma.JsonValue): TipoEmpresa[] {
  const todos: TipoEmpresa[] = ["MEI", "ME", "EPP", "AUTONOMO"];
  return Array.isArray(valor) ? (valor.filter((v): v is TipoEmpresa => typeof v === "string" && (todos as string[]).includes(v))) : [];
}

export type ResultadoLembretes = { enviados: number; falhas: number; criados: number };

export async function enviarLembretes(agora = new Date(), enviar: (numero: string, texto: string) => Promise<unknown> = sendText): Promise<ResultadoLembretes> {
  const r: ResultadoLembretes = { enviados: 0, falhas: 0, criados: 0 };
  const hoje = dataLocal(agora);

  // 1. Calendário global → Reminder por usuário (idempotente pela chave obrigacao+data+usuário).
  const obrigacoes = await prisma.obrigacaoCalendario.findMany({ where: { ativo: true } });
  if (obrigacoes.length) {
    const usuarios = await prisma.user.findMany({ where: { onboarding: "CONCLUIDO", tipoEmpresa: { not: null }, exclusaoSolicitadaEm: null } });
    for (const ob of obrigacoes) {
      const perfis = perfisDe(ob.perfis);
      const alvos = ocorrencias(ob, hoje);
      if (!alvos.length) continue;
      for (const u of usuarios) {
        if (!u.tipoEmpresa || !perfis.includes(u.tipoEmpresa)) continue;
        for (const alvo of alvos) {
          const chave = `cal:${ob.id}:${chaveData(alvo)}:${u.id}`;
          const existe = await prisma.reminder.findFirst({ where: { userId: u.id, obrigacaoId: ob.id, dataAlvo: instanteLocal(alvo) }, select: { id: true } });
          if (existe) continue;
          if (!(await temAcessoAtivo(u))) continue;
          await prisma.reminder.create({ data: { userId: u.id, titulo: ob.titulo, descricao: ob.descricao, dataAlvo: instanteLocal(alvo), obrigacaoId: ob.id } });
          r.criados++;
          void chave;
        }
      }
    }
  }

  // 2. Envio das etapas devidas hoje (calendário e manuais), só em horário comercial.
  const hora = horaLocal(agora);
  if (hora < 8 || hora >= 20) return r;
  const pendentes = await prisma.reminder.findMany({
    where: { cancelado: false, dataAlvo: { gte: instanteLocal(hoje), lte: instanteLocal(somarDias(hoje, 3)) }, OR: [{ enviadoD3: false }, { enviadoD1: false }, { enviadoDia: false }] },
    include: { user: true },
  });
  for (const lembrete of pendentes) {
    const alvo = dataLocal(new Date(lembrete.dataAlvo.getTime() + 12 * 3_600_000));
    const etapa = etapaDe(alvo, hoje);
    if (!etapa) continue;
    const campo = etapa === "D3" ? "enviadoD3" : etapa === "D1" ? "enviadoD1" : "enviadoDia";
    if (lembrete[campo]) continue;
    const chave = `${lembrete.id}:${etapa}`;
    try {
      await prisma.lembreteEnvio.create({ data: { chave, userId: lembrete.userId } });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") continue;
      throw error;
    }
    try {
      await enviar(lembrete.user.whatsappNumber, textoLembrete(lembrete.titulo, lembrete.descricao, alvo, etapa));
      await prisma.reminder.update({ where: { id: lembrete.id }, data: { [campo]: true } });
      r.enviados++;
    } catch {
      // Libera para tentar de novo no próximo ciclo.
      await prisma.lembreteEnvio.delete({ where: { chave } }).catch(() => undefined);
      r.falhas++;
    }
  }
  return r;
}
