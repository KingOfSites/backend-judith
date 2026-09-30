// Agendador das rotinas automáticas. Roda a cada 10 minutos; cada rotina decide se tem algo a
// fazer. A retenção roda uma vez por dia (de madrugada em Brasília). Uma execução por vez.

import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { enviarLembretes, horaLocal, dataLocal, chaveData } from "./lembretes.js";
import { enviarAvisos } from "./avisos.js";
import { executarRetencao } from "./retencao.js";

const INTERVALO_MS = 10 * 60_000;

export async function executarRotinas(log: { info: (o: object, m: string) => void; error: (o: object, m: string) => void }, opts: { forcarRetencao?: boolean } = {}) {
  const agora = new Date();
  const resultado: Record<string, unknown> = {};
  try { resultado.lembretes = await enviarLembretes(agora); } catch (err) { log.error({ err }, "jobs.lembretes.fail"); }
  try { resultado.avisos = await enviarAvisos(agora); } catch (err) { log.error({ err }, "jobs.avisos.fail"); }
  const hoje = chaveData(dataLocal(agora));
  if (opts.forcarRetencao || (horaLocal(agora) >= 3 && horaLocal(agora) < 5 && ultimaRetencao !== hoje)) {
    try { resultado.retencao = await executarRetencao(agora); ultimaRetencao = hoje; } catch (err) { log.error({ err }, "jobs.retencao.fail"); }
  }
  log.info(resultado, "jobs.tick");
  return resultado;
}

let ultimaRetencao: string | null = null;

export function registerJobs(app: FastifyInstance) {
  if (!env.JOBS_ENABLED) return;
  let running: Promise<unknown> | undefined;
  const tick = () => {
    if (running) return;
    running = executarRotinas(app.log).finally(() => { running = undefined; });
  };
  const timer = setInterval(tick, INTERVALO_MS);
  timer.unref();
  app.addHook("onReady", async () => { setTimeout(tick, 15_000).unref(); });
  app.addHook("onClose", async () => { clearInterval(timer); await running; });
}
