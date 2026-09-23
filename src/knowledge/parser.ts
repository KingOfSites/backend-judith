import { Area, KnowledgeValidationError, validateAreas } from "./areas.js";

export const PARSER_VERSION = "markdown-v1";
export type Chunk = { content: string; semanticText: string; areas: Area[]; chapter: string; subchapter: string | null; line: number };

/** ATX ##/###; fenced/indented code is opaque. Areas are scoped to the current heading. */
export function parseNotebook(conteudo: string, area: unknown): Chunk[] {
  let defaults = validateAreas(area, { origem: "metadados", campo: "area" });
  let chapterAreas = defaults, currentAreas = defaults;
  let chapter = "", subchapter: string | null = null, level = 0;
  let raw: string[] = [], semantic: string[] = [], line = 1;
  let fence: { char: string; size: number } | null = null;
  const result: Chunk[] = [];
  const lines = conteudo.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const flush = () => {
    if (semantic.join("").trim()) result.push({ content: raw.join(""), semanticText: semantic.join(""), areas: [...currentAreas], chapter, subchapter, line });
    raw = []; semantic = [];
  };
  let frontmatter = lines[0]?.trim() === "---";
  for (let i = 0; i < lines.length; i++) {
    const original = lines[i]!;
    const text = original.replace(/\r?\n$/, "");
    if (frontmatter) {
      if (i > 0 && text.trim() === "---") { frontmatter = false; line = i + 2; continue; }
      const metadata = /^(?:area|área):\s*(.*)$/i.exec(text);
      if (metadata) {
        defaults = validateAreas(metadata[1], { origem: "frontmatter", campo: "area", linha: i + 1 });
        chapterAreas = currentAreas = defaults;
      }
      continue;
    }
    const code = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
    if (fence) {
      raw.push(original); semantic.push(original);
      if (code && code[1]![0] === fence.char && code[1]!.length >= fence.size && !code[2]!.trim()) fence = null;
      continue;
    }
    if (code && !(code[1]![0] === "`" && code[2]!.includes("`"))) {
      fence = { char: code[1]![0]!, size: code[1]!.length };
      raw.push(original); semantic.push(original); continue;
    }
    const heading = /^ {0,3}(#{2,3})\s+(.+?)\s*#*\s*$/.exec(text);
    if (heading) {
      flush(); line = i + 1; level = heading[1]!.length;
      if (level === 2) { chapter = heading[2]!; subchapter = null; chapterAreas = defaults; }
      else subchapter = heading[2]!;
      currentAreas = chapterAreas;
    }
    const marker = /^ {0,3}(?:\*\*(?:Área|Area):\*\*|\*\*(?:Área|Area)\*\*:|(?:Área|Area):)\s*(.*)$/i.exec(text);
    if (marker) {
      const next = validateAreas(marker[1], { origem: "markdown", campo: "area", linha: i + 1, capitulo: chapter });
      // A marker after prose affects only following blocks; a marker right after a heading applies to that heading.
      if (semantic.some(s => s.trim() && !/^ {0,3}#{1,3}\s/.test(s))) { flush(); line = i + 1; }
      currentAreas = next;
      if (level === 0) defaults = chapterAreas = next;
      if (level === 2) chapterAreas = next;
      raw.push(original);
      continue;
    }
    raw.push(original); semantic.push(original);
  }
  if (frontmatter) throw new KnowledgeValidationError([{ origem: "frontmatter", campo: "conteudo", valor: "---", linha: 1, mensagem: "Frontmatter sem fechamento" }]);
  flush();
  return result;
}
