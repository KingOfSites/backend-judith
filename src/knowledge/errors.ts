export type KnowledgeFailureCode = "CLASSIFICATION_INVALID" | "KNOWLEDGE_UNAVAILABLE" | "KNOWLEDGE_NO_CONTEXT" | "KNOWLEDGE_OUT_OF_SCOPE";

export class KnowledgeSearchError extends Error {
  constructor(public code: KnowledgeFailureCode) { super(code); }
}

export const KNOWLEDGE_UNAVAILABLE_MESSAGE = "Não consegui consultar uma base de conhecimento confiável para esta pergunta agora. Não vou gerar orientação jurídica sem essa referência. Tente novamente em instantes; se a pergunta depender da conversa anterior, inclua o assunto e os detalhes. Nenhum crédito foi consumido.";

export function knowledgeMessage(code: KnowledgeFailureCode): string {
  if (code === "KNOWLEDGE_OUT_OF_SCOPE") return "Atendo dúvidas nas áreas jurídicas disponíveis na JUDITH. Não identifiquei sua pergunta nesse escopo. Se for uma dúvida jurídica, diga o assunto e o que aconteceu. Nenhum crédito foi consumido.";
  if (code === "KNOWLEDGE_NO_CONTEXT") return "Ainda não há conteúdo publicado e disponível na base para a área desta pergunta. Não posso oferecer orientação jurídica sem essa referência. Nenhum crédito foi consumido.";
  return KNOWLEDGE_UNAVAILABLE_MESSAGE;
}
