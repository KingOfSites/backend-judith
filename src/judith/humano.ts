// Pedido de atendimento humano: mensagem fixa com o canal de atendimento, alerta no
// painel e aviso no WhatsApp do responsável. Não chama modelo nem consome cota.

import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { sendText } from "../evolution/client.js";

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[!?.,;:]/g, " ").replace(/\s+/g, " ").trim();

// Só pedidos explícitos: "quero falar com uma pessoa", "tem atendente?", "me passa pra um humano".
export function isPedidoHumano(texto: string): boolean {
  const n = normalizar(texto);
  if (n.length > 200) return false;
  const pessoa = /\b(humano|humana|atendente|uma pessoa|alguem de verdade|gente de verdade|pessoa de verdade|ser humano|suporte humano|responsavel)\b/;
  const acao = /\b(fal(ar|o|a|e)|convers(ar|o|a|e)|atendimento|atend(er|e|a)|pass(ar|a|e)|transfer(ir|e)|contato|cham(ar|a|e)|tem|quero|preciso|posso|consigo|pode|tenho|existe)\b/;
  const negacao = /\b(nao (e|sou) (um )?(robo|humano)|voce e (um )?(robo|humano|ia)|e (uma )?ia\b)/;
  return pessoa.test(n) && acao.test(n) && !negacao.test(n);
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
