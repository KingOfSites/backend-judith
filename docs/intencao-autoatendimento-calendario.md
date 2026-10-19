# Classificadores editáveis, autoatendimento pelo WhatsApp e calendário com avisos

Em vigor desde 19/10/2026 (pedidos do fundador: classificador de intenção e de área no painel,
saudação de quem volta, avulso sem plano, entrega em texto, lembretes configuráveis, conexão do
número da JUDITH).

## Classificador de intenção (`src/judith/intencao.ts`)

Roda em toda mensagem de texto sem anexo e sem documento em andamento, antes do modelo caro, com
o tier leve. Devolve `duvida`, `redacao`, `analise` ou `fora_do_escopo`. O prompt é editável em
Regras → Classificadores (`RegraConfig.classificadorIntencao`); sem ele vale
`PROMPT_INTENCAO_RESERVA`, que trata reclamação de cliente, cobrança e fornecedor como dúvida.
Resultado diferente das palavras-chave do router (`src/judith/router.ts`) prevalece; falha do
classificador cai nas palavras-chave e nunca recusa. `fora_do_escopo` responde
`mensagemForaDoEscopo` (editável) sem modelo e sem cota. `Message.meta.intencao` e
`intencaoOrigem` registram o que valeu.

## Classificador de área (`src/knowledge/provider.ts`)

O critério do assunto da busca (trabalhista, consumidor, lgpd…) é editável em
`RegraConfig.classificadorArea`; `PROMPT_AREA_RESERVA` traz exemplos por área e manda só responder
"nenhuma" quando não houver relação com nenhuma delas. O contrato de saída (uma palavra da lista
ou "nenhuma") é fixo e anexado pelo código. `getKnowledgeContext` lê o prompt pelo cache das
regras (60 s).

## Busca com o contexto da conversa

`contextualize` continua escolhendo um trecho literal do próprio usuário quando a pergunta depende
do histórico, mas o texto de busca agora é a pergunta inteira mais esse trecho (e os termos, quando
válidos), em vez de só termos picotados. A pergunta resolvida leva o contexto para geração e
verificação, como antes.

## Onboarding: funcionário, saudação, avulso, entrega

- Depois do perfil, a JUDITH pergunta se a pessoa tem funcionário registrado
  (`AGUARDANDO_FUNCIONARIOS`, `User.temFuncionarios`). SIM/NÃO livre (`parseSimNao`); mensagem
  longa em vez de resposta conclui sem travar e segue como dúvida. Quem veio do painel já com a
  resposta não é perguntado. Editável no painel (Usuários) e no cadastro de cortesia.
- Textos novos em Onboarding: `saudacaoRetorno` ({nome}), `avulsoSemPlano` e `trialEncerrado`
  ({planos}, {avulso}, {servico}), `entregaDocumento`, `perguntaFuncionarios`,
  `pedirFuncionariosDeNovo`.
- Sem plano ativo, a dúvida recebe `avulsoSemPlano` (ou `trialEncerrado`) com o link avulso gerado
  pelo site (`linkAvulso`). "Quero comprar avulso" recebe o mesmo texto.
- Entrega do documento: PDF com `entregaDocumento` na legenda, ou, quando o cliente pediu em texto
  (`pediuEmTexto` na mensagem ou nas 3 últimas dele) ou o PDF falhou, o texto como mensagem seguido
  da mesma mensagem de entrega. `Message.meta.entrega` = `pdf` | `texto`. A chave antiga de Regras
  (`mensagemEntregaDocumento`) ainda vale se for a única preenchida.

## Autoatendimento (`src/judith/autoatendimento.ts`)

Sem modelo e sem cota: "minha cota" / "quantas dúvidas ainda tenho" (`resumoCota`), "meus
lembretes" (`listarLembretes`), "me lembra dia 15/11 de pagar o aluguel" (`extrairLembrete` +
`criarLembrete`, avisos D-1 e no dia, conta em `UsageEvent LEMBRETE` contra `plano.lembretesMes`),
"quero comprar avulso" (`respostaSemPlano`). O site fica só para a compra; o número é o acesso.

## Calendário de obrigações (`src/jobs/lembretes.ts`, `src/jobs/feriados.ts`)

`ObrigacaoCalendario` ganhou `antecedencias` (lista de dias antes, ex.: `[1]` nas mensais,
`[7,1]` nas anuais), `ajusteDiaUtil` (`POSTERIOR`: DAS vai pro dia útil seguinte; `ANTERIOR`:
FGTS e INSS vêm pro anterior), `diaUtil` (dia = N-ésimo dia útil, sábado conta, como o 5º dia útil
do salário), `somenteComFuncionarios` e `ano` (aviso de uma vez só, com mês). Feriados nacionais
fixos e móveis (Carnaval, Sexta-feira Santa, Corpus Christi) em `feriados.ts`; estaduais e
municipais não entram. `Reminder` guarda `antecedencias` e `etapasEnviadas`; os booleanos
D-3/D-1/dia continuam preenchidos por compatibilidade. Lembretes do calendário não contam na cota
de lembretes do plano.

## Conexão do WhatsApp

Painel → Conexão do WhatsApp lê estado, número e QR code pelo backend
(`/internal/whatsapp/estado`, `/internal/whatsapp/qrcode`, `/internal/whatsapp/desconectar`,
chave interna), que fala com o Evolution (`connectionState`, `connect`, `logout`). O site mostra o
QR do `wa.me` do número (`NEXT_PUBLIC_JUDITH_WHATSAPP`, padrão 5541988686613) na home e em
/planos.
