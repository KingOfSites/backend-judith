// Exact whole-message matches: a greeting followed by a legal question must continue normally.
export function smalltalk(text: string): string | null {
  const value = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[!?.,]/g, "").trim();
  if (/^(oi|ola|bom dia|boa tarde|boa noite|oi judith|ola judith)$/.test(value)) return "Olá! Sou a JUDITH. Como posso ajudar?";
  if (/^(obrigad[oa]|muito obrigad[oa]|valeu)$/.test(value)) return "Por nada! Estou por aqui.";
  if (/^(qual (e )?(o )?seu nome|como voce se chama|quem e voce)$/.test(value)) return "Sou a JUDITH, sua assistente para dúvidas jurídicas.";
  return null;
}
