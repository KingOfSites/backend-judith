export type KnowledgeFailureCode = "CLASSIFICATION_INVALID" | "KNOWLEDGE_UNAVAILABLE" | "KNOWLEDGE_NO_CONTEXT" | "KNOWLEDGE_OUT_OF_SCOPE" | "SUPPORT_UNAVAILABLE" | "SUPPORT_INSUFFICIENT" | "TRACE_UNAVAILABLE";

export class KnowledgeSearchError extends Error {
  constructor(public code: KnowledgeFailureCode) { super(code); }
}

// Resposta retida por falta de suporte na base. Editável em Regras → Classificadores
// (mensagemSemSuporte); esta reserva é o texto pedido pelo fundador em 27/10/2026.
export const MENSAGEM_SEM_SUPORTE_RESERVA =
  "Esse ponto eu não consigo te responder com segurança, e prefiro não arriscar um prazo ou uma consequência errada. Se puder, me conta mais detalhes do caso que eu tento de novo. Se for urgente, sugiro você buscar um advogado na área ou a Defensoria Pública. Nenhum crédito foi consumido.";

export const KNOWLEDGE_UNAVAILABLE_MESSAGE = "Não consegui consultar uma base de conhecimento confiável para esta pergunta agora. Não vou gerar orientação jurídica sem essa referência. Tente novamente em instantes; se a pergunta depender da conversa anterior, inclua o assunto e os detalhes. Nenhum crédito foi consumido.";

export function knowledgeMessage(code: KnowledgeFailureCode): string {
  if (code === "SUPPORT_INSUFFICIENT") return MENSAGEM_SEM_SUPORTE_RESERVA;
  if (code === "SUPPORT_UNAVAILABLE" || code === "TRACE_UNAVAILABLE") return "Não consegui concluir a verificação desta resposta agora. Não vou enviar orientação jurídica sem concluir essa etapa. Nenhum crédito foi consumido.";
  if (code === "KNOWLEDGE_OUT_OF_SCOPE") return "Atendo dúvidas nas áreas jurídicas disponíveis na JUDITH. Não identifiquei sua pergunta nesse escopo. Se for uma dúvida jurídica, diga o assunto e o que aconteceu. Nenhum crédito foi consumido.";
  if (code === "KNOWLEDGE_NO_CONTEXT") return "Ainda não há conteúdo publicado e disponível na base para a área desta pergunta. Não posso oferecer orientação jurídica sem essa referência. Nenhum crédito foi consumido.";
  return KNOWLEDGE_UNAVAILABLE_MESSAGE;
}
