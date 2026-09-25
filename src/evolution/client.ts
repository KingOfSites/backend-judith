import axios, { AxiosInstance } from "axios";
import { env } from "../config/env.js";
import { createHash } from "node:crypto";

const http: AxiosInstance = axios.create({
  baseURL: env.EVOLUTION_API_URL,
  timeout: 15_000,
  headers: { apikey: env.EVOLUTION_API_KEY },
});

// Doc: POST /message/sendText/{instance}
// Retorna o id da mensagem enviada no WhatsApp (usado para associar reações), ou null.
export async function sendText(toNumber: string, text: string, inboundMessageId?: string): Promise<string | null> {
  const fingerprint = (value: string) => createHash("sha256").update(value).digest("hex");
  const metadata = {
    instance: env.EVOLUTION_INSTANCE, inboundMessageId,
    recipientHash: fingerprint(toNumber), recipientLast4: toNumber.slice(-4),
    textHash: fingerprint(text), linkPreview: false,
  };
  try {
    const response = await http.post(`/message/sendText/${env.EVOLUTION_INSTANCE}`, {
      number: toNumber, text, linkPreview: false,
    });
    const data = response.data;
    const messageId = typeof data?.key?.id === "string" ? data.key.id : null;
    console.info(JSON.stringify({
      event: "evolution.send.receipt", time: new Date().toISOString(), ...metadata,
      httpStatus: response.status,
      messageId,
      instanceId: typeof data?.instanceId === "string" ? data.instanceId : null,
      providerStatus: typeof data?.status === "string" || typeof data?.status === "number" ? data.status : null,
      fromMe: data?.key?.fromMe === true,
      recipientMatches: data?.key?.remoteJid === `${toNumber}@s.whatsapp.net`,
      providerRecipientHash: typeof data?.key?.remoteJid === "string" ? fingerprint(data.key.remoteJid) : null,
    }));
    return messageId;
  } catch (error) {
    // Never propagate Axios config/headers or response bodies into webhook logs.
    const httpStatus = axios.isAxiosError(error) ? error.response?.status ?? null : null;
    console.error(JSON.stringify({event: "evolution.send.failure", time: new Date().toISOString(), ...metadata, httpStatus}));
    throw new Error(`Evolution sendText failed (HTTP ${httpStatus ?? "unavailable"})`);
  }
}

// "Digitando..." enquanto a JUDITH pensa — UX bem mais natural no WhatsApp.
// Doc: POST /chat/sendPresence/{instance}
export async function sendTyping(toNumber: string, durationMs = 2_000): Promise<void> {
  try {
    await http.post(`/chat/sendPresence/${env.EVOLUTION_INSTANCE}`, {
      number: toNumber,
      presence: "composing",
      delay: durationMs,
    });
  } catch {
    // presence é cosmético — não falha o fluxo
  }
}
