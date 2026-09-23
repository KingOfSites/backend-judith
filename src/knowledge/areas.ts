export const AREAS = ["administrativo", "ambiental", "civil", "consumidor", "eca", "empresarial", "lgpd", "tributario", "previdenciario", "processual", "trabalhista", "autoral"] as const;
export type Area = typeof AREAS[number];
export type ValidationIssue = { origem: string; campo: string; valor: unknown; linha?: number; capitulo?: string; mensagem: string };
export class KnowledgeValidationError extends Error {
  constructor(public issues: ValidationIssue[]) {
    super(issues.map(i => i.mensagem).join("; "));
  }
}
export function validateAreas(value: unknown, context: Partial<ValidationIssue> = {}): Area[] {
  const values = typeof value === "string" ? value.split(",").map(v => v.trim()) : [value];
  const issues = values.filter(v => !AREAS.includes(v as Area)).map(valor => ({
    origem: "caderno", campo: "area", ...context, valor, mensagem: `Área inválida: ${String(valor)}`,
  }));
  if (issues.length) throw new KnowledgeValidationError(issues);
  return [...new Set(values)] as Area[];
}
