// Exact whole-message matches: a greeting followed by a legal question must continue normally.
// A saudação de quem volta é editável no Admin (Onboarding → saudacaoRetorno); as demais são fixas.
export const SAUDACAO_RETORNO_RESERVA = "Olá! Sou a JUDITH. Como posso ajudar?";

export function smalltalk(text: string, textos: { saudacao?: string } = {}): string | null {
  const value = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[!?.,]/g, "").trim();
  if (/^(oi|ola|bom dia|boa tarde|boa noite|oi judith|ola judith|oi tudo bem|ola tudo bem)$/.test(value)) return textos.saudacao?.trim() || SAUDACAO_RETORNO_RESERVA;
  if (/^(obrigad[oa]|muito obrigad[oa]|valeu)$/.test(value)) return "Por nada! Estou por aqui.";
  if (/^(qual (e )?(o )?seu nome|como voce se chama|quem e voce)$/.test(value)) return "Sou a JUDITH, sua assistente para dúvidas jurídicas.";
  return null;
}
