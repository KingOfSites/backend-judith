// Planejador de turno: decide a função do turno olhando o fluxo aberto na sessão.
//
// É aqui que acontece a troca de fluxo no meio da conversa (Regras de Análise,
// "depende de implementação do dev"): a JUDITH analisa, aponta que falta uma
// cláusula, o cliente responde "então escreve pra mim" e o sistema reclassifica a
// intenção, troca a Seção C pela B, carrega a Composição e mantém o histórico.
// A cláusula pronta só vem da Composição, nunca duplicada na Análise.

import { classificarTipo, classificarTurno, TurnoAnterior } from "./classificador.js";
import { desvioDaRedacao, FuncaoDocumento, montarPacote, Pacote, TIPO_OUTRO } from "./pacote.js";
import type { RegrasSnapshot } from "./repository.js";

// Turnos seguidos fora do fluxo antes de ele expirar sozinho (spec §5).
export const LIMITE_OCIOSO = 5;

export type EstadoFluxo = {
  fluxo: string | null;
  fluxoTipo: string | null;
  fluxoOcioso: number;
  fluxoCobrado: boolean;
};

export type PlanoTurno = {
  funcao: "duvida" | FuncaoDocumento;
  tipo: string | null;
  pacote: Pacote | null;
  // Desvio antes do modelo caro: responde a mensagem fixa, não chama o modelo, não consome cota.
  desvio: { mensagem: string } | null;
  // Cota é por documento, não por mensagem: só o primeiro turno do fluxo consome.
  cobrar: boolean;
  // O que gravar na sessão depois de responder.
  proximoEstado: EstadoFluxo;
  motivo: string;
  trocouDeFluxo: boolean;
};

const FECHADO: EstadoFluxo = { fluxo: null, fluxoTipo: null, fluxoOcioso: 0, fluxoCobrado: false };

function fluxoValido(valor: string | null): FuncaoDocumento | null {
  return valor === "redacao" || valor === "analise" ? valor : null;
}

export async function planejarTurno(input: {
  snapshot: RegrasSnapshot;
  estado: EstadoFluxo;
  // O que o roteador por gatilho decidiu para esta mensagem.
  funcaoRoteada: "duvida" | FuncaoDocumento;
  texto: string;
  anteriores: TurnoAnterior[];
}): Promise<PlanoTurno> {
  const { snapshot, estado, funcaoRoteada, texto, anteriores } = input;
  const aberto = fluxoValido(estado.fluxo);

  let funcao: "duvida" | FuncaoDocumento;
  let motivo: string;
  let encerraDepois = false;

  if (funcaoRoteada !== "duvida") {
    funcao = funcaoRoteada;
    motivo = "pedido explícito na mensagem";
  } else if (aberto) {
    const turno = await classificarTurno(snapshot, aberto, texto, anteriores);
    motivo = `fluxo de ${aberto} aberto; turno classificado como ${turno}`;
    if (turno === "redacao" || turno === "analise") funcao = turno;
    else if (turno === "nova_duvida") funcao = "duvida";
    else { funcao = aberto; encerraDepois = turno === "abandona"; }
  } else {
    funcao = "duvida";
    motivo = "sem fluxo aberto";
  }

  if (funcao === "duvida") {
    // Dúvida no meio de um fluxo não o derruba; ele expira após alguns turnos sem retomar.
    const ocioso = aberto ? estado.fluxoOcioso + 1 : 0;
    const proximoEstado = aberto && ocioso < LIMITE_OCIOSO ? { ...estado, fluxoOcioso: ocioso } : FECHADO;
    return { funcao, tipo: null, pacote: null, desvio: null, cobrar: true, proximoEstado, motivo, trocouDeFluxo: false };
  }

  const mesmoFluxo = aberto === funcao;
  const trocouDeFluxo = Boolean(aberto) && !mesmoFluxo;

  // O tipo é do documento, não do fluxo: na troca análise → redação ele é mantido.
  let tipo = aberto ? estado.fluxoTipo : null;
  let novoDocumento = false;
  if (funcaoRoteada !== "duvida" && mesmoFluxo) {
    // Pedido explícito com o mesmo fluxo aberto pode ser outro documento.
    const classificado = (await classificarTipo(snapshot, texto, anteriores)).tipo;
    if (classificado !== TIPO_OUTRO && classificado !== tipo) { tipo = classificado; novoDocumento = true; }
  } else if (!tipo || tipo === TIPO_OUTRO) {
    tipo = (await classificarTipo(snapshot, texto, anteriores)).tipo;
  }

  const desvio = desvioDaRedacao(snapshot, funcao, tipo);
  if (desvio) {
    return { funcao, tipo, pacote: null, desvio, cobrar: false, proximoEstado: FECHADO, motivo: `${motivo}; tipo ${tipo} desvia antes do modelo`, trocouDeFluxo };
  }

  const cobrar = novoDocumento || !(mesmoFluxo && estado.fluxoCobrado);
  const proximoEstado: EstadoFluxo = encerraDepois
    ? FECHADO
    : { fluxo: funcao, fluxoTipo: tipo, fluxoOcioso: 0, fluxoCobrado: true };

  return { funcao, tipo, pacote: montarPacote(snapshot, funcao, tipo), desvio: null, cobrar, proximoEstado, motivo, trocouDeFluxo };
}
