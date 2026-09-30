// Os modelos escrevem em Markdown; o WhatsApp usa marcação própria.
// Converte na saída, antes de enviar, sem mexer no que foi gravado no histórico.
//
//   **negrito** → *negrito*      __negrito__ → *negrito*
//   ### Título  → *Título*       ` código ` fica como está (WhatsApp entende crase)
//   - item / * item → • item     1. item fica como está
//   [texto](url) → texto: url

export function paraWhatsApp(texto: string): string {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n").map(linha => {
    let l = linha;
    // Títulos viram linha em negrito.
    const titulo = l.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (titulo) l = `*${titulo[1]!.replace(/\*\*(.+?)\*\*/g, "$1")}*`;
    // Negrito duplo vira simples (o WhatsApp não entende **).
    l = l.replace(/\*\*(.+?)\*\*/g, "*$1*").replace(/__(.+?)__/g, "*$1*");
    // Marcadores de lista.
    l = l.replace(/^(\s*)[-*]\s+(?=\S)/, "$1• ");
    // Links em Markdown.
    l = l.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1: $2");
    return l;
  });
  // Mais de uma linha em branco seguida vira uma só.
  return linhas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
