// Classificadores baratos (Haiku) que rodam ANTES do modelo caro.
//
//   - Tipo de documento: devolve a etiqueta que alimenta a tabela tipo → ficha.
//   - Turno: com fluxo aberto, diz se a mensagem continua o fluxo, pede redação,
//     pede análise, é uma dúvida nova ou abandona.
//
// Regras de chamada (spec §2): temperatura 0 e parse com remoção de cercas ```json.
// Os prompts são conteúdo editável pelo Admin (RegraConfig), nunca chumbados aqui.

import { Llm } from "../llm/client.js";
import { env } from "../config/env.js";
import { TIPO_OUTRO } from "./pacote.js";
import type { RegrasSnapshot } from "./repository.js";

const client = new Llm();

export type TurnoAnterior = { role: "user" | "assistant"; content: string };
export type Turno = "continua" | "redacao" | "analise" | "nova_duvida" | "abandona";
const TURNOS: Turno[] = ["continua", "redacao", "analise", "nova_duvida", "abandona"];

// Usado só enquanto o fundador não salvar o prompt dele pelo Admin.
export const PROMPT_TIPO_RESERVA = `Voce e um classificador de TIPO DE DOCUMENTO para a assistente juridica JUDITH.
O usuario pediu a redacao de um documento OU enviou um documento para analise.
Devolva APENAS um JSON (sem texto antes ou depois, sem cercas de markdown): {"tipo": "<etiqueta>"}

Classifique pela FUNCAO e pelo CONTEUDO, nunca pelo NOME que o usuario da ao documento.
Quando nenhuma etiqueta servir com clareza, use "outro". NAO force a etiqueta mais proxima.`;

export const PROMPT_TURNO_RESERVA = `Voce classifica UM turno de conversa da assistente juridica JUDITH.
Existe um fluxo aberto nesta conversa (redacao de documento ou analise de documento).
Devolva APENAS um JSON (sem texto antes ou depois, sem cercas de markdown): {"turno": "<valor>"}

Valores validos:
- continua: a mensagem responde ou segue o fluxo aberto (dados pedidos, confirmacao, ajuste, pergunta sobre o proprio documento).
- redacao: o usuario pede que o texto seja ESCRITO (clausula pronta, documento, "escreve pra mim", "monta isso", "redige").
- analise: o usuario pede que um documento seja ANALISADO ou revisado.
- nova_duvida: pergunta juridica nova, sem relacao com o documento do fluxo.
- abandona: o usuario desiste do fluxo ("deixa pra la", "nao precisa mais", "esquece").

Se o fluxo aberto ja for o mesmo que o usuario pede, responda "continua".`;

function extrairJson(texto: string): Record<string, unknown> | null {
  const limpo = texto.replace(/```(?:json)?/gi, "").trim();
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) return null;
  try {
    const valor = JSON.parse(limpo.slice(inicio, fim + 1));
    return valor && typeof valor === "object" ? valor as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function contexto(anteriores: TurnoAnterior[]): string {
  const ultimas = anteriores.slice(-4);
  if (!ultimas.length) return "";
  return "Mensagens anteriores (so contexto, nao classifique estas):\n" +
    ultimas.map(t => `${t.role === "user" ? "Usuario" : "JUDITH"}: ${t.content.slice(0, 600)}`).join("\n") + "\n\n";
}

async function chamar(system: string, user: string): Promise<string> {
  const response = await client.messages.create({
    model: env.JUDITH_MODEL_HAIKU,
    max_tokens: 60,
    temperature: 0,
    system,
    messages: [{ role: "user", content: user }],
  });
  const primeiro = response.content[0];
  return primeiro?.type === "text" ? primeiro.text : "";
}

export type ClassificacaoTipo = { tipo: string; origem: "classificador" | "reserva_outro"; bruto?: string };

// Devolve sempre uma etiqueta ativa da tabela, ou "outro". Etiqueta desconhecida vira
// "outro": ficha errada é pior que ficha nenhuma.
export async function classificarTipo(snapshot: RegrasSnapshot, texto: string, anteriores: TurnoAnterior[] = []): Promise<ClassificacaoTipo> {
  const etiquetas = snapshot.tipos.map(t => t.etiqueta);
  const base = snapshot.config.classificadorTipo?.trim() || PROMPT_TIPO_RESERVA;
  // A lista de etiquetas válidas acompanha a tabela: criar tipo novo no Admin já vale aqui.
  const system = `${base}\n\nEtiquetas ativas na tabela de tipos (use exatamente uma delas ou "outro"):\n${[...etiquetas, TIPO_OUTRO].filter((e, i, a) => a.indexOf(e) === i).join(", ")}`;
  const user = `${contexto(anteriores)}Mensagem a classificar:\n${texto.slice(0, 6000)}`;

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const bruto = await chamar(system, user);
    const valor = extrairJson(bruto)?.tipo;
    if (typeof valor === "string") {
      const etiqueta = valor.trim().toLowerCase();
      if (etiquetas.includes(etiqueta)) return { tipo: etiqueta, origem: "classificador", bruto };
      return { tipo: TIPO_OUTRO, origem: etiqueta === TIPO_OUTRO ? "classificador" : "reserva_outro", bruto };
    }
  }
  return { tipo: TIPO_OUTRO, origem: "reserva_outro" };
}

export async function classificarTurno(snapshot: RegrasSnapshot, fluxoAberto: "redacao" | "analise", texto: string, anteriores: TurnoAnterior[] = []): Promise<Turno> {
  const base = snapshot.config.classificadorTurno?.trim() || PROMPT_TURNO_RESERVA;
  const system = `${base}\n\nFluxo aberto agora: ${fluxoAberto === "redacao" ? "redacao de documento" : "analise de documento"}.`;
  const user = `${contexto(anteriores)}Mensagem a classificar:\n${texto.slice(0, 3000)}`;

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const valor = extrairJson(await chamar(system, user))?.turno;
    if (typeof valor === "string" && TURNOS.includes(valor.trim().toLowerCase() as Turno)) {
      const turno = valor.trim().toLowerCase() as Turno;
      return turno === fluxoAberto ? "continua" : turno;
    }
  }
  // Sem leitura confiável, não derruba o fluxo: a coleta de um documento segue valendo.
  return "continua";
}
