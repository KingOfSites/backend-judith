// Leitura de PDF e imagem enviados no WhatsApp: o modelo multimodal transcreve o texto e o
// pipeline segue como se o cliente tivesse colado o documento. Conta páginas e caracteres
// (vão para Message.meta). Se a leitura falhar, nada é cobrado: a cota só é consumida depois
// que a JUDITH responde (registrarUso roda na transação da resposta).

import { env } from "../config/env.js";

export const LIMITE_PAGINAS = 20;
export const LIMITE_CARACTERES = 60_000;
const LIMITE_BYTES = 15 * 1024 * 1024;
const MIMES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export type Leitura = { texto: string; paginas: number | null; caracteres: number; modelo: string; mimetype: string };
export type LeituraCodigo = "TIPO_NAO_SUPORTADO" | "GRANDE_DEMAIS" | "SEM_TEXTO" | "FALHA";

export class LeituraError extends Error {
  constructor(public code: LeituraCodigo, message: string) { super(message); }
}

// Mensagens para o cliente por motivo. A de anexo genérico (configurável no Admin) vale para FALHA.
export const MENSAGEM_LEITURA: Record<Exclude<LeituraCodigo, "FALHA">, string> = {
  TIPO_NAO_SUPORTADO: "Consigo ler PDF e foto (JPG ou PNG). Esse arquivo veio em outro formato. Pode mandar como PDF ou uma foto nítida do documento? 🙂",
  GRANDE_DEMAIS: `Esse documento é grande demais pra eu ler de uma vez (o limite é ${LIMITE_PAGINAS} páginas). Pode mandar só as páginas que importam, ou dividir em partes? Nada foi descontado da sua cota.`,
  SEM_TEXTO: "Recebi o arquivo, mas não consegui encontrar texto legível nele. Se for foto, tenta tirar com mais luz e o documento inteiro no quadro. Nada foi descontado da sua cota. 🙂",
};

export function normalizarMime(mimetype: string | undefined, fileName?: string): string {
  const base = (mimetype ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "image/jpg") return "image/jpeg";
  if ((!base || base === "application/octet-stream") && fileName && /\.pdf$/i.test(fileName)) return "application/pdf";
  return base;
}

// Contagem aproximada pelo objeto /Type /Page do PDF (sem parser). Serve para o teto e o meta.
export function contarPaginasPdf(buffer: Buffer): number | null {
  const amostra = buffer.toString("latin1");
  const n = (amostra.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  return n > 0 ? n : null;
}

const PROMPT = "Transcreva integralmente o texto deste documento, em português, mantendo a ordem, os títulos, a numeração de cláusulas e os parágrafos. Não resuma, não comente, não traduza e não acrescente nada. Se não houver texto legível, responda exatamente: SEM_TEXTO";

async function transcrever(base64: string, mimetype: string): Promise<{ texto: string; modelo: string }> {
  if (!env.GEMINI_API_KEY) throw new LeituraError("FALHA", "GEMINI_API_KEY ausente");
  let ultimoErro = "";
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.JUDITH_MODEL_LEITURA)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ inlineData: { mimeType: mimetype, data: base64 } }, { text: PROMPT }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 24_000, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(120_000),
      });
      const raw = await response.text();
      if (!response.ok) {
        ultimoErro = `Gemini ${response.status}`;
        if (response.status === 429 || response.status >= 500) { await new Promise(r => setTimeout(r, 5_000)); continue; }
        throw new LeituraError("FALHA", `${ultimoErro}: ${raw.slice(0, 200)}`);
      }
      const data = JSON.parse(raw) as { modelVersion?: string; candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const texto = (data.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? "").join("").trim();
      return { texto, modelo: data.modelVersion ?? env.JUDITH_MODEL_LEITURA };
    } catch (error) {
      if (error instanceof LeituraError) throw error;
      ultimoErro = error instanceof Error ? error.message : String(error);
    }
  }
  throw new LeituraError("FALHA", ultimoErro || "leitura indisponível");
}

export async function lerDocumento(base64: string, mimetype: string | undefined, fileName?: string): Promise<Leitura> {
  const mime = normalizarMime(mimetype, fileName);
  if (!MIMES.has(mime)) throw new LeituraError("TIPO_NAO_SUPORTADO", `tipo ${mime || "desconhecido"}`);
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > LIMITE_BYTES) throw new LeituraError("GRANDE_DEMAIS", `${buffer.length} bytes`);
  const paginas = mime === "application/pdf" ? contarPaginasPdf(buffer) : null;
  if (paginas !== null && paginas > LIMITE_PAGINAS) throw new LeituraError("GRANDE_DEMAIS", `${paginas} páginas`);

  const { texto, modelo } = await transcrever(base64, mime);
  const limpo = texto.replace(/^```[a-z]*\n?|```$/g, "").trim();
  if (!limpo || /^SEM_TEXTO\b/.test(limpo) || limpo.length < 20) throw new LeituraError("SEM_TEXTO", "sem texto legível");
  if (limpo.length > LIMITE_CARACTERES) throw new LeituraError("GRANDE_DEMAIS", `${limpo.length} caracteres`);
  return { texto: limpo, paginas, caracteres: limpo.length, modelo, mimetype: mime };
}

// Monta a mensagem que entra no pipeline: legenda do cliente (se houver) + o documento lido.
export function montarMensagemComDocumento(legenda: string, leitura: Leitura, fileName?: string): string {
  const pedido = legenda.trim() || "Analisa este documento pra mim, por favor.";
  const cabecalho = `Documento enviado${fileName ? ` (${fileName})` : ""}${leitura.paginas ? `, ${leitura.paginas} página(s)` : ""}:`;
  return `${pedido}\n\n${cabecalho}\n"""\n${leitura.texto}\n"""`;
}
