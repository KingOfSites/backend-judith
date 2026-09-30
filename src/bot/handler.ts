// Pipeline multi-tenant: webhook chega com um `instance` qualquer,
// resolvemos qual Bot é, carregamos a config (persona) do cliente
// e respondemos com essa persona.

import { Llm } from "../llm/client.js";
import { paraWhatsApp } from "../evolution/format.js";
import axios from "axios";
import { Bot, BotConfig, MensagemDirecao, ModelTier } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";

const anthropic = new Llm();

const SESSION_IDLE_MIN = 60;
const TURN_WINDOW = 8;

function modelIdFor(tier: ModelTier): string {
  // Bots dos clientes podem ter modelos próprios; sem configuração seguem os da JUDITH.
  return tier === "SONNET"
    ? (env.BOT_MODEL_SONNET ?? env.JUDITH_MODEL_SONNET)
    : (env.BOT_MODEL_HAIKU ?? env.JUDITH_MODEL_HAIKU);
}

function montarSystem(bot: Bot, config: BotConfig | null): string {
  if (!config) {
    return `Você é um assistente virtual chamado "${bot.nome}". Atenda com cortesia e seja útil.`;
  }
  const partes = [
    `Você é o atendente virtual deste negócio: ${bot.nome}.`,
    "",
    "**Quem você é / o que faz:**",
    config.persona,
    "",
    `**Tom de voz:** ${config.tom}`,
  ];
  if (config.instrucoes && config.instrucoes.trim().length > 0) {
    partes.push("", "**Instruções extras do dono do negócio:**", config.instrucoes);
  }
  partes.push(
    "",
    "**Regras fixas:**",
    "- Responda como se fosse um atendente real do negócio, não um robô.",
    "- Se não souber algo específico do negócio (preço, horário, endereço), seja honesto e ofereça encaminhar pra um atendente humano.",
    "- Responda no estilo WhatsApp: direto, sem introdução longa, sem repetir o que o cliente disse.",
    "- Uma pergunta por vez."
  );
  return partes.join("\n");
}

type TurnoIA = { role: "user" | "assistant"; content: string };

async function carregarHistorico(conversaId: string): Promise<TurnoIA[]> {
  const msgs = await prisma.mensagemBot.findMany({
    where: { conversaId },
    orderBy: { createdAt: "desc" },
    take: TURN_WINDOW * 2,
  });
  return msgs.reverse().map((m) => ({
    role: m.direcao === MensagemDirecao.IN ? "user" : "assistant",
    content: m.conteudo,
  }));
}

async function getOrCreateLead(botId: string, numero: string, pushName?: string) {
  return prisma.lead.upsert({
    where: { botId_whatsappNumero: { botId, whatsappNumero: numero } },
    update: pushName ? { pushName } : {},
    create: { botId, whatsappNumero: numero, pushName },
  });
}

async function getOrCreateConversa(botId: string, leadId: string) {
  const cutoff = new Date(Date.now() - SESSION_IDLE_MIN * 60_000);
  const recente = await prisma.conversa.findFirst({
    where: { botId, leadId, fechada: false, lastSeenAt: { gte: cutoff } },
    orderBy: { lastSeenAt: "desc" },
  });
  if (recente) return recente;
  return prisma.conversa.create({ data: { botId, leadId } });
}

async function enviarTexto(instanceName: string, numero: string, texto: string) {
  await axios.post(
    `${env.EVOLUTION_API_URL}/message/sendText/${instanceName}`,
    { number: numero, text: paraWhatsApp(texto) },
    { headers: { apikey: env.EVOLUTION_API_KEY }, timeout: 15_000 }
  );
}

export async function processarMensagemBot(input: {
  instanceName: string;
  fromNumero: string;
  fromPushName?: string;
  texto: string;
}) {
  const bot = await prisma.bot.findUnique({
    where: { instanceName: input.instanceName },
    include: { config: true },
  });
  if (!bot) {
    // Instância não cadastrada — ignora
    return { skipped: "bot_nao_cadastrado" as const };
  }

  // Marca como ATIVO se ainda estava PAREANDO
  if (bot.status !== "ATIVO") {
    await prisma.bot.update({
      where: { id: bot.id },
      data: { status: "ATIVO", whatsappNumero: bot.whatsappNumero ?? input.fromNumero },
    });
  }

  const lead = await getOrCreateLead(bot.id, input.fromNumero, input.fromPushName);
  const conversa = await getOrCreateConversa(bot.id, lead.id);
  const historico = await carregarHistorico(conversa.id);

  const system = montarSystem(bot, bot.config);
  const tier = bot.config?.modelo ?? ModelTier.HAIKU;
  const model = modelIdFor(tier);

  const resp = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [
      ...historico.map((t) => ({ role: t.role, content: t.content })),
      { role: "user" as const, content: input.texto },
    ],
  });

  const primeiroBloco = resp.content[0];
  const respostaTexto =
    primeiroBloco && primeiroBloco.type === "text" ? primeiroBloco.text : "Desculpa, não consegui responder agora.";

  await prisma.$transaction([
    prisma.mensagemBot.create({
      data: { conversaId: conversa.id, direcao: MensagemDirecao.IN, conteudo: input.texto },
    }),
    prisma.mensagemBot.create({
      data: {
        conversaId: conversa.id,
        direcao: MensagemDirecao.OUT,
        conteudo: respostaTexto,
        modelo: tier,
        inputTokens: resp.usage.input_tokens,
        outputTokens: resp.usage.output_tokens,
        cacheReadTokens: resp.usage.cache_read_input_tokens ?? 0,
      },
    }),
    prisma.conversa.update({
      where: { id: conversa.id },
      data: { lastSeenAt: new Date() },
    }),
  ]);

  await enviarTexto(input.instanceName, input.fromNumero, respostaTexto);

  return {
    ok: true as const,
    botId: bot.id,
    conversaId: conversa.id,
    modelo: tier,
  };
}
