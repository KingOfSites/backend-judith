// Prompt único da JUDITH — antes carregado do arquivo entregue pelo fundador
// (prompts/JUDITH-prompt-unico-PRODUCAO.md), agora vem da tabela PromptConfig
// (linha singleton "PRINCIPAL"), editável pelo painel admin-judith.
//
// Cache de 60s em memória: evita 1 SELECT por mensagem, e ainda deixa uma
// edição no painel valer dentro de 1 minuto, sem precisar reiniciar o processo.
//
// Seção A → injetada em toda conversa (bloco estático, cacheado no Claude).
// Seção B → só em redação de documento.  Seção C → só em análise de contrato.
// A ordem estático → dinâmico é o que ativa o prompt caching (spec §1 e §7).

import { prisma } from "../../db/client.js";

type Secoes = { A: string; B: string; C: string; versao: string };

const TTL_MS = 60_000;
let cache: { secoes: Secoes; expiraEm: number } | null = null;

async function carregarSecoes(): Promise<Secoes> {
  if (cache && Date.now() < cache.expiraEm) return cache.secoes;

  const row = await prisma.promptConfig.findUnique({ where: { chave: "PRINCIPAL" } });
  if (!row) {
    throw new Error(
      "PromptConfig 'PRINCIPAL' não encontrado no banco — rode o seed ou crie pelo painel admin-judith."
    );
  }

  for (const texto of [row.secaoA, row.secaoB, row.secaoC]) {
    if (texto.trim().length < 1000 || /\[Cole aqui/i.test(texto)) {
      throw new Error("PromptConfig inválido: as três seções devem conter o prompt real (mínimo de 1000 caracteres).");
    }
  }
  const secoes: Secoes = { A: row.secaoA, B: row.secaoB, C: row.secaoC, versao: row.versao };
  cache = { secoes, expiraEm: Date.now() + TTL_MS };
  return secoes;
}

/** Versão do prompt em uso (campo livre, definido pelo fundador no painel). */
export async function getPromptVersao(): Promise<string> {
  return (await carregarSecoes()).versao;
}

/** Seção A — Prompt Principal. Ativo em todas as conversas. */
export async function getPromptPrincipal(): Promise<string> {
  return (await carregarSecoes()).A;
}

// Text and version must come from the same cached snapshot.
export async function getPrincipalSnapshot() {
  const sections = await carregarSecoes();
  return { text: sections.A, version: sections.versao };
}
/** Seção B — Redação de documentos. Só quando o usuário pede pra redigir. */
export async function getPromptRedacao(): Promise<string> {
  return (await carregarSecoes()).B;
}
/** Seção C — Análise de contratos. Só quando o usuário envia contrato pra analisar. */
export async function getPromptAnalise(): Promise<string> {
  return (await carregarSecoes()).C;
}
