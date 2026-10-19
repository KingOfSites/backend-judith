// Lembretes (spec §3.4) com avisos configuráveis por obrigação.
//
//  - Calendário global (ObrigacaoCalendario, editado no Admin): título, dia (fixo ou N-ésimo dia
//    útil), mês (vazio = todo mês), ano (preenchido = uma vez só), perfis, só quem tem
//    funcionário, ajuste de dia útil (DAS vai pro dia útil seguinte; FGTS e INSS vêm pro
//    anterior) e a lista de antecedências dos avisos (ex.: [3,1,0], [1], [7,1]).
//    Cada ocorrência vira um Reminder por usuário atingido, com acesso ativo.
//  - Lembretes manuais (Reminder sem obrigacaoId), criados pelo painel ou pela conversa, com as
//    próprias antecedências (padrão 3, 1 e 0).
//
// LembreteEnvio impede repetição; falha de envio libera o próximo ciclo. Horário de envio: entre
// 8h e 20h de Brasília. Sem modelo e sem cota: lembretes do calendário não contam em nada.

import { Prisma, TipoEmpresa } from "@prisma/client";
import { prisma } from "../db/client.js";
import { sendText } from "../evolution/client.js";
import { temAcessoAtivo } from "../judith/quota.js";
import { ajustarDiaUtil, enesimoDiaUtil, type AjusteDiaUtil, type DataLocal } from "./feriados.js";

export const FUSO = "America/Sao_Paulo";
export type { DataLocal };

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

export const ANTECEDENCIAS_PADRAO = [3, 1, 0];
export const ANTECEDENCIA_MAXIMA = 30;

// Lista de antecedências válida (0..30, sem repetição, decrescente). Vazio ou inválido = padrão.
export function antecedenciasDe(valor: Prisma.JsonValue | unknown): number[] {
  const lista = Array.isArray(valor) ? valor.filter((v): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= ANTECEDENCIA_MAXIMA) : [];
  const unicas = [...new Set(lista)].sort((a, b) => b - a);
  return unicas.length ? unicas : [...ANTECEDENCIAS_PADRAO];
}

export type Obrigacao = {
  dia: number;
  mes: number | null;
  ano?: number | null;
  diaUtil?: boolean;
  ajusteDiaUtil?: AjusteDiaUtil;
  antecedencias?: Prisma.JsonValue | number[];
};

// Data efetiva da obrigação num mês: dia fixo (31 em mês curto cai no último dia) ou N-ésimo dia
// útil, depois o ajuste de fim de semana/feriado.
export function dataDaObrigacao(ob: Obrigacao, ano: number, mes: number): DataLocal {
  const base = ob.diaUtil ? enesimoDiaUtil(ano, mes, Math.min(Math.max(ob.dia, 1), 15)) : { ano, mes, dia: Math.min(ob.dia, ultimoDiaDoMes(ano, mes)) };
  return ajustarDiaUtil(base, ob.ajusteDiaUtil ?? "NENHUM");
}

// Próximas ocorrências entre hoje e hoje + maior antecedência (o horizonte do primeiro aviso).
export function ocorrencias(ob: Obrigacao, hoje: DataLocal): DataLocal[] {
  const horizonte = Math.max(...antecedenciasDe(ob.antecedencias));
  const candidatas: DataLocal[] = [];
  for (let desloc = -1; desloc <= 13; desloc++) {
    const ano = hoje.ano + Math.floor((hoje.mes - 1 + desloc) / 12);
    const mes = ((hoje.mes - 1 + desloc) % 12 + 12) % 12 + 1;
    if (ob.mes !== null && ob.mes !== mes) continue;
    if (ob.ano != null && ob.ano !== ano) continue;
    candidatas.push(dataDaObrigacao(ob, ano, mes));
  }
  const min = chaveData(hoje);
  const max = chaveData(somarDias(hoje, horizonte));
  return candidatas.filter(c => chaveData(c) >= min && chaveData(c) <= max).filter((c, i, a) => a.findIndex(x => chaveData(x) === chaveData(c)) === i);
}

// Dias entre hoje e o alvo (0 = hoje). Negativo = já passou.
export function diasAte(alvo: DataLocal, hoje: DataLocal): number {
  return Math.round((instanteLocal(alvo).getTime() - instanteLocal(hoje).getTime()) / 86_400_000);
}

export type Etapa = "D3" | "D1" | "DIA";

// Compatibilidade com o modelo antigo de três etapas (enviadoD3/enviadoD1/enviadoDia).
export function etapaDe(alvo: DataLocal, hoje: DataLocal): Etapa | null {
  const diff = diasAte(alvo, hoje);
  return diff === 3 ? "D3" : diff === 1 ? "D1" : diff === 0 ? "DIA" : null;
}

function quando(antecedencia: number): string {
  if (antecedencia === 0) return "vence hoje";
  if (antecedencia === 1) return "vence amanhã";
  return `vence em ${antecedencia} dias`;
}

export function textoLembrete(titulo: string, descricao: string | null, alvo: DataLocal, etapa: Etapa | number): string {
  const antecedencia = typeof etapa === "number" ? etapa : etapa === "D3" ? 3 : etapa === "D1" ? 1 : 0;
  const data = `${String(alvo.dia).padStart(2, "0")}/${String(alvo.mes).padStart(2, "0")}`;
  return `📅 *Lembrete:* ${titulo} ${quando(antecedencia)} (${data}).${descricao?.trim() ? `\n\n${descricao.trim()}` : ""}`;
}

function perfisDe(valor: Prisma.JsonValue): TipoEmpresa[] {
  const todos: TipoEmpresa[] = ["MEI", "ME", "EPP", "AUTONOMO"];
  return Array.isArray(valor) ? (valor.filter((v): v is TipoEmpresa => typeof v === "string" && (todos as string[]).includes(v))) : [];
}

export type ResultadoLembretes = { enviados: number; falhas: number; criados: number };

export async function enviarLembretes(agora = new Date(), enviar: (numero: string, texto: string) => Promise<unknown> = sendText): Promise<ResultadoLembretes> {
  const r: ResultadoLembretes = { enviados: 0, falhas: 0, criados: 0 };
  const hoje = dataLocal(agora);

  // 1. Calendário global → Reminder por usuário (idempotente por obrigação + data + usuário).
  const obrigacoes = await prisma.obrigacaoCalendario.findMany({ where: { ativo: true } });
  if (obrigacoes.length) {
    const usuarios = await prisma.user.findMany({ where: { onboarding: "CONCLUIDO", tipoEmpresa: { not: null }, exclusaoSolicitadaEm: null } });
    for (const ob of obrigacoes) {
      const perfis = perfisDe(ob.perfis);
      const alvos = ocorrencias(ob, hoje);
      if (!alvos.length) continue;
      const antecedencias = antecedenciasDe(ob.antecedencias);
      for (const u of usuarios) {
        if (!u.tipoEmpresa || !perfis.includes(u.tipoEmpresa)) continue;
        // Salário, FGTS e 13º só para quem disse ter funcionário (null = não perguntado: não manda).
        if (ob.somenteComFuncionarios && u.temFuncionarios !== true) continue;
        for (const alvo of alvos) {
          const existe = await prisma.reminder.findFirst({ where: { userId: u.id, obrigacaoId: ob.id, dataAlvo: instanteLocal(alvo) }, select: { id: true } });
          if (existe) continue;
          if (!(await temAcessoAtivo(u))) continue;
          await prisma.reminder.create({ data: { userId: u.id, titulo: ob.titulo, descricao: ob.descricao, dataAlvo: instanteLocal(alvo), obrigacaoId: ob.id, antecedencias } });
          r.criados++;
        }
      }
    }
  }

  // 2. Envio dos avisos devidos hoje (calendário e manuais), só em horário comercial.
  const hora = horaLocal(agora);
  if (hora < 8 || hora >= 20) return r;
  const pendentes = await prisma.reminder.findMany({
    where: { cancelado: false, dataAlvo: { gte: instanteLocal(hoje), lte: instanteLocal(somarDias(hoje, ANTECEDENCIA_MAXIMA)) } },
    include: { user: true },
  });
  for (const lembrete of pendentes) {
    const alvo = dataLocal(new Date(lembrete.dataAlvo.getTime() + 12 * 3_600_000));
    const antecedencia = diasAte(alvo, hoje);
    if (!antecedenciasDe(lembrete.antecedencias).includes(antecedencia)) continue;
    const enviadas = Array.isArray(lembrete.etapasEnviadas) ? (lembrete.etapasEnviadas as unknown[]).filter((v): v is number => typeof v === "number") : [];
    if (enviadas.includes(antecedencia)) continue;
    const chave = `${lembrete.id}:D${antecedencia}`;
    try {
      await prisma.lembreteEnvio.create({ data: { chave, userId: lembrete.userId } });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") continue;
      throw error;
    }
    try {
      await enviar(lembrete.user.whatsappNumber, textoLembrete(lembrete.titulo, lembrete.descricao, alvo, antecedencia));
      const legado = antecedencia === 3 ? { enviadoD3: true } : antecedencia === 1 ? { enviadoD1: true } : antecedencia === 0 ? { enviadoDia: true } : {};
      await prisma.reminder.update({ where: { id: lembrete.id }, data: { etapasEnviadas: [...enviadas, antecedencia], ...legado } });
      r.enviados++;
    } catch {
      // Libera para tentar de novo no próximo ciclo.
      await prisma.lembreteEnvio.delete({ where: { chave } }).catch(() => undefined);
      r.falhas++;
    }
  }
  return r;
}
