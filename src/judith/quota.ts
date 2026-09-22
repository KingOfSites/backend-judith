import axios from "axios";
import { User, Prisma, PlanCatalog } from "@prisma/client";
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
  | { allowed: true; creditoId?: string }
  | { allowed: false; motivo: "pagamento_indisponivel" }
  | { allowed: false; motivo: "sem_assinatura_ativa" }
  | { allowed: false; motivo: "cota_estourada"; linkCompra: string; servicoLabel: string };

function inicioDoMes(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function assinaturaAtiva(user: User, db: Prisma.TransactionClient): Promise<boolean> {
  const sub = await db.subscription.findFirst({
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

async function gerarLinkAvulso(whatsapp: string, servico: "DUVIDA" | "ANALISE" | "REDACAO"): Promise<string | null> {
  try {
    const { data } = await axios.post(
      `${env.WEB_JUDITH_URL}/api/avulso/criar`,
      { whatsapp, servico, metodo: "PIX" },
      { headers: { "x-internal-key": env.INTERNAL_API_KEY }, timeout: 15_000 }
    );
    return typeof data?.url === "string" && data.url.trim() ? data.url : null;
  } catch {
    return null;
  }
}

// Consulta sem consumir: primeiro usa o plano, depois uma compra aprovada.
async function disponibilidade(user: User, funcao: Funcao, db: Prisma.TransactionClient) {
  const kind = FUNCAO_TO_KIND[funcao];
  const ativa = await assinaturaAtiva(user, db);
  if (ativa) {
    const plano = await db.planCatalog.findUnique({ where: { codigo: user.plano } });
    if (plano) {
      const limite = plano[KIND_TO_PLAN_FIELD[kind]] as number | null;
      if (limite === null) return { allowed: true } as const;
      const usos = await db.usageEvent.count({
        where: { userId: user.id, kind, createdAt: { gte: inicioDoMes() } },
      });
      if (usos < limite) return { allowed: true } as const;
    }
  }
  const credito = await db.avulsoCompra.findFirst({
    where: { userId: user.id, servico: kind, status: "APPROVED", consumidoEm: null },
    orderBy: [{ paidAt: "asc" }, { id: "asc" }],
  });
  if (credito) return { allowed: true, creditoId: credito.id } as const;
  return { allowed: false, motivo: ativa ? "cota_estourada" : "sem_assinatura_ativa" } as const;
}

export async function checarCota(user: User, funcao: Funcao): Promise<QuotaResult> {
  const acesso = await disponibilidade(user, funcao, prisma);
  if (acesso.allowed) return acesso;
  if (acesso.motivo === "sem_assinatura_ativa") return { allowed: false, motivo: "sem_assinatura_ativa" };
  const kind = FUNCAO_TO_KIND[funcao];
  const link = await gerarLinkAvulso(user.whatsappNumber, kind);
  if (!link) return { allowed: false, motivo: "pagamento_indisponivel" };
  return { allowed: false, motivo: "cota_estourada", linkCompra: link, servicoLabel: LABEL[kind] };
}

// Executada junto com o histórico, somente após a IA retornar uma resposta.
// O lock por usuário serializa a confirmação de mensagens concorrentes.
export async function registrarUso(db: Prisma.TransactionClient, userId: string, funcao: Funcao): Promise<void> {
  await db.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const acesso = await disponibilidade(user, funcao, db);
  if (!acesso.allowed) throw new Error("Cota indisponível ao confirmar resposta");
  const kind = FUNCAO_TO_KIND[funcao];
  if (acesso.creditoId) {
    const consumo = await db.avulsoCompra.updateMany({
      where: { id: acesso.creditoId, userId, servico: kind, status: "APPROVED", consumidoEm: null },
      data: { consumidoEm: new Date() },
    });
    if (consumo.count !== 1) throw new Error("Crédito avulso indisponível ao confirmar resposta");
  }
  await db.usageEvent.create({ data: { userId, kind } });
}
