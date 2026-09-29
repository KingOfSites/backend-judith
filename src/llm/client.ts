// Camada única de chamada de modelo.
//
// Os pontos de chamada do sistema falam o formato "messages" (system em blocos,
// ferramenta forçada para saída estruturada, uso de tokens). Esta camada recebe esse
// formato e despacha para o fornecedor certo, olhando só o id do modelo:
//
//   gemini-*  → Google (dúvida, classificadores, lembretes/coleta)
//   gpt-*     → OpenAI (análise e redação; e o fallback gpt-4.1-mini)
//   claude-*  → Anthropic (mantido para os bots dos clientes e para os testes)
//
// Resiliência (spec §7): em 429/5xx tenta de novo com espera crescente e, esgotando,
// troca de fornecedor para o modelo de fallback. Nunca inventa resposta.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env } from "../config/env.js";

export type LlmTextBlock = { type: "text"; text: string; cache_control?: unknown };
export type LlmMessage = { role: "user" | "assistant"; content: string | { type: string; text?: string }[] };
export type LlmTool = { name: string; description?: string; input_schema: Record<string, unknown> };

export type LlmRequest = {
  model: string;
  max_tokens: number;
  temperature?: number;
  system?: string | LlmTextBlock[];
  messages: LlmMessage[];
  tools?: LlmTool[];
  tool_choice?: { type: "tool"; name: string } | { type: "auto" } | { type: "any" };
};

export type LlmContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown };

export type LlmResponse = {
  id: string;
  model: string;
  content: LlmContentBlock[];
  stop_reason: "end_turn" | "max_tokens" | "tool_use" | string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  };
  // Preenchido quando a resposta veio do modelo de fallback.
  fallback?: { from: string; reason: string };
};

export type LlmOptions = { timeout?: number; maxRetries?: number };

export type Fornecedor = "google" | "openai" | "anthropic";

export function fornecedorDe(model: string): Fornecedor {
  if (/^gemini/i.test(model)) return "google";
  if (/^(gpt|o\d|chatgpt)/i.test(model)) return "openai";
  return "anthropic";
}

class LlmHttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function transitorio(error: unknown): boolean {
  const status = error && typeof error === "object" && "status" in error ? Number((error as { status: unknown }).status) : 0;
  if (status === 429 || status >= 500) return true;
  const nome = error instanceof Error ? error.name : "";
  // Timeout e queda de conexão também contam como instabilidade do fornecedor.
  return status === 0 && /abort|timeout|fetch failed|ECONNRESET|ETIMEDOUT/i.test(`${nome} ${error instanceof Error ? error.message : ""}`);
}

const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
// Espera crescente entre tentativas (~5s → 15s na spec). Objeto mutável só para os testes zerarem.
export const ESPERAS_MS = [5_000, 15_000];
export const retry = { esperasMs: ESPERAS_MS };

function textoDe(content: LlmMessage["content"]): string {
  if (typeof content === "string") return content;
  return content.map(b => (b.type === "text" && typeof b.text === "string" ? b.text : "")).filter(Boolean).join("\n\n");
}

function systemDe(system: LlmRequest["system"]): string {
  if (!system) return "";
  if (typeof system === "string") return system;
  // A ordem dos blocos é preservada: estático → dinâmico, que é o que ativa o cache de prefixo.
  return system.map(b => b.text).join("\n\n");
}

// Junta turnos seguidos do mesmo papel: alguns fornecedores exigem alternância.
function turnos(messages: LlmMessage[]): { role: "user" | "assistant"; text: string }[] {
  const saida: { role: "user" | "assistant"; text: string }[] = [];
  for (const m of messages) {
    const text = textoDe(m.content);
    const ultimo = saida[saida.length - 1];
    if (ultimo && ultimo.role === m.role) ultimo.text += "\n\n" + text;
    else saida.push({ role: m.role, text });
  }
  return saida;
}

const ferramentaForcada = (req: LlmRequest) => (req.tool_choice?.type === "tool" ? req.tool_choice.name : undefined);

// ---------------------------------------------------------------- Google

// O schema de parâmetros do Gemini é um subconjunto do JSON Schema: sem additionalProperties.
export function schemaParaGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(schemaParaGemini);
  if (!schema || typeof schema !== "object") return schema;
  const original = schema as Record<string, unknown>;
  // "string ou null" vira o tipo com nullable, que é como o Gemini expressa opcional nulo.
  if (Array.isArray(original.anyOf)) {
    const opcoes = original.anyOf as Record<string, unknown>[];
    const naoNulas = opcoes.filter(o => o?.type !== "null");
    if (naoNulas.length === 1 && naoNulas.length < opcoes.length) {
      const { anyOf: _anyOf, ...resto } = original;
      return { ...(schemaParaGemini({ ...resto, ...naoNulas[0] }) as Record<string, unknown>), nullable: true };
    }
  }
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(original)) {
    if (chave === "additionalProperties" || chave === "$schema") continue;
    saida[chave] = chave === "properties" && valor && typeof valor === "object"
      ? Object.fromEntries(Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, schemaParaGemini(v)]))
      : schemaParaGemini(valor);
  }
  return saida;
}

export const MARGEM_RACIOCINIO_GEMINI = 1024;

async function chamarGoogle(req: LlmRequest, options: LlmOptions): Promise<LlmResponse> {
  if (!env.GEMINI_API_KEY) throw new LlmHttpError(401, "GEMINI_API_KEY ausente");
  const system = systemDe(req.system);
  const forcada = ferramentaForcada(req);
  const body: Record<string, unknown> = {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: turnos(req.messages).map(t => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] })),
    generationConfig: {
      // O raciocínio conta no limite de saída. Sem a margem, um limite pequeno (ex.: 40 no
      // classificador) é consumido inteiro pensando e a resposta volta vazia.
      maxOutputTokens: req.max_tokens + MARGEM_RACIOCINIO_GEMINI,
      ...(req.temperature === undefined ? {} : { temperature: req.temperature }),
      // Pegadinha da spec: thinking no automático estoura tokens em texto grande. No Gemini 3.x
      // o zero reduz mas não elimina (medido: 35 a 45 tokens residuais), daí a margem acima.
      thinkingConfig: { thinkingBudget: 0 },
    },
    ...(req.tools?.length
      ? {
          tools: [{ functionDeclarations: req.tools.map(t => ({ name: t.name, description: t.description ?? "", parameters: schemaParaGemini(t.input_schema) })) }],
          toolConfig: { functionCallingConfig: forcada ? { mode: "ANY", allowedFunctionNames: [forcada] } : { mode: req.tool_choice?.type === "any" ? "ANY" : "AUTO" } },
        }
      : {}),
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeout ?? 60_000),
  });
  const raw = await response.text();
  if (!response.ok) throw new LlmHttpError(response.status, `Gemini ${response.status}: ${raw.slice(0, 300)}`);

  const data = JSON.parse(raw) as {
    responseId?: string; modelVersion?: string;
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; functionCall?: { name: string; args?: unknown } }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; cachedContentTokenCount?: number; thoughtsTokenCount?: number };
  };
  const candidato = data.candidates?.[0];
  const content: LlmContentBlock[] = [];
  for (const [i, parte] of (candidato?.content?.parts ?? []).entries()) {
    if (parte.functionCall) content.push({ type: "tool_use", id: `${data.responseId ?? "gemini"}-${i}`, name: parte.functionCall.name, input: parte.functionCall.args ?? {} });
    else if (typeof parte.text === "string" && parte.text) content.push({ type: "text", text: parte.text });
  }
  // Resposta bloqueada ou vazia não é resposta: trata como falha do fornecedor.
  if (!content.length) throw new LlmHttpError(502, `Gemini sem conteúdo (finishReason=${candidato?.finishReason ?? "ausente"})`);

  const cached = data.usageMetadata?.cachedContentTokenCount ?? 0;
  const prompt = data.usageMetadata?.promptTokenCount ?? 0;
  return {
    id: data.responseId ?? "",
    model: data.modelVersion ?? req.model,
    content,
    stop_reason: candidato?.finishReason === "MAX_TOKENS" ? "max_tokens" : content.some(b => b.type === "tool_use") ? "tool_use" : "end_turn",
    usage: {
      input_tokens: Math.max(0, prompt - cached),
      output_tokens: (data.usageMetadata?.candidatesTokenCount ?? 0) + (data.usageMetadata?.thoughtsTokenCount ?? 0),
      cache_read_input_tokens: cached,
      cache_creation_input_tokens: 0,
    },
  };
}

// ---------------------------------------------------------------- OpenAI

let openai: OpenAI | null = null;

async function chamarOpenAI(req: LlmRequest, options: LlmOptions): Promise<LlmResponse> {
  if (!env.OPENAI_API_KEY) throw new LlmHttpError(401, "OPENAI_API_KEY ausente");
  // As tentativas são controladas aqui, não pelo SDK, para o fallback enxergar a falha.
  openai ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 0 });
  const system = systemDe(req.system);
  const forcada = ferramentaForcada(req);

  const response = await openai.chat.completions.create(
    {
      model: req.model,
      max_tokens: req.max_tokens,
      ...(req.temperature === undefined ? {} : { temperature: req.temperature }),
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        ...turnos(req.messages).map(t => ({ role: t.role, content: t.text })),
      ],
      ...(req.tools?.length
        ? {
            tools: req.tools.map(t => ({ type: "function" as const, function: { name: t.name, description: t.description ?? "", parameters: t.input_schema } })),
            tool_choice: forcada ? { type: "function" as const, function: { name: forcada } } : req.tool_choice?.type === "any" ? ("required" as const) : ("auto" as const),
          }
        : {}),
    },
    { timeout: options.timeout ?? 120_000 }
  );

  const escolha = response.choices[0];
  const content: LlmContentBlock[] = [];
  if (escolha?.message.content) content.push({ type: "text", text: escolha.message.content });
  for (const chamada of escolha?.message.tool_calls ?? []) {
    if (chamada.type !== "function") continue;
    let input: unknown;
    try { input = JSON.parse(chamada.function.arguments); }
    catch { throw new LlmHttpError(502, "OpenAI devolveu argumentos de ferramenta que não são JSON"); }
    content.push({ type: "tool_use", id: chamada.id, name: chamada.function.name, input });
  }
  if (!content.length) throw new LlmHttpError(502, `OpenAI sem conteúdo (finish_reason=${escolha?.finish_reason ?? "ausente"})`);

  const cached = response.usage?.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    id: response.id,
    model: response.model,
    content,
    stop_reason: escolha?.finish_reason === "length" ? "max_tokens" : escolha?.finish_reason === "tool_calls" ? "tool_use" : "end_turn",
    usage: {
      input_tokens: Math.max(0, (response.usage?.prompt_tokens ?? 0) - cached),
      output_tokens: response.usage?.completion_tokens ?? 0,
      cache_read_input_tokens: cached,
      cache_creation_input_tokens: 0,
    },
  };
}

// ---------------------------------------------------------------- Anthropic

async function chamarAnthropic(req: LlmRequest, options: LlmOptions): Promise<LlmResponse> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY ?? "", ...(options.timeout ? { timeout: options.timeout } : {}), maxRetries: 0 });
  const response = await client.messages.create(req as unknown as Anthropic.MessageCreateParamsNonStreaming);
  return response as unknown as LlmResponse;
}

// ---------------------------------------------------------------- despacho

async function despachar(req: LlmRequest, options: LlmOptions): Promise<LlmResponse> {
  switch (fornecedorDe(req.model)) {
    case "google": return chamarGoogle(req, options);
    case "openai": return chamarOpenAI(req, options);
    default: return chamarAnthropic(req, options);
  }
}

export async function gerar(req: LlmRequest, options: LlmOptions = {}): Promise<LlmResponse> {
  const tentativas = Math.max(0, options.maxRetries ?? retry.esperasMs.length);
  let ultimo: unknown;
  for (let tentativa = 0; tentativa <= tentativas; tentativa++) {
    try { return await despachar(req, options); }
    catch (error) {
      ultimo = error;
      if (!transitorio(error)) throw error;
      if (tentativa < tentativas) await esperar(retry.esperasMs[Math.min(tentativa, retry.esperasMs.length - 1)] ?? 0);
    }
  }

  // Esgotou: troca de fornecedor, uma vez. Só vale se o fallback for de outro fornecedor.
  const fallback = env.JUDITH_MODEL_FALLBACK;
  if (fallback && fallback !== req.model && fornecedorDe(fallback) !== fornecedorDe(req.model)) {
    const reason = ultimo instanceof Error ? ultimo.message.slice(0, 200) : "falha transitória";
    console.warn(JSON.stringify({ msg: "llm.fallback", from: req.model, to: fallback, reason }));
    const resposta = await despachar({ ...req, model: fallback }, options);
    return { ...resposta, fallback: { from: req.model, reason } };
  }
  throw ultimo;
}

// Mesmo formato de uso do SDK anterior: `new Llm(opções).messages.create(req)`.
export class Llm {
  constructor(private options: LlmOptions & { apiKey?: string } = {}) {}
  messages = { create: (req: LlmRequest) => gerar(req, this.options) };
}
