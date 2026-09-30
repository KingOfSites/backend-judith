import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import { parseInbound, parseReaction, EvolutionWebhookBody } from "./evolution/types.js";
import { sendDocument, sendText, sendTyping } from "./evolution/client.js";
import { recordReaction, registerAnswer } from "./knowledge/feedback.js";
import { downloadMediaBase64 } from "./evolution/media.js";
import { AnexoInput, handleInbound } from "./judith/conversation.js";
import { lerDocumento, LeituraError } from "./judith/leitura.js";
import { registerInternalRoutes } from "./routes/internal.js";
import { registerJobs } from "./jobs/runner.js";
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
registerInternalRoutes(app);
registerJobs(app);

app.get("/health", async () => ({ status: "ok", versao: await getPromptVersao() }));

// Webhook do Evolution API. Configure no Evolution para apontar para:
//   {PUBLIC_URL}/webhook/evolution
// com o evento "messages.upsert" habilitado.
app.post("/webhook/evolution", async (req, reply) => {
  const body = req.body as EvolutionWebhookBody;
  const reaction = body.instance === env.EVOLUTION_INSTANCE ? parseReaction(body) : null;
  const parsed = parseInbound(body);

  // 200 imediato para o Evolution não reenviar — processa em background.
  reply.code(200).send({ received: true });

  if (reaction) {
    // "Isso te ajudou?": 👍/👎 na resposta da JUDITH. Não gera resposta nem consome crédito.
    try { app.log.info({ recorded: await recordReaction(reaction.reactedMessageId, reaction.whatsappNumber, reaction.emoji), removed: !reaction.emoji }, "judith.reaction"); }
    catch (err) { app.log.error({ err }, "judith.reaction.fail"); }
    return;
  }
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

  // PDF ou imagem (só na JUDITH): baixa e transcreve. Falha vira aviso sem cota, no pipeline.
  let anexo: AnexoInput | undefined;
  if (isJudithLegacy && parsed.hasAttachment && !isAudio) {
    const fileName = body.data.message?.documentMessage?.fileName;
    const mimetype = body.data.message?.documentMessage?.mimetype ?? body.data.message?.imageMessage?.mimetype;
    try {
      const media = await downloadMediaBase64({ remoteJid: parsed.fromJid, fromMe: false, id: parsed.messageId });
      if (!media) throw new LeituraError("FALHA", "download falhou");
      const leitura = await lerDocumento(media.base64, media.mimetype || mimetype, fileName);
      anexo = { leitura, fileName };
      app.log.info({ user: parsed.whatsappNumber, tipo: leitura.mimetype, paginas: leitura.paginas, caracteres: leitura.caracteres }, "judith.anexo.lido");
    } catch (err) {
      const code = err instanceof LeituraError ? err.code : "FALHA";
      app.log.warn({ user: parsed.whatsappNumber, code, err: err instanceof Error ? err.message : String(err) }, "judith.anexo.naoLido");
      anexo = { erro: code };
    }
  }

  try {
    if (isJudithLegacy) {
      // Fluxo original da JUDITH jurídica (single-tenant)
      await sendTyping(parsed.whatsappNumber, 1_500);
      const result = await handleInbound({
        whatsappNumber: parsed.whatsappNumber,
        pushName: parsed.pushName,
        text: textoParaPipeline,
        hasAttachment: parsed.hasAttachment && !isAudio,
        anexo,
        messageId: parsed.messageId,
      });
      app.log.info(
        {
          user: parsed.whatsappNumber,
          model: result.modelUsed,
          knowledgeFailure: result.knowledgeFailure,
          sessionId: result.sessionId,
          n: result.replies.length,
          // Quais regras subiram neste turno (checklist de aceite: "conferir no log quais subiram").
          regras: result.regras,
          cota: result.cota,
          cancelamento: result.cancelamento,
          exclusaoDados: result.exclusaoDados,
          documento: result.documento?.fileName,
        },
        "judith.reply"
      );
      for (let i = 0; i < result.replies.length; i++) {
        if (i > 0) await sendTyping(parsed.whatsappNumber, 800);
        const sentId = await sendText(parsed.whatsappNumber, result.replies[i]!, parsed.messageId);
        if (sentId && result.feedbackInteractionId && i === result.replies.length - 1) {
          await registerAnswer(sentId, result.feedbackInteractionId, result.userId);
        }
      }
      // Documento redigido: PDF com a mensagem de encerramento. Se o envio do arquivo falhar,
      // o texto do documento vai como mensagem, para o cliente não ficar sem nada.
      if (result.documento) {
        try {
          await sendDocument(parsed.whatsappNumber, { base64: result.documento.pdf.toString("base64"), fileName: result.documento.fileName, caption: result.documento.mensagemEntrega });
        } catch (err) {
          app.log.error({ err }, "judith.documento.envio.fail");
          const texto = await getUltimaResposta(result.sessionId);
          if (texto) await sendText(parsed.whatsappNumber, texto);
          await sendText(parsed.whatsappNumber, result.documento.mensagemEntrega);
        }
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

async function getUltimaResposta(sessionId?: string): Promise<string | null> {
  if (!sessionId) return null;
  const { prisma } = await import("./db/client.js");
  const m = await prisma.message.findFirst({ where: { sessionId, role: "ASSISTANT" }, orderBy: { createdAt: "desc" } });
  return m?.content ?? null;
}

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
