// Leitura das Regras de Composição/Análise, da tabela tipo → ficha e dos prompts
// dos classificadores. Tudo editado pelo fundador no Admin; aqui é só leitura.
//
// Cache de 60s (mesmo do prompt): o que ele salva vale em até 1 minuto, sem
// ninguém rodar nada no meio e sem reiniciar o bot.

import { prisma } from "../db/client.js";

export type Conjunto = "COMPOSICAO" | "ANALISE";

export type Regra = {
  id: string;
  conjunto: Conjunto;
  codigo: string;
  titulo: string;
  grupo: string;
  entraSempre: boolean;
  conteudo: string;
  ordem: number;
  updatedAt: Date;
};

export type TipoDoc = {
  etiqueta: string;
  nome: string;
  composicao: string[];
  analise: string[];
  composicaoExtras: string[];
  analiseExtras: string[];
  desviaRedacao: boolean;
  mensagemDesvio: string | null;
};

export type RegrasSnapshot = {
  regras: Regra[];
  tipos: TipoDoc[];
  config: Record<string, string>;
  // Regras ligadas = existe pelo menos um tipo ativo cadastrado.
  habilitadas: boolean;
};

const TTL_MS = 60_000;
let cache: { snapshot: RegrasSnapshot; expiraEm: number } | null = null;

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string" && v.trim() !== "").map(v => v.trim()) : [];
}

export async function carregarRegras(): Promise<RegrasSnapshot> {
  if (cache && Date.now() < cache.expiraEm) return cache.snapshot;

  const [regras, tipos, config] = await Promise.all([
    prisma.regraDocumento.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { codigo: "asc" }] }),
    prisma.tipoDocumento.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { etiqueta: "asc" }] }),
    prisma.regraConfig.findMany(),
  ]);

  const snapshot: RegrasSnapshot = {
    regras: regras.map(r => ({
      id: r.id, conjunto: r.conjunto, codigo: r.codigo, titulo: r.titulo, grupo: r.grupo,
      entraSempre: r.entraSempre, conteudo: r.conteudo, ordem: r.ordem, updatedAt: r.updatedAt,
    })),
    tipos: tipos.map(t => ({
      etiqueta: t.etiqueta, nome: t.nome,
      composicao: lista(t.composicao), analise: lista(t.analise),
      composicaoExtras: lista(t.composicaoExtras), analiseExtras: lista(t.analiseExtras),
      desviaRedacao: t.desviaRedacao, mensagemDesvio: t.mensagemDesvio,
    })),
    config: Object.fromEntries(config.map(c => [c.chave, c.valor])),
    habilitadas: tipos.length > 0,
  };
  cache = { snapshot, expiraEm: Date.now() + TTL_MS };
  return snapshot;
}

export function limparCacheRegras(): void {
  cache = null;
}

export const CONFIG_CLASSIFICADOR_TIPO = "classificadorTipo";
export const CONFIG_CLASSIFICADOR_TURNO = "classificadorTurno";
export const CONFIG_MENSAGEM_DESVIO = "mensagemDesvioPadrao";
