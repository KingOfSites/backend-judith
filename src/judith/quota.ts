import axios from "axios";
import { User, UsageKind, PlanCatalog } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";
import type { Funcao } from "./claude.js";

// Cota mensal por plano (v6 §7.2) + compra avulsa (porta de entrada / pós-cota).
// Nada disso existia antes — toda mensagem passava direto pra IA sem checar
// assinatura nem limite. Ver [[project-judith-features]] no histórico do projeto.

const FUNCAO_TO_KIND: Record<Funcao, "DUVIDA" | "ANALISE" | "REDACAO"> = {
  duvida: "DUVIDA",
  analise: "ANALISE",
  redacao: "REDACAO",
};

const KIND_TO_PLAN_FIELD: Record<"DUVIDA" | "ANALISE" | "REDACAO", keyof PlanCatalog> = {
  DUVIDA: "duvidasMes",
  ANALISE: "analisesMes",
  REDACAO: "redacoesMes",
};

const LABEL: Record<"DUVIDA" | "ANALISE" | "REDACAO", string> = {
  DUVIDA: "dúvida",
  ANALISE: "análise de documento",
  REDACAO: "redação de documento",
};

export type QuotaResult =
  | { allowed: true }
  | { allowed: false; motivo: "sem_assinatura_ativa" }
  | { allowed: false; motivo: "cota_estourada"; linkCompra: string; servicoLabel: string };

function inicioDoMes(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function assinaturaAtiva(user: User): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    // Ainda sem registro de Subscription — vale o trial simples do onboarding.
    return !user.trialFimEm || user.trialFimEm > new Date();
  }

  if (sub.status === "ACTIVE") return true;
  if (sub.status === "TRIALING") return !sub.trialEndsAt || sub.trialEndsAt > new Date();
  return false; // PENDING, PAST_DUE, CANCELED, SUSPENDED
}

async function consumirCreditoAvulso(userId: string, kind: UsageKind): Promise<boolean> {
  const credito = await prisma.avulsoCompra.findFirst({
    where: { userId, servico: kind, status: "APPROVED", consumidoEm: null },
    orderBy: { paidAt: "asc" },
  });
  if (!credito) return false;

  await prisma.avulsoCompra.update({ where: { id: credito.id }, data: { consumidoEm: new Date() } });
  return true;
}

async function gerarLinkAvulso(whatsapp: string, servico: "DUVIDA" | "ANALISE" | "REDACAO"): Promise<string | null> {
  try {
    const { data } = await axios.post(
      `${env.WEB_JUDITH_URL}/api/avulso/criar`,
      { whatsapp, servico, metodo: "PIX" },
      { headers: { "x-internal-key": env.INTERNAL_API_KEY }, timeout: 15_000 }
    );
    return data?.url ?? null;
  } catch {
    return null;
  }
}

// Chamado antes de acionar a IA. Consome crédito avulso automaticamente se existir;
// se estourou a cota do plano e não tem crédito, gera o link de compra avulsa.
export async function checarCota(user: User, funcao: Funcao): Promise<QuotaResult> {
  const kind = FUNCAO_TO_KIND[funcao];

  if (!(await assinaturaAtiva(user))) {
    return { allowed: false, motivo: "sem_assinatura_ativa" };
  }

  if (await consumirCreditoAvulso(user.id, kind)) {
    return { allowed: true };
  }

  const plano = await prisma.planCatalog.findUnique({ where: { codigo: user.plano } });
  const campo = KIND_TO_PLAN_FIELD[kind];
  const limite = (plano?.[campo] as number | null | undefined) ?? null;

  if (limite !== null && limite !== undefined) {
    const usos = await prisma.usageEvent.count({
      where: { userId: user.id, kind, createdAt: { gte: inicioDoMes() } },
    });
    if (usos >= limite) {
      const link = await gerarLinkAvulso(user.whatsappNumber, kind);
      if (link) {
        return { allowed: false, motivo: "cota_estourada", linkCompra: link, servicoLabel: LABEL[kind] };
      }
      // Falha ao gerar o link (Mercado Pago fora do ar, etc.) — não trava o usuário.
      return { allowed: true };
    }
  }

  return { allowed: true };
}

export async function registrarUso(userId: string, funcao: Funcao): Promise<void> {
  await prisma.usageEvent.create({ data: { userId, kind: FUNCAO_TO_KIND[funcao] } });
}
