// Cota da dúvida por TEMA, não por mensagem (pedido do fundador, 30/09/2026).
//
// A primeira dúvida da sessão cobra. As mensagens seguintes só cobram se forem uma dúvida
// nova: continuação do mesmo assunto, resposta às perguntas de coleta da JUDITH ("qual o
// valor?", "tem contrato escrito?") e pedidos de esclarecimento não contam. Quem decide é
// um classificador barato (tier leve). Se ele falhar, não cobra: o cliente nunca paga por
// instabilidade nossa.

import { Llm } from "../llm/client.js";
import { env } from "../config/env.js";
import type { TurnoAnterior } from "../regras/classificador.js";

const client = new Llm();

// Usado enquanto o fundador não salvar o prompt dele em Regras → Classificadores.
export const PROMPT_DUVIDA_RESERVA = `Voce decide se a nova mensagem de um usuario da assistente juridica JUDITH continua a MESMA duvida em andamento ou abre uma duvida NOVA.
Devolva APENAS um JSON (sem texto antes ou depois, sem cercas de markdown): {"mesma": true} ou {"mesma": false}

Conta como MESMA duvida (mesma: true):
- resposta a uma pergunta que a JUDITH fez para entender o caso (valor, datas, se tem contrato, quantos funcionarios...);
- pedido de esclarecimento, exemplo, "e se...", "como assim", "e no meu caso";
- detalhe novo do mesmo caso ou do mesmo assunto;
- agradecimento, confirmacao ou comentario sobre a resposta.

Conta como duvida NOVA (mesma: false):
- assunto diferente do que estava sendo tratado (outro tema, outra situacao, outra pessoa envolvida);
- pergunta que se sustenta sozinha e nao depende do que foi dito antes.

Na duvida, responda {"mesma": true}.`;

function extrairMesma(texto: string): boolean | null {
  const limpo = texto.replace(/```(?:json)?/gi, "").trim();
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) return null;
  try {
    const valor = JSON.parse(limpo.slice(inicio, fim + 1)) as { mesma?: unknown };
    return typeof valor.mesma === "boolean" ? valor.mesma : null;
  } catch {
    return null;
  }
}

export type DecisaoCota = { mesma: boolean; origem: "classificador" | "falha" };

export async function ehMesmaDuvida(config: Record<string, string>, tema: string, texto: string, anteriores: TurnoAnterior[]): Promise<DecisaoCota> {
  const system = config.classificadorDuvida?.trim() || PROMPT_DUVIDA_RESERVA;
  const ultimas = anteriores.slice(-4).map(t => `${t.role === "user" ? "Usuario" : "JUDITH"}: ${t.content.slice(0, 500)}`).join("\n");
  const user = `Duvida em andamento (primeira mensagem do tema):\n${tema.slice(0, 800)}\n\n${ultimas ? `Ultimas mensagens:\n${ultimas}\n\n` : ""}Nova mensagem do usuario:\n${texto.slice(0, 2000)}`;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const response = await client.messages.create({ model: env.JUDITH_MODEL_HAIKU, max_tokens: 30, temperature: 0, system, messages: [{ role: "user", content: user }] });
      const primeiro = response.content[0];
      const mesma = extrairMesma(primeiro?.type === "text" ? primeiro.text : "");
      if (mesma !== null) return { mesma, origem: "classificador" };
    } catch {
      // tenta de novo; esgotando, não cobra
    }
  }
  return { mesma: true, origem: "falha" };
}
