import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  PUBLIC_URL: z.string().url().default("http://localhost:3000"),

  // Modelos por função (spec §1). O fornecedor sai do id do modelo: gemini-*, gpt-* ou claude-*.
  //   tier leve  (HAIKU no banco)  → dúvida, classificadores, lembretes/coleta
  //   tier forte (SONNET no banco) → análise e redação
  JUDITH_MODEL_HAIKU: z.string().default("gemini-3.8-flash"),
  JUDITH_MODEL_SONNET: z.string().default("gpt-4.1"),
  // Troca de fornecedor quando o principal cai (429/5xx após as tentativas).
  JUDITH_MODEL_FALLBACK: z.string().default("gpt-4.1-mini"),
  // Bots dos clientes do site. Sem valor, seguem os modelos da JUDITH.
  BOT_MODEL_HAIKU: z.string().optional(),
  BOT_MODEL_SONNET: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  DATABASE_URL: z.string().min(1),

  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_INSTANCE: z.string().min(1),

  OPENAI_API_KEY: z.string().optional(),
  LOCAL_EMBEDDINGS_URL: z.string().url().default("http://embeddings:8080"),
  KNOWLEDGE_WORKER_ENABLED: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  JUDITH_DOMAIN: z.string().default("judith.com.br"),
  // Sobrescreve a URL dos termos/privacidade (útil em dev com ngrok).
  // Se não definido, usa https://{JUDITH_DOMAIN}/termos
  URL_TERMOS: z.string().url().optional(),

  // Compra avulsa (porta de entrada / pós-cota) — chama o web-judith, que tem
  // as credenciais do Mercado Pago. Mesma INTERNAL_API_KEY configurada lá.
  WEB_JUDITH_URL: z.string().url().default("https://web-judith.vercel.app"),
  INTERNAL_API_KEY: z.string().min(1, "INTERNAL_API_KEY obrigatória (mesma do web-judith)"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Erro nas variáveis de ambiente:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// Cada modelo configurado precisa da chave do fornecedor dele. Falha na subida, não na conversa.
const CHAVE_DO_FORNECEDOR: [RegExp, "GEMINI_API_KEY" | "OPENAI_API_KEY" | "ANTHROPIC_API_KEY"][] = [
  [/^gemini/i, "GEMINI_API_KEY"],
  [/^(gpt|o\d|chatgpt)/i, "OPENAI_API_KEY"],
  [/./, "ANTHROPIC_API_KEY"],
];
const faltando = new Set<string>();
for (const nome of ["JUDITH_MODEL_HAIKU", "JUDITH_MODEL_SONNET", "JUDITH_MODEL_FALLBACK", "BOT_MODEL_HAIKU", "BOT_MODEL_SONNET"] as const) {
  const modelo = parsed.data[nome];
  if (!modelo) continue;
  const chave = CHAVE_DO_FORNECEDOR.find(([padrao]) => padrao.test(modelo))![1];
  if (!parsed.data[chave]) faltando.add(`${chave} (exigida por ${nome}=${modelo})`);
}
if (faltando.size) {
  console.error("Erro nas variáveis de ambiente: falta a chave do fornecedor:", [...faltando].join("; "));
  process.exit(1);
}

export const env = parsed.data;
