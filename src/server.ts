import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import { parseInbound, EvolutionWebhookBody } from "./evolution/types.js";
import { sendText, sendTyping } from "./evolution/client.js";
import { downloadMediaBase64 } from "./evolution/media.js";
import { handleInbound } from "./judith/conversation.js";
import { transcreverAudio } from "./judith/whisper.js";
import { registerLegalRoutes } from "./routes/legal.js";
import { processarMensagemBot } from "./bot/handler.js";
import { getPromptVersao } from "./judith/prompts/principal.js";
import { registerKnowledgeRoutes } from "./routes/knowledge.js";
import { registerKnowledgeWorker } from "./knowledge/worker.js";

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
        : undefined,
  },
  bodyLimit: 10 * 1024 * 1024,
});

app.register(sensible);
registerLegalRoutes(app);
registerKnowledgeRoutes(app);
registerKnowledgeWorker(app);

app.get("/health", async () => ({ status: "ok", versao: await getPromptVersao() }));

// Webhook do Evolution API. Configure no Evolution para apontar para:
//   {PUBLIC_URL}/webhook/evolution
// com o evento "messages.upsert" habilitado.
app.post("/webhook/evolution", async (req, reply) => {
  const body = req.body as EvolutionWebhookBody;
  const parsed = parseInbound(body);

  // 200 imediato para o Evolution não reenviar — processa em background.
  reply.code(200).send({ received: true });

  if (!parsed) return;

  // Áudio: baixa do Evolution e transcreve com Whisper.
  let textoParaPipeline = parsed.text;
  let isAudio = false;
  if (parsed.hasAttachment && parsed.attachmentKind === "audio") {
    isAudio = true;
    const media = await downloadMediaBase64({
      remoteJid: parsed.fromJid,
      fromMe: false,
      id: parsed.messageId,
    });
    if (!media) {
      await sendText(
        parsed.whatsappNumber,
        "Recebi seu áudio mas não consegui baixar aqui — pode mandar de novo? 🙏"
      );
      return;
    }
    const transcricao = await transcreverAudio(media.base64, media.mimetype);
    if (!transcricao) {
      await sendText(
        parsed.whatsappNumber,
        "Recebi seu áudio mas não consegui entender — pode repetir falando mais devagar ou mandar como texto? 😊"
      );
      return;
    }
    app.log.info({ user: parsed.whatsappNumber, audio: transcricao }, "judith.audio");
    textoParaPipeline = transcricao;
  }

  const instanceName = body.instance;
  const isJudithLegacy = instanceName === env.EVOLUTION_INSTANCE;

  try {
    if (isJudithLegacy) {
      // Fluxo original da JUDITH jurídica (single-tenant)
      await sendTyping(parsed.whatsappNumber, 1_500);
      const result = await handleInbound({
        whatsappNumber: parsed.whatsappNumber,
        pushName: parsed.pushName,
        text: textoParaPipeline,
        hasAttachment: parsed.hasAttachment && !isAudio,
        messageId: parsed.messageId,
      });
      app.log.info(
        {
          user: parsed.whatsappNumber,
          model: result.modelUsed,
          knowledgeFailure: result.knowledgeFailure,
          sessionId: result.sessionId,
          n: result.replies.length,
        },
        "judith.reply"
      );
      for (let i = 0; i < result.replies.length; i++) {
        if (i > 0) await sendTyping(parsed.whatsappNumber, 800);
        await sendText(parsed.whatsappNumber, result.replies[i]!);
      }
    } else {
      // Bot multi-tenant: roteia pela instância → busca Bot → responde com persona do cliente
      const r = await processarMensagemBot({
        instanceName,
        fromNumero: parsed.whatsappNumber,
        fromPushName: parsed.pushName,
        texto: textoParaPipeline,
      });
      app.log.info({ instance: instanceName, result: r }, "bot.reply");
    }
  } catch (err) {
    app.log.error({ err, instance: instanceName }, "webhook.fail");
    if (isJudithLegacy) {
      await sendText(
        parsed.whatsappNumber,
        "Opa, deu uma travadinha aqui do meu lado. Pode mandar de novo? 🙏"
      );
    }
  }
});

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
