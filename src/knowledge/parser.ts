import { Area, KnowledgeValidationError, ValidationIssue, validateAreas } from "./areas.js";

export const PARSER_VERSION = "markdown-v3";
export type Chunk = { content: string; semanticText: string; areas: Area[]; chapter: string; subchapter: string | null; line: number };

const HEADING = /^ {0,3}#{1,6}(?:\s|$)/;
const THEMATIC_BREAK = /^ {0,3}([-*_])(?: *\1){2,} *$/;

/**
 * ATX ##/###; fenced/indented code is opaque.
 * A marker at the top or in a ## chapter applies from there down, across following chapters, until
 * another such marker. A marker inside a ### subchapter applies only to that subchapter; its siblings
 * and the next chapter return to the chapter's area. All invalid areas are reported together.
 */
export function parseNotebook(conteudo: string, area: unknown): Chunk[] {
  const issues: ValidationIssue[] = [];
  const areas = (value: unknown, context: Partial<ValidationIssue>, fallback: Area[]) => {
    try { return validateAreas(value, context); }
    catch (error) {
      if (!(error instanceof KnowledgeValidationError)) throw error;
      issues.push(...error.issues);
      return fallback;
    }
  };
  let running = areas(area, { origem: "metadados", campo: "area" }, []), currentAreas = running;
  let chapter = "", subchapter: string | null = null, level = 0;
  let started = false;
  let raw: string[] = [], semantic: string[] = [], useful = false, line = 1;
  let fence: { char: string; size: number } | null = null;
  const result: Chunk[] = [];
  const lines = conteudo.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const flush = () => {
    // Blocks made only of headings, separators and markers carry no searchable content. Their titles
    // remain in the chapter/subchapter context of the blocks that follow.
    if (started && useful) result.push({ content: raw.join(""), semanticText: semantic.join(""), areas: [...currentAreas], chapter, subchapter, line });
    raw = []; semantic = []; useful = false;
  };
  let frontmatter = lines[0]?.trim() === "---";
  for (let i = 0; i < lines.length; i++) {
    const original = lines[i]!;
    const text = original.replace(/\r?\n$/, "");
    if (frontmatter) {
      if (i > 0 && text.trim() === "---") { frontmatter = false; line = i + 2; continue; }
      const metadata = /^(?:area|área):\s*(.*)$/i.exec(text);
      if (metadata) running = currentAreas = areas(metadata[1], { origem: "frontmatter", campo: "area", linha: i + 1 }, running);
      continue;
    }
    const code = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
    if (fence) {
      raw.push(original); semantic.push(original); useful = true;
      if (code && code[1]![0] === fence.char && code[1]!.length >= fence.size && !code[2]!.trim()) fence = null;
      continue;
    }
    if (code && !(code[1]![0] === "`" && code[2]!.includes("`"))) {
      fence = { char: code[1]![0]!, size: code[1]!.length };
      raw.push(original); semantic.push(original); useful = true; continue;
    }
    const heading = /^ {0,3}(#{2,3})\s+(.+?)\s*#*\s*$/.exec(text);
    if (heading) {
      if (!started && heading[1]!.length === 3) continue;
      flush(); line = i + 1; level = heading[1]!.length;
      started = true;
      if (level === 2) { chapter = heading[2]!; subchapter = null; }
      else subchapter = heading[2]!;
      currentAreas = running;
    }
    const marker = /^ {0,3}(?:\*\*(?:Área|Area):\*\*|\*\*(?:Área|Area)\*\*:|(?:Área|Area):)\s*(.*)$/i.exec(text);
    if (marker) {
      const next = areas(marker[1], { origem: "markdown", campo: "area", linha: i + 1, capitulo: chapter }, currentAreas);
      // A marker after content affects only following blocks; right after a heading it applies to that heading.
      if (useful) { flush(); line = i + 1; }
      currentAreas = next;
      if (level !== 3) running = next;
      raw.push(original);
      continue;
    }
    raw.push(original); semantic.push(original);
    if (text.trim() && !HEADING.test(text) && !THEMATIC_BREAK.test(text)) useful = true;
  }
  if (frontmatter) issues.push({ origem: "frontmatter", campo: "conteudo", valor: "---", linha: 1, mensagem: "Frontmatter sem fechamento" });
  flush();
  if (!result.length) issues.push({ origem: "markdown", campo: "conteudo", valor: "SEM_BLOCOS", mensagem: "O caderno precisa de ao menos um capítulo iniciado por ## seguido de conteúdo. Capa, títulos vazios e marcações de área não formam blocos indexáveis." });
  if (issues.length) throw new KnowledgeValidationError(issues);
  return result;
}
