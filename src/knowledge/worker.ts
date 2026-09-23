import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";
import { processNextJob } from "./indexer.js";
import { createProvider } from "./provider.js";

export function registerKnowledgeWorker(app: FastifyInstance) {
  if (!env.KNOWLEDGE_WORKER_ENABLED) return;
  let stopped = false;
  let running: Promise<void> | undefined;
  const tick = () => {
    if (stopped || running) return;
    running = processNextJob(prisma, createProvider())
      .catch(() => { app.log.error({ code: "KNOWLEDGE_WORKER_FAILED" }, "Falha no worker da base"); })
      .finally(() => { running = undefined; });
  };
  const timer = setInterval(tick, 2000);
  timer.unref();
  app.addHook("onReady", async () => { tick(); });
  app.addHook("onClose", async () => { stopped = true; clearInterval(timer); await running; });
}
