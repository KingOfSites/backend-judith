import { prisma } from "../db/client.js";

// "Isso te ajudou?" pelo WhatsApp: o usuário reage à resposta da JUDITH.
// Tons de pele e variação de emoji são ignorados na comparação.
const POSITIVE = ["👍", "❤", "🙏", "👏", "😍", "🥰", "✅", "💯", "🔥", "😀", "😃", "😄", "😁", "😊", "🤩"];
const NEGATIVE = ["👎", "😡", "😠", "❌", "😞", "😕", "🙁", "☹", "😢", "😭"];

export function reactionMeaning(emoji: string): boolean | null {
  const base = emoji.replace(/[\u{1F3FB}-\u{1F3FF}\u{FE0F}]/gu, "");
  if (POSITIVE.includes(base)) return true;
  if (NEGATIVE.includes(base)) return false;
  return null;
}

/** Guarda qual mensagem enviada no WhatsApp respondeu a qual pergunta. Falha não afeta o envio. */
export async function registerAnswer(replyId: string, interactionId: string, userId: string): Promise<void> {
  try { await prisma.knowledgeFeedback.create({ data: { replyId, interactionId, userId } }); }
  catch { /* opcional: sem registro, a reação só é ignorada */ }
}

/**
 * Registra a reação. Só vale para resposta da base enviada a esse mesmo usuário; reação removida
 * (emoji vazio) limpa a avaliação. Retorna false quando a mensagem não é uma resposta registrada.
 */
export async function recordReaction(replyId: string, whatsappNumber: string, emoji: string): Promise<boolean> {
  const row = await prisma.knowledgeFeedback.findUnique({ where: { replyId } });
  if (!row) return false;
  const user = await prisma.user.findUnique({ where: { whatsappNumber }, select: { id: true } });
  if (user?.id !== row.userId) return false;
  const reaction = emoji.trim() || null;
  await prisma.knowledgeFeedback.update({ where: { replyId }, data: { reaction, helpful: reaction ? reactionMeaning(reaction) : null } });
  return true;
}
