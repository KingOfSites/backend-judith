// Rotas internas usadas pelo painel (admin-judith), protegidas pela INTERNAL_API_KEY:
// exclusão de usuário com comprovante, cancelamento de assinatura e execução das rotinas.

import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";
import { excluirUsuario } from "../retencao/exclusao.js";
import { cancelarAssinatura } from "../judith/cancelamento.js";
import { executarRotinas } from "../jobs/runner.js";

const exclusao = z.object({ motivo: z.string().min(10).max(2000), executadoPor: z.string().max(191).optional() }).strict();
const cancelamento = z.object({ motivo: z.string().min(3).max(2000), executadoPor: z.string().max(191).optional() }).strict();

export function registerInternalRoutes(app: FastifyInstance) {
  app.register(async scoped => {
    scoped.addHook("onRequest", async (req, reply) => {
      const key = req.headers["x-internal-key"];
      const actual = Buffer.from(typeof key === "string" ? key : "");
      const expected = Buffer.from(env.INTERNAL_API_KEY);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return reply.code(401).send({ error: "UNAUTHORIZED" });
    });

    scoped.post<{ Params: { id: string } }>("/internal/usuarios/:id/excluir", async (req, reply) => {
      const parsed = exclusao.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "INVALID_PAYLOAD", issues: parsed.error.issues });
      const certificado = await excluirUsuario({ userId: req.params.id, motivo: parsed.data.motivo, origem: "admin", executadoPor: parsed.data.executadoPor ?? null });
      if (!certificado) return reply.code(404).send({ error: "USER_NOT_FOUND" });
      return { certificadoId: certificado.id, contagens: certificado.contagens };
    });

    scoped.post<{ Params: { id: string } }>("/internal/assinaturas/:id/cancelar", async (req, reply) => {
      const parsed = cancelamento.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "INVALID_PAYLOAD", issues: parsed.error.issues });
      const sub = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: { user: true } });
      if (!sub) return reply.code(404).send({ error: "SUBSCRIPTION_NOT_FOUND" });
      if (sub.status === "CANCELED") return reply.code(409).send({ error: "ALREADY_CANCELED" });
      const r = await cancelarAssinatura(sub, { motivo: parsed.data.motivo, origem: "admin", executadoPor: parsed.data.executadoPor ?? null, user: sub.user });
      return { ok: true, estorno: r.estorno };
    });

    scoped.post("/internal/rotinas/executar", async req => {
      const forcarRetencao = Boolean((req.body as { retencao?: unknown } | null)?.retencao);
      return executarRotinas(app.log, { forcarRetencao });
    });

    scoped.setErrorHandler((error, _req, reply) => {
      app.log.error({ err: error }, "internal.fail");
      reply.code(500).send({ error: "INTERNAL_OPERATION_FAILED" });
    });
  });
}
