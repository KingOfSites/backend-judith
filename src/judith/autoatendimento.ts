// Autoatendimento pelo WhatsApp, sem modelo e sem cota: o cliente vê a cota do mês, lista e
// cria lembretes e recebe o caminho do avulso quando não tem plano. O site fica só para a compra.

import { User } from "@prisma/client";
import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { linkAvulso, podeCriarLembrete, SERVICO_LABEL } from "./quota.js";
import { carregarTextosOnboarding, preencher } from "./onboarding/textos.js";
import { chaveData, dataLocal, instanteLocal, somarDias, type DataLocal } from "../jobs/lembretes.js";
import type { Funcao } from "./claude.js";

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const dataBr = (d: DataLocal) => `${String(d.dia).padStart(2, "0")}/${String(d.mes).padStart(2, "0")}/${d.ano}`;
const dataCurta = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

// "minha cota", "quantas dúvidas ainda tenho", "meu plano", "meu saldo"
export function isPedidoCota(texto: string): boolean {
  const n = normalizar(texto).replace(/[?!.]/g, "");
  if (n.length > 120) return false;
  return /\b(minha cota|minhas cotas|cotas? (disponive\w*|restantes?|do mes|do plano)|quant[ao]s? (duvidas?|analises?|redac\w+|cotas?|creditos?|consultas?) (eu )?(ainda )?(tenho|me restam?|restam?|sobra|sobram|posso (fazer|usar|mandar)|falta|faltam)|meu saldo|saldo (de|das|dos) (duvidas|cotas|creditos|consultas)|meu plano|qual (e )?(o )?meu plano|quanto (eu )?(ainda )?posso usar|(meu )?uso do mes|o que (eu )?(ainda )?tenho (disponivel|no plano))\b/.test(n);
}

// "meus lembretes", "quais lembretes eu tenho", "meus prazos"
export function isPedidoLembretes(texto: string): boolean {
  const n = normalizar(texto).replace(/[?!.]/g, "");
  if (n.length > 120) return false;
  return /\b(meus lembretes|lembretes (cadastrados|ativos|marcados|que (eu )?(tenho|cadastrei|marquei))|quais (sao )?(os )?(meus )?lembretes|lista(r)? (meus |os )?lembretes|meus (proximos )?prazos|proximos prazos|minhas (proximas )?obrigacoes|o que (eu )?tenho (pra|para) (pagar|entregar) (esse|este|no) mes)\b/.test(n);
}

// "quero comprar avulso", "quanto custa uma dúvida", "dá pra pagar só uma consulta sem assinar?"
export function isPedidoAvulso(texto: string): boolean {
  const n = normalizar(texto).replace(/[?!.]/g, "");
  if (n.length > 160) return false;
  if (/\b(trabalhador|trabalho|servico|contrato|funcionario|empregado|diarista|nota fiscal|pagamento) avuls/.test(n)) return false;
  return /\b(avuls[oa]s?|sem assinar|sem assinatura|sem (fazer |ter )?(um |o )?plano|so (uma|essa|esta) (duvida|pergunta|consulta|analise|redacao)|pagar (so|apenas|por) (uma|essa|esta|um|uma unica) (duvida|pergunta|consulta|analise|redacao|vez)|quanto custa (uma|a|um|o) (duvida|pergunta|consulta|analise|redacao|documento|atendimento)|preco (avulso|por duvida|da duvida|da consulta|da analise)|comprar (uma|um|so uma) (duvida|analise|redacao|consulta))\b/.test(n);
}

// "em texto", "aqui na conversa", "copiar e colar", "sem pdf": o documento sai como mensagem.
export function pediuEmTexto(texto: string): boolean {
  const n = normalizar(texto);
  return /\b(em texto|por texto|como texto|texto corrido|aqui (mesmo )?(na conversa|no whats\w*|no zap|na mensagem|no chat)|copiar e colar|copia e cola|sem pdf|sem ser (em )?pdf|nao (precisa|quero|manda|precisa ser|quero em|precisa de) (de |o |em |um )?pdf|me manda (so )?o texto|so o texto|em mensagem|direto na conversa)\b/.test(n);
}

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export type PedidoLembrete = { titulo: string; alvo: DataLocal };

function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

// "me lembra dia 15/11 de pagar o aluguel", "lembrete: 20/10 renovar o alvará", "me avisa dia 5 de
// dezembro do 13º". Sem data reconhecível, não é pedido de lembrete.
export function extrairLembrete(texto: string, hoje: DataLocal = dataLocal()): PedidoLembrete | null {
  const n = normalizar(texto);
  if (n.length > 200) return null;
  if (!/\b(me )?(lembra|lembrar|lembre|lembrete|avisa|avise|anota|marca|agenda)\b/.test(n)) return null;

  // Detecta no texto sem acentos; o título sai do texto original (minúsculo), preservando acentos.
  const orig = texto.toLowerCase().replace(/\s+/g, " ").trim();
  let alvo: DataLocal | null = null;
  let trecho: RegExp | null = null;
  let m = n.match(/\b(?:dia )?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m) {
    const dia = Number(m[1]), mes = Number(m[2]);
    let ano = m[3] ? Number(m[3]) : hoje.ano;
    if (m[3] && m[3].length === 2) ano += 2000;
    if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes(ano, mes)) return null;
    alvo = { ano, mes, dia };
    if (!m[3] && chaveData(alvo) < chaveData(hoje)) alvo = { ...alvo, ano: ano + 1 };
    trecho = /\b(?:dia )?\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/;
  } else if ((m = n.match(/\bdia (\d{1,2})(?: de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))?\b/))) {
    const dia = Number(m[1]);
    if (dia < 1 || dia > 31) return null;
    if (m[2]) {
      const mes = MESES.indexOf(m[2]) + 1;
      let ano = hoje.ano;
      if (chaveData({ ano, mes, dia: Math.min(dia, diasNoMes(ano, mes)) }) < chaveData(hoje)) ano++;
      if (dia > diasNoMes(ano, mes)) return null;
      alvo = { ano, mes, dia };
    } else {
      let { ano, mes } = hoje;
      if (dia < hoje.dia || dia > diasNoMes(ano, mes)) { mes++; if (mes > 12) { mes = 1; ano++; } }
      if (dia > diasNoMes(ano, mes)) return null;
      alvo = { ano, mes, dia };
    }
    trecho = /\bdia \d{1,2}(?: de (?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))?\b/;
  } else if ((m = n.match(/\b(depois de amanha|amanha)\b/))) {
    alvo = somarDias(hoje, m[1] === "amanha" ? 1 : 2);
    // "ã" não é caractere de palavra para o \b do JavaScript: fecha com espaço ou fim.
    trecho = /(?:^|\s)(?:depois de amanh[aã]|amanh[aã])(?=\s|$|[,.!?])/;
  }
  if (!alvo || !trecho) return null;

  const titulo = orig
    .replace(trecho, " ")
    .replace(/\b(me |por favor|pode |poderia |judith|voc[eê] )/g, " ")
    .replace(/\b(lembra|lembrar|lembre|lembrete|avisa|avise|anota|marca|agenda)\b/g, " ")
    .replace(/\s+/g, " ").trim()
    .replace(/^(de |do |da |que |sobre |pra |para |o |a |no |na |um |uma |:|-)+/, "")
    .replace(/( de| do| da| que| pra| para| no| na)+$/, "")
    .trim();
  const limpo = titulo ? titulo.charAt(0).toUpperCase() + titulo.slice(1) : "Lembrete";
  return { titulo: limpo.slice(0, 120), alvo };
}

function inicioDoMes(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const KIND_LABEL: Record<"DUVIDA" | "ANALISE" | "REDACAO", [string, string]> = { DUVIDA: ["Dúvidas", "dúvida"], ANALISE: ["Análises", "análise"], REDACAO: ["Redações", "redação"] };
const KIND_FIELD = { DUVIDA: "duvidasMes", ANALISE: "analisesMes", REDACAO: "redacoesMes" } as const;

export async function resumoCota(user: User): Promise<string> {
  const [usos, plano, sub, cortesias, avulsos] = await Promise.all([
    prisma.usageEvent.groupBy({ by: ["kind"], where: { userId: user.id, createdAt: { gte: inicioDoMes() } }, _count: { _all: true } }),
    prisma.planCatalog.findUnique({ where: { codigo: user.plano } }).then(p => p ?? (user.plano === "TRIAL" ? prisma.planCatalog.findUnique({ where: { codigo: "ESSENCIAL" } }) : null)),
    prisma.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.creditoCortesia.findMany({ where: { userId: user.id, saldo: { gt: 0 } } }),
    prisma.avulsoCompra.findMany({ where: { userId: user.id, status: "APPROVED", consumidoEm: null } }),
  ]);
  const uso = (k: string) => usos.find(u => u.kind === k)?._count._all ?? 0;
  const nomePlano = user.plano === "TRIAL" ? "período de teste" : plano?.nome ?? user.plano;
  const linhas = [`📊 *Seu uso neste mês* (${nomePlano}):`];
  for (const k of ["DUVIDA", "ANALISE", "REDACAO"] as const) {
    const limite = plano ? plano[KIND_FIELD[k]] : null;
    linhas.push(limite === null || limite === undefined
      ? `• ${KIND_LABEL[k][0]}: ${uso(k)} (sem limite)`
      : `• ${KIND_LABEL[k][0]}: ${uso(k)} de ${limite} (restam ${Math.max(0, limite - uso(k))})`);
  }
  const extras: string[] = [];
  for (const k of ["DUVIDA", "ANALISE", "REDACAO"] as const) {
    const cortesia = cortesias.filter(c => c.servico === k).reduce((s, c) => s + c.saldo, 0);
    const avulso = avulsos.filter(a => a.servico === k).length;
    if (cortesia) extras.push(`${cortesia} ${KIND_LABEL[k][cortesia === 1 ? 1 : 0].toLowerCase()} de cortesia`);
    if (avulso) extras.push(`${avulso} ${KIND_LABEL[k][avulso === 1 ? 1 : 0].toLowerCase()} avulsa${avulso === 1 ? "" : "s"}`);
  }
  if (extras.length) linhas.push(`• Créditos extras: ${extras.join(", ")}`);
  linhas.push("");
  if (user.plano === "TRIAL" && user.trialFimEm) {
    linhas.push(user.trialFimEm > new Date() ? `Seu período de teste vai até ${dataCurta(user.trialFimEm)}.` : `Seu período de teste terminou em ${dataCurta(user.trialFimEm)}. Planos: ${env.WEB_JUDITH_URL}/planos`);
  } else if (sub?.status === "ACTIVE" && sub.currentPeriodEnd) {
    linhas.push(`Seu acesso vale até ${dataCurta(sub.currentPeriodEnd)}.`);
  } else if (sub?.status === "CANCELED") {
    linhas.push(sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? `Assinatura cancelada: acesso até ${dataCurta(sub.currentPeriodEnd)}.` : `Sua assinatura está cancelada. Planos: ${env.WEB_JUDITH_URL}/planos`);
  }
  linhas.push("Pra ver seus prazos, diga *meus lembretes*. Pra cancelar a assinatura, *quero cancelar*.");
  return linhas.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

export async function listarLembretes(user: User): Promise<string> {
  const hoje = dataLocal();
  const lembretes = await prisma.reminder.findMany({
    where: { userId: user.id, cancelado: false, dataAlvo: { gte: instanteLocal(hoje) } },
    orderBy: { dataAlvo: "asc" }, take: 15,
  });
  const dica = "Pra criar um novo, é só dizer, por exemplo: *me lembra dia 15/11 de pagar o aluguel*.";
  if (!lembretes.length) {
    return `Você não tem lembretes marcados. 📅 Os prazos do seu perfil (como o DAS) eu aviso automaticamente quando se aproximam.\n\n${dica}`;
  }
  const linhas = lembretes.map(l => `• ${dataCurta(l.dataAlvo).slice(0, 5)} – ${l.titulo}${l.obrigacaoId ? "" : " (seu)"}`);
  return `📅 *Seus próximos lembretes:*\n${linhas.join("\n")}\n\n${dica}`;
}

export async function criarLembrete(user: User, pedido: PedidoLembrete): Promise<string> {
  if (!(await podeCriarLembrete(user))) {
    return `Seu plano já usou os lembretes incluídos neste mês. Os prazos do seu perfil eu continuo avisando automaticamente. Pra ter mais lembretes, veja os planos: ${env.WEB_JUDITH_URL}/planos`;
  }
  await prisma.$transaction([
    prisma.reminder.create({ data: { userId: user.id, titulo: pedido.titulo, dataAlvo: instanteLocal(pedido.alvo), antecedencias: [1, 0] } }),
    prisma.usageEvent.create({ data: { userId: user.id, kind: "LEMBRETE" } }),
  ]);
  return `Anotado! 📅 Te lembro de *${pedido.titulo}* em ${dataBr(pedido.alvo)}: um aviso na véspera e outro no dia.\n\nPra ver tudo que está marcado, diga *meus lembretes*.`;
}

// Quem não tem plano ativo (ou pediu avulso): texto editável no Admin com o link de pagamento.
export async function respostaSemPlano(user: User, funcao: Funcao, motivo: "trial_encerrado" | "sem_plano" | "pedido_avulso"): Promise<string> {
  const textos = await carregarTextosOnboarding();
  const planos = `${env.WEB_JUDITH_URL}/planos`;
  const link = await linkAvulso(user, funcao);
  const base = motivo === "trial_encerrado" ? textos.trialEncerrado : textos.avulsoSemPlano;
  return preencher(base, { planos, avulso: link ?? planos, servico: SERVICO_LABEL[funcao], nome: user.nome });
}
