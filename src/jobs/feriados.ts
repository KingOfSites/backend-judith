// Feriados nacionais e dias úteis, para o calendário de obrigações.
//
//  - Fixos: 01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11 (Lei 14.759/2023), 25/12.
//  - Móveis (pela Páscoa): Carnaval (segunda e terça), Sexta-feira Santa e Corpus Christi.
//    Carnaval e Corpus Christi são ponto facultativo federal, mas não há expediente bancário,
//    então contam como não úteis para pagamento de guia.
//  - Feriados estaduais e municipais não entram (variam por cidade).
//
// "Dia útil" para ajuste de vencimento (DAS, FGTS, INSS): segunda a sexta sem feriado.
// "5º dia útil" do salário (CLT art. 459 §1º): o sábado conta, como na prática do MTE.

export type DataLocal = { ano: number; mes: number; dia: number };

const chave = (d: DataLocal) => `${d.ano}-${String(d.mes).padStart(2, "0")}-${String(d.dia).padStart(2, "0")}`;

function deUtc(data: Date): DataLocal {
  return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() + 1, dia: data.getUTCDate() };
}

export function somar(d: DataLocal, dias: number): DataLocal {
  return deUtc(new Date(Date.UTC(d.ano, d.mes - 1, d.dia + dias)));
}

// 0 = domingo … 6 = sábado
export function diaDaSemana(d: DataLocal): number {
  return new Date(Date.UTC(d.ano, d.mes - 1, d.dia)).getUTCDay();
}

// Algoritmo de Meeus/Jones/Butcher (calendário gregoriano).
export function pascoa(ano: number): DataLocal {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { ano, mes, dia };
}

const cacheFeriados = new Map<number, Set<string>>();

export function feriadosNacionais(ano: number): Set<string> {
  const pronto = cacheFeriados.get(ano);
  if (pronto) return pronto;
  const fixos: [number, number][] = [[1, 1], [4, 21], [5, 1], [9, 7], [10, 12], [11, 2], [11, 15], [11, 20], [12, 25]];
  const lista = fixos.map(([mes, dia]) => chave({ ano, mes, dia }));
  const p = pascoa(ano);
  for (const desloc of [-48, -47, -2, 60]) lista.push(chave(somar(p, desloc)));
  const conjunto = new Set(lista);
  cacheFeriados.set(ano, conjunto);
  return conjunto;
}

export function ehFeriado(d: DataLocal): boolean {
  return feriadosNacionais(d.ano).has(chave(d));
}

export function ehDiaUtil(d: DataLocal, opts: { sabadoConta?: boolean } = {}): boolean {
  const semana = diaDaSemana(d);
  if (semana === 0) return false;
  if (semana === 6 && !opts.sabadoConta) return false;
  return !ehFeriado(d);
}

export type AjusteDiaUtil = "NENHUM" | "POSTERIOR" | "ANTERIOR";

// Data em fim de semana ou feriado: POSTERIOR vai pro próximo dia útil (DAS), ANTERIOR volta
// pro anterior (FGTS, INSS). Dia útil aqui é segunda a sexta sem feriado.
export function ajustarDiaUtil(d: DataLocal, ajuste: AjusteDiaUtil): DataLocal {
  if (ajuste === "NENHUM") return d;
  let atual = d;
  for (let i = 0; i < 10 && !ehDiaUtil(atual); i++) atual = somar(atual, ajuste === "POSTERIOR" ? 1 : -1);
  return atual;
}

// N-ésimo dia útil do mês (1..15). Sábado conta (prazo do salário).
export function enesimoDiaUtil(ano: number, mes: number, n: number, opts: { sabadoConta?: boolean } = { sabadoConta: true }): DataLocal {
  let atual: DataLocal = { ano, mes, dia: 1 };
  let contados = 0;
  for (let i = 0; i < 45; i++) {
    if (atual.mes !== mes) break;
    if (ehDiaUtil(atual, opts)) {
      contados++;
      if (contados === n) return atual;
    }
    atual = somar(atual, 1);
  }
  return atual;
}
