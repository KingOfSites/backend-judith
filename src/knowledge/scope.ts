// The same source-scope conflict already enforced by the final support barrier.
// This selects applicable context; it does not supply or change a legal rule.
export function accidentSourceForDefect(question: string, chapter: string): boolean {
  return /v[íi]cio/i.test(question) && !/acidente de consumo|fato do produto/i.test(question) && /acidente de consumo/i.test(chapter);
}
