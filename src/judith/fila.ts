// Fila por número do WhatsApp: junta mensagens seguidas e serializa o processamento.
//
// Por que existe (testes do fundador, 27/10/2026):
//  - "quero demitir funcionario" e "não posso?" no mesmo minuto geravam duas respostas quase iguais
//    e, como rodavam em paralelo, as duas cobravam ("primeira dúvida da sessão" duas vezes);
//  - um "." sem querer no meio de uma análise disparava a análise inteira de novo, cobrando outra.
//
// Regra: cada mensagem recebida entra na fila do número e (re)inicia uma espera curta. Quando a
// espera termina sem mensagem nova, tudo o que chegou vira UM turno. Enquanto um turno desse
// número está em processamento, as mensagens novas esperam o fim dele: nunca há dois turnos do
// mesmo cliente ao mesmo tempo, então a cota e o estado da sessão são lidos já atualizados.

type Fila<T> = { itens: T[]; timer: NodeJS.Timeout | null; rodando: boolean };

export class FilaPorNumero<T> {
  private filas = new Map<string, Fila<T>>();

  constructor(
    private readonly esperaMs: number,
    private readonly processar: (numero: string, lote: T[]) => Promise<void>,
    private readonly aoFalhar: (numero: string, erro: unknown) => void = () => undefined,
  ) {}

  receber(numero: string, item: T): void {
    const fila = this.filas.get(numero) ?? { itens: [], timer: null, rodando: false };
    this.filas.set(numero, fila);
    fila.itens.push(item);
    if (fila.timer) clearTimeout(fila.timer);
    fila.timer = setTimeout(() => void this.disparar(numero), this.esperaMs);
  }

  // Quantos números têm algo esperando ou rodando (observabilidade e testes).
  get pendentes(): number {
    return this.filas.size;
  }

  private async disparar(numero: string): Promise<void> {
    const fila = this.filas.get(numero);
    if (!fila) return;
    fila.timer = null;
    // Já há um turno rodando: o lote acumulado sai assim que ele terminar.
    if (fila.rodando) return;
    const lote = fila.itens.splice(0);
    if (!lote.length) { this.filas.delete(numero); return; }
    fila.rodando = true;
    try {
      await this.processar(numero, lote);
    } catch (erro) {
      this.aoFalhar(numero, erro);
    } finally {
      fila.rodando = false;
      if (!fila.itens.length) this.filas.delete(numero);
      // Chegou coisa durante o processamento e a espera já venceu: processa agora.
      else if (!fila.timer) void this.disparar(numero);
    }
  }
}

// Mensagem que não carrega pedido nenhum: só pontuação, emoji, "ok", "blz". Não reinicia fluxo,
// não chama modelo e não cobra. Dentro de uma coleta de documento, "ok" pode ser resposta ("pode
// gerar?" → "ok"), então ali só a pontuação/emoji pura é ignorada.
export function mensagemTrivial(texto: string, fluxoAberto = false): boolean {
  const t = texto.trim();
  if (!t) return true;
  if (!/[\p{L}\p{N}]/u.test(t)) return true;
  if (fluxoAberto) return false;
  const n = t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return /^(ok|okay|okk+|blz|beleza|certo|entendi|entendido|show|top|ta|ta bom|tabom|fechou|combinado|perfeito|otimo|legal|boa|isso|sim|nao|aham|uhum|hm+|k+|kk+|rs+|haha+)$/.test(n);
}
