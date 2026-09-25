import { AREAS, Area } from "./areas.js";

export type AreaKeywords = Partial<Record<Area, string[]>>;

const words = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Correção fixa, sem IA, aplicada depois do classificador: cada termo casa no início de uma
 * palavra, sem acento e sem diferença de maiúsculas ("duplicata" também pega "duplicatas").
 */
export function keywordAreas(text: string, keywords: AreaKeywords): Area[] {
  const haystack = ` ${words(text)} `;
  return AREAS.filter(area => (keywords[area] ?? []).some(term => {
    const needle = words(term);
    return needle.length > 0 && haystack.includes(` ${needle}`);
  }));
}

export function parseAreaKeywords(value: unknown): AreaKeywords {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: AreaKeywords = {};
  for (const area of AREAS) {
    const list = (value as Record<string, unknown>)[area];
    if (Array.isArray(list)) result[area] = list.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  }
  return result;
}
