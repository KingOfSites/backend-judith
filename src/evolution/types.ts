// Tipos enxutos do webhook do Evolution API (apenas os campos que usamos).
// Doc: https://doc.evolution-api.com/v2/pt/events/webhook

export type EvolutionWebhookEvent =
  | "messages.upsert"
  | "messages.update"
  | "connection.update"
  | "qrcode.updated"
  | string;

export type EvolutionWebhookBody = {
  event: EvolutionWebhookEvent;
  instance: string;
  data: {
    key?: {
      remoteJid: string; // ex: "5511999999999@s.whatsapp.net"
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      audioMessage?: {
        mimetype: string;
        seconds?: number;
        url?: string;
      };
      imageMessage?: { caption?: string; mimetype: string; url?: string };
      documentMessage?: {
        fileName?: string;
        mimetype: string;
        url?: string;
      };
      // Reação (emoji) a uma mensagem; text vazio = reação removida.
      reactionMessage?: {
        key?: { remoteJid?: string; fromMe?: boolean; id?: string };
        text?: string;
      };
    };
    messageType?: string;
    messageTimestamp?: number;
  };
};

export type ParsedInbound = {
  fromJid: string;
  whatsappNumber: string;
  pushName?: string;
  text: string;
  hasAttachment: boolean;
  attachmentKind?: "audio" | "image" | "document";
  isFromMe: boolean;
  messageId: string;
};

export type ParsedReaction = { whatsappNumber: string; reactedMessageId: string; emoji: string };

// Reação do usuário (não de grupo) a uma mensagem. O fromMe da chave reagida depende do ponto de
// vista de quem reagiu, então não é usado: só conta reação a uma resposta registrada da JUDITH para
// esse mesmo usuário (recordReaction).
export function parseReaction(body: EvolutionWebhookBody): ParsedReaction | null {
  if (body.event !== "messages.upsert") return null;
  const d = body.data;
  const r = d.message?.reactionMessage;
  if (!d.key || d.key.fromMe || !r?.key?.id) return null;
  if (d.key.remoteJid.endsWith("@g.us")) return null;
  return { whatsappNumber: d.key.remoteJid.split("@")[0] ?? d.key.remoteJid, reactedMessageId: r.key.id, emoji: r.text ?? "" };
}

export function parseInbound(body: EvolutionWebhookBody): ParsedInbound | null {
  if (body.event !== "messages.upsert") return null;
  const d = body.data;
  if (!d.key) return null;
  if (d.key.fromMe) return null; // ignora mensagens enviadas pela própria JUDITH

  const remoteJid = d.key.remoteJid;
  // Ignora grupos por enquanto
  if (remoteJid.endsWith("@g.us")) return null;

  const whatsappNumber = remoteJid.split("@")[0] ?? remoteJid;

  const msg = d.message ?? {};
  const text =
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    "";

  let hasAttachment = false;
  let attachmentKind: ParsedInbound["attachmentKind"];
  if (msg.audioMessage) {
    hasAttachment = true;
    attachmentKind = "audio";
  } else if (msg.imageMessage) {
    hasAttachment = true;
    attachmentKind = "image";
  } else if (msg.documentMessage) {
    hasAttachment = true;
    attachmentKind = "document";
  }

  if (!text && !hasAttachment) return null;

  return {
    fromJid: remoteJid,
    whatsappNumber,
    pushName: d.pushName,
    text,
    hasAttachment,
    attachmentKind,
    isFromMe: false,
    messageId: d.key.id,
  };
}
