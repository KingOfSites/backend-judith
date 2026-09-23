import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";
import { KnowledgeValidationError } from "../knowledge/areas.js";
import { parseNotebook } from "../knowledge/parser.js";
import { requestIndex } from "../knowledge/indexer.js";

const notebook = z.object({ area: z.string(), conteudo: z.string() }).strict();
const request = z.object({ requestKey: z.string().min(1).max(191).regex(/^[A-Za-z0-9_-]+$/) }).strict();

export function registerKnowledgeRoutes(app: FastifyInstance) {
  app.register(async scoped => {
    scoped.addHook("onRequest", async (req, reply) => {
      const key = req.headers["x-internal-key"];
      const actual = Buffer.from(typeof key === "string" ? key : "");
      const expected = Buffer.from(env.INTERNAL_API_KEY);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return reply.code(401).send({ error: "UNAUTHORIZED" });
    });
    scoped.post("/internal/knowledge/validate", async (req, reply) => {
      const parsed = notebook.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "INVALID_PAYLOAD", issues: parsed.error.issues });
      try {
        const chunks = parseNotebook(parsed.data.conteudo, parsed.data.area);
        return { valid: true, chunks: chunks.length, areas: [...new Set(chunks.flatMap(c => c.areas))] };
      } catch (error) {
        if (error instanceof KnowledgeValidationError) return reply.code(422).send({ valid: false, errors: error.issues });
        throw error;
      }
    });
    scoped.post("/internal/knowledge/reindex", async (req, reply) => {
      const parsed = request.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "INVALID_PAYLOAD" });
      if (!env.KNOWLEDGE_WORKER_ENABLED) return reply.code(503).send({ error: "WORKER_DISABLED" });
      const job = await requestIndex(prisma, parsed.data.requestKey);
      if (job.requestKey !== parsed.data.requestKey) return reply.code(409).send({ error: "INDEXING_BUSY", jobId: job.id });
      return reply.code(job.status === "pending" || job.status === "processing" ? 202 : 200).send({ jobId: job.id, status: job.status, statusUrl: `/internal/knowledge/jobs/${job.id}` });
    });
    scoped.get<{ Params: { id: string } }>("/internal/knowledge/jobs/:id", async (req, reply) => {
      const job = await prisma.knowledgeJob.findUnique({ where: { id: req.params.id } });
      if (!job) return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      return { jobId: job.id, status: job.status, total: job.total, processed: job.processed, result: job.result, errors: job.errors, createdAt: job.createdAt, updatedAt: job.updatedAt };
    });
    scoped.setErrorHandler((error, _req, reply) => {
      const code = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
      const status = code === 400 || code === 413 ? code : 500;
      reply.code(status).send({ error: status === 500 ? "KNOWLEDGE_OPERATION_FAILED" : "INVALID_PAYLOAD" });
    });
  });
}
