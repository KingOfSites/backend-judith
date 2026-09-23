import Anthropic from "@anthropic-ai/sdk";
import { ModelTier, User } from "@prisma/client";
import { env } from "../config/env.js";
import { getPromptAnalise, getPromptPrincipal, getPromptRedacao } from "./prompts/principal.js";
import { getBaseConhecimento } from "./conhecimento.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

// As 4 funções da spec (§1); lembretes/coleta ainda passam como dúvida.
export type Funcao = "duvida" | "redacao" | "analise";

export type AskInput = {
  tier: ModelTier;
  funcao: Funcao;
  user: User | null;
  history: ChatTurn[];
  userMessage: string;
};

export type AskOutput = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

function modelIdFor(tier: ModelTier): string {
  return tier === ModelTier.SONNET ? env.JUDITH_MODEL_SONNET : env.JUDITH_MODEL_HAIKU;
}

function userProfileBlock(user: User | null): string {
  if (!user) {
    return "Perfil do usuário: ainda não cadastrado — peça o aceite dos termos e o tipo de empresa antes de responder substantivamente.";
  }
  const linhas: string[] = ["Perfil do usuário:"];
  if (user.nome) linhas.push(`- Nome: ${user.nome}`);
  if (user.tipoEmpresa) linhas.push(`- Tipo: ${user.tipoEmpresa}`);
  if (user.ramo) linhas.push(`- Ramo: ${user.ramo}`);
  if (user.cidade) linhas.push(`- Cidade: ${user.cidade}`);
  linhas.push(`- Plano: ${user.plano}`);
  return linhas.join("\n");
}

export async function askJudith(input: AskInput): Promise<AskOutput> {
  const model = modelIdFor(input.tier);

  // System em blocos, na ordem estático → dinâmico (spec §1/§7):
  //   1. Seção A (sempre, cacheada)
  //   2. Seção B (redação) ou C (análise), sob demanda, também cacheada
  //   3. Até cinco chunks publicados, somente na função duvida
  //   4. Perfil enxuto do usuário — muda por usuário, fica fora do cache
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: await getPromptPrincipal(),
      cache_control: { type: "ephemeral" },
    },
  ];
  if (input.funcao === "redacao") {
    system.push({ type: "text", text: await getPromptRedacao(), cache_control: { type: "ephemeral" } });
  } else if (input.funcao === "analise") {
    system.push({ type: "text", text: await getPromptAnalise(), cache_control: { type: "ephemeral" } });
  }
  const conhecimento = input.funcao === "duvida" ? await getBaseConhecimento(input.userMessage) : "";
  if (conhecimento) {
    system.push({ type: "text", text: conhecimento, cache_control: { type: "ephemeral" } });
  }
  system.push({ type: "text", text: userProfileBlock(input.user) });

  const messages: Anthropic.MessageParam[] = [
    ...input.history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: input.userMessage },
  ];

  const response = await client.messages.create({
    model,
    // Documento redigido ou análise cláusula a cláusula não cabe em 1k tokens.
    max_tokens: input.funcao === "duvida" ? 1024 : 4096,
    system,
    messages,
  });

  const firstBlock = response.content[0];
  const text =
    firstBlock && firstBlock.type === "text" ? firstBlock.text : "";

  const usage = response.usage;
  return {
    text,
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}
