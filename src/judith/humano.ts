// Pedido de atendimento humano: mensagem fixa com o canal de atendimento, alerta no
// painel e aviso no WhatsApp do responsável. Não chama modelo nem consome cota.

import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { sendText } from "../evolution/client.js";

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[!?.,;:]/g, " ").replace(/\s+/g, " ").trim();

// Só pedidos explícitos: "quero falar com uma pessoa", "tem atendente?", "me passa pra um humano".
// A versão anterior aceitava qualquer frase com "uma pessoa" e um verbo solto ("posso", "tem"): a
// dúvida "posso proibir a entrada de uma pessoa cega na minha casa noturna?" virou pedido de
// atendimento. Agora o verbo de contato precisa apontar para a pessoa, e "uma pessoa"/"alguém"
// só valem quando a frase termina ali (ou em complemento de atendimento), não em dúvida jurídica.
const ART = "(?:um |uma |o |a |algum |alguma )?";
const FORTE = "(?:humano|humana|atendente|ser humano|alguem de verdade|gente de verdade|pessoa de verdade|pessoa real|pessoa humana)";
const FRACO = "(?:uma pessoa|alguem|o responsavel|um responsavel|a equipe|o suporte|o atendimento)";
const ROBO = "(?:um |uma )?(?:robo|maquina|ia|bot)";
const FIM = `(?: (?:da equipe|do suporte|do atendimento|da judith|de voces|dai|ai|aqui|agora|hoje|urgente|por favor|pf|pfv|sobre isso|sobre (?:o )?meu caso|(?:pra|para) me ajudar|que possa me ajudar|(?:e )?nao com ${ROBO}|que nao seja ${ROBO}))*$`;
const CONTATO = "(?:fal(?:ar|o|a|e)|convers(?:ar|o|a|e)|atendid[oa]|contato)";
const ENCAMINHAR = "(?:pass(?:ar|a|e)|transfer(?:ir|e|a)|encaminh(?:ar|a|e)|direcion(?:ar|a|e)|cham(?:ar|a|e))";
const PEDIDOS_HUMANO = [
  /\b(?:atendimento|suporte|atendente|contato) human[oa]\b/,
  new RegExp(`\\b${CONTATO}\\b(?: \\w+)? (?:com|por) ${ART}${FORTE}\\b`),
  new RegExp(`\\b${CONTATO}\\b(?: \\w+)? (?:com|por) ${FRACO}${FIM}`),
  new RegExp(`\\b${ENCAMINHAR}\\b(?: me)? (?:(?:pra|pro|para|com|ao|a) )?${ART}${FORTE}\\b`),
  new RegExp(`\\b${ENCAMINHAR}\\b(?: me)? (?:pra|pro|para|ao|a) (?:o |a )?(?:atendimento|suporte|equipe)${FIM}`),
  new RegExp(`^(?:(?:oi|ola|opa|bom dia|boa tarde|boa noite) )?(?:tem|existe|ha) ${ART}${FORTE}${FIM}`),
  new RegExp(`\\b(?:quero|queria|preciso|gostaria)(?: de)? ${ART}(?:humano|humana|ser humano|alguem de verdade|gente de verdade|pessoa de verdade|pessoa real)\\b`),
  new RegExp(`\\b(?:quero|queria|preciso)(?: de)? ${ART}atendente${FIM}`),
];

export function isPedidoHumano(texto: string): boolean {
  const n = normalizar(texto);
  if (!n || n.length > 200) return false;
  const negacao = /\b(nao (e|sou) (um )?(robo|humano)|voce e (um )?(robo|humano|ia)|e (uma )?ia\b)/;
  if (negacao.test(n)) return false;
  return PEDIDOS_HUMANO.some(re => re.test(n));
}

export const MENSAGEM_HUMANO_RESERVA =
  "Claro! Pra falar com uma pessoa da equipe da JUDITH, é só escrever para o nosso canal de atendimento. Já avisei o time que você pediu contato, e alguém te retorna por aqui. Enquanto isso, se quiser, pode continuar me mandando sua dúvida. 🙂";

export async function registrarPedidoHumano(input: { userId: string; whatsappNumber: string; nome: string | null; texto: string; mensagemConfigurada?: string | null }): Promise<string> {
  const mensagem = input.mensagemConfigurada?.trim() || MENSAGEM_HUMANO_RESERVA;
  await prisma.adminAlert.create({
    data: {
      kind: "HUMAN_REQUEST",
      titulo: `Pediu atendimento humano: ${input.nome ?? input.whatsappNumber}`,
      // Não copia a mensagem do cliente: o conteúdo da conversa fica protegido.
      detalhe: `WhatsApp final ${input.whatsappNumber.slice(-4)}. Responder pelo canal de atendimento.`,
      userId: input.userId,
    },
  });
  if (env.ALERTA_WHATSAPP) {
    try {
      await sendText(env.ALERTA_WHATSAPP, `🔔 JUDITH: ${input.nome ?? "um cliente"} (final ${input.whatsappNumber.slice(-4)}) pediu atendimento humano. Veja em Alertas no painel.`);
    } catch {
      // O alerta no painel já foi gravado; o aviso é cortesia.
    }
  }
  return mensagem;
}
