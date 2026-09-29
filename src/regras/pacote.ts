// Montagem do pacote de regras de cada função (spec §1):
//
//   Redação = Seção A + Seção B + Regras Gerais (sempre) + até 2 receitas do tipo + extras do tipo
//   Análise = Seção A + Seção C + transversais (sempre) + até 2 fichas do tipo + extras do tipo
//   Dúvida  = nada daqui. Cada função recebe só o que é dela.
//
// As Seções A/B/C continuam saindo de PromptConfig; este módulo devolve só as regras.
// Regra inteira, nunca truncada.

import type { Conjunto, Regra, RegrasSnapshot, TipoDoc } from "./repository.js";

// Teto de fichas/receitas por chamada. É limite, não sugestão.
export const TETO_POR_TIPO = 2;
export const TIPO_OUTRO = "outro";

export type FuncaoDocumento = "redacao" | "analise";

export type Pacote = {
  conjunto: Conjunto;
  tipo: string;
  // Bloco estático: o que entra em toda chamada do conjunto. Igual entre tipos, bom pra cache.
  sempre: string;
  // Bloco do tipo: fichas/receitas endereçadas + extras.
  doTipo: string;
  // Rastro para o log: o que subiu e o que a tabela pediu e não existe.
  usadas: { codigo: string; titulo: string; papel: "sempre" | "tipo" | "extra" }[];
  ausentes: string[];
  cortadas: string[];
};

const CONJUNTO: Record<FuncaoDocumento, Conjunto> = { redacao: "COMPOSICAO", analise: "ANALISE" };
const ROTULO: Record<Conjunto, string> = { COMPOSICAO: "Regras de Composição", ANALISE: "Regras de Análise" };

function bloco(r: Regra): string {
  return `## ${r.titulo}\n\n${r.conteudo.trim()}`;
}

export function acharTipo(snapshot: RegrasSnapshot, etiqueta: string | null | undefined): TipoDoc | null {
  if (!etiqueta) return null;
  return snapshot.tipos.find(t => t.etiqueta === etiqueta) ?? null;
}

export function montarPacote(snapshot: RegrasSnapshot, funcao: FuncaoDocumento, etiqueta: string | null): Pacote {
  const conjunto = CONJUNTO[funcao];
  const doConjunto = snapshot.regras.filter(r => r.conjunto === conjunto);
  const porCodigo = new Map(doConjunto.map(r => [r.codigo, r]));
  const tipo = acharTipo(snapshot, etiqueta);

  const usadas: Pacote["usadas"] = [];
  const ausentes: string[] = [];

  const sempre = doConjunto.filter(r => r.entraSempre);
  for (const r of sempre) usadas.push({ codigo: r.codigo, titulo: r.titulo, papel: "sempre" });

  const pedidas = tipo ? (funcao === "redacao" ? tipo.composicao : tipo.analise) : [];
  const extras = tipo ? (funcao === "redacao" ? tipo.composicaoExtras : tipo.analiseExtras) : [];

  // O teto vale mesmo se alguém gravar 3 códigos direto no banco: as excedentes não sobem.
  const dentroDoTeto = pedidas.slice(0, TETO_POR_TIPO);
  const cortadas = pedidas.slice(TETO_POR_TIPO);

  const jaEntrou = new Set(sempre.map(r => r.codigo));
  const doTipo: Regra[] = [];
  const adicionar = (codigo: string, papel: "tipo" | "extra") => {
    const r = porCodigo.get(codigo);
    if (!r) { ausentes.push(codigo); return; }
    if (jaEntrou.has(codigo)) return; // fonte única: nunca duplica o mesmo bloco
    jaEntrou.add(codigo);
    doTipo.push(r);
    usadas.push({ codigo: r.codigo, titulo: r.titulo, papel });
  };
  for (const c of dentroDoTeto) adicionar(c, "tipo");
  for (const c of extras) adicionar(c, "extra");

  const cabecalho = (parte: string) => `# ${ROTULO[conjunto]} — ${parte}\nMaterial de referência do fundador. As regras do prompt continuam valendo.`;

  return {
    conjunto,
    tipo: tipo?.etiqueta ?? TIPO_OUTRO,
    sempre: sempre.length ? [cabecalho("valem para todo documento"), ...sempre.map(bloco)].join("\n\n---\n\n") : "",
    doTipo: doTipo.length ? [cabecalho(`tipo: ${tipo?.nome ?? TIPO_OUTRO}`), ...doTipo.map(bloco)].join("\n\n---\n\n") : "",
    usadas, ausentes, cortadas,
  };
}

// Desvio antes do modelo caro: só na redação.
export function desvioDaRedacao(snapshot: RegrasSnapshot, funcao: FuncaoDocumento, etiqueta: string | null): { mensagem: string } | null {
  if (funcao !== "redacao") return null;
  const tipo = acharTipo(snapshot, etiqueta);
  if (!tipo?.desviaRedacao) return null;
  const mensagem = tipo.mensagemDesvio?.trim() || snapshot.config.mensagemDesvioPadrao?.trim() || MENSAGEM_DESVIO_RESERVA;
  return { mensagem };
}

// Só usada se o fundador não tiver definido nem a mensagem do tipo nem a padrão.
export const MENSAGEM_DESVIO_RESERVA =
  "Esse tipo de documento eu não redijo: ele exige um profissional especializado. O caminho mais seguro é um advogado ou contador de confiança. Se quiser, posso te explicar o que é importante levar decidido pra essa conversa.";
