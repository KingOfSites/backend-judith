// Classificador de INTENÇÃO (tier leve): dúvida, redação, análise ou fora do escopo.
//
// Antes só existiam as palavras-chave do router (src/judith/router.ts). O fundador precisa
// ajustar o critério conforme a base cresce (ex.: "cliente reclamando de serviço" é dúvida de
// consumidor, não recusa), então o prompt é editável no Admin (RegraConfig.classificadorIntencao)
// e a reserva daqui só vale enquanto ele não salvar o dele. Falha do classificador nunca
// derruba o atendimento: cai nas palavras-chave do router.

import { Llm } from "../llm/client.js";
import { env } from "../config/env.js";

const client = new Llm();

export type Intencao = "duvida" | "redacao" | "analise" | "fora_do_escopo";
const INTENCOES: Intencao[] = ["duvida", "redacao", "analise", "fora_do_escopo"];

export const PROMPT_INTENCAO_RESERVA = `Voce classifica a INTENCAO de uma mensagem enviada a JUDITH, assistente juridica e executiva para MEI, pequenas empresas e autonomos no Brasil.
Devolva APENAS um JSON (sem texto antes ou depois, sem cercas de markdown): {"intencao": "<valor>"}

Valores validos:
- duvida: pergunta, relato ou desabafo sobre o negocio da pessoa com algum lado juridico, tributario, trabalhista, de consumo, contrato, cobranca, cliente, fornecedor, funcionario, obrigacao, prazo ou documento. Inclui cliente reclamando de servico, cliente que nao paga, fornecedor que nao entrega, duvida sobre nota fiscal, MEI, Simples, aluguel do ponto, redes sociais do negocio. Em caso de duvida, use "duvida".
- redacao: pede que um documento ou texto seja ESCRITO pela JUDITH (contrato, notificacao, recibo, clausula, declaracao, resposta a cliente, "monta pra mim", "escreve", "redige").
- analise: pede que um documento que a pessoa ja tem seja ANALISADO, revisado ou explicado (contrato que recebeu, clausula que colou na conversa, notificacao ou multa que chegou).
- fora_do_escopo: NAO tem nenhuma relacao com negocio, trabalho, direito, dinheiro, documentos ou obrigacoes (receita de bolo, futebol, piada, poema, tarefa escolar). Use somente quando for claro e completo; mensagem curta ou ambigua ("e agora?", "ok", "entendi") e "duvida".

Nunca classifique como fora_do_escopo por o assunto parecer fora da area juridica estrita: se envolver o dia a dia do negocio da pessoa, e "duvida".`;

export const MENSAGEM_FORA_DO_ESCOPO_RESERVA =
  "Eu cuido da parte jurídica e burocrática do seu negócio: dúvidas sobre clientes, fornecedores, funcionários, contratos, cobranças, impostos e prazos, além de redigir e analisar documentos. Esse assunto fica fora do que eu atendo. 🙂 Se tiver algo do seu negócio, é só mandar.";

export type Anterior = { role: "user" | "assistant"; content: string };
export type ResultadoIntencao = { intencao: Intencao; origem: "classificador" | "falha"; bruto?: string };

function extrairJson(texto: string): Record<string, unknown> | null {
  const limpo = texto.replace(/```(?:json)?/gi, "").trim();
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) return null;
  try {
    const valor = JSON.parse(limpo.slice(inicio, fim + 1));
    return valor && typeof valor === "object" ? (valor as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function contexto(anteriores: Anterior[]): string {
  const ultimas = anteriores.slice(-4);
  if (!ultimas.length) return "";
  return "Mensagens anteriores (so contexto, nao classifique estas):\n" +
    ultimas.map(t => `${t.role === "user" ? "Usuario" : "JUDITH"}: ${t.content.slice(0, 500)}`).join("\n") + "\n\n";
}

// Devolve a intenção lida pelo classificador, ou "falha" (quem chama usa as palavras-chave).
export async function classificarIntencao(config: Record<string, string>, texto: string, anteriores: Anterior[] = []): Promise<ResultadoIntencao> {
  const system = config.classificadorIntencao?.trim() || PROMPT_INTENCAO_RESERVA;
  const user = `${contexto(anteriores)}Mensagem a classificar:\n${texto.slice(0, 4000)}`;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const response = await client.messages.create({ model: env.JUDITH_MODEL_HAIKU, max_tokens: 40, temperature: 0, system, messages: [{ role: "user", content: user }] });
      const primeiro = response.content[0];
      const bruto = primeiro?.type === "text" ? primeiro.text : "";
      const valor = extrairJson(bruto)?.intencao;
      if (typeof valor === "string" && INTENCOES.includes(valor.trim().toLowerCase() as Intencao)) {
        return { intencao: valor.trim().toLowerCase() as Intencao, origem: "classificador", bruto };
      }
    } catch {
      // tenta de novo; a segunda falha cai nas palavras-chave
    }
  }
  return { intencao: "duvida", origem: "falha" };
}
