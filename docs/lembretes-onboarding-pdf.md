# Lembretes, onboarding editável, PDF e leitura de documentos

Em vigor desde 30/09/2026 (lista do fundador, itens 9, 10, 11, 12 e 14).

## Lembretes e calendário (§3.4)

`ObrigacaoCalendario` (editada no painel em Lembretes e calendário): título, descrição, dia,
mês (vazio = todo mês) e perfis. `src/jobs/lembretes.ts` cria um `Reminder` por usuário do
perfil com acesso ativo quando a data entra no horizonte de 3 dias, e envia em D-3, D-1 e no
dia, entre 8h e 20h de Brasília. `LembreteEnvio` impede repetição; falha de envio libera para
o próximo ciclo. Dia 31 em mês curto cai no último dia. Lembretes manuais (`Reminder` sem
`obrigacaoId`) seguem o mesmo envio. A página do usuário lista os lembretes dele e o
calendário do perfil.

## Avisos automáticos

`src/jobs/avisos.ts`: trial D-3 (`User.trialAvisoD3Em`, com `{data}` e `{planos}`) para quem
não assinou; retorno D+1 (`User.retornoD1Em`) para quem aceitou os termos há 24 a 72 horas e
nunca mandou uma dúvida. Textos editáveis em Onboarding.

## Onboarding editável

`OnboardingTexto` (chave → texto) com marcadores `{termos}`, `{dica}`, `{reacao}`, `{planos}`,
`{data}`, `{revisao}`, `{nome}`. Sem linha salva vale a reserva em
`src/judith/onboarding/textos.ts`. Cache de 60 s. As dicas por perfil (`TipDicaOnboarding`)
ganharam liga/desliga, edição e cadastro no painel. A data da base revisada continua em
Ajustes da base; a linha que ela produz também é editável (`revisaoBase`).

## PDF na entrega do documento

`src/judith/pdf.ts` (pdfkit): quando a redação devolve um documento pronto
(`pareceDocumentoPronto`: 1.200+ caracteres, não termina em pergunta, tem cara de documento),
o texto vira PDF A4 com logo (`assets/judith-logo.jpg`), título, negrito, listas e rodapé com
data e numeração. O arquivo sai pelo Evolution (`sendDocument`, `sendMedia`) com a mensagem
de encerramento como legenda (`mensagemEntregaDocumento` em Regras → Classificadores; a
reserva traz a orientação da OAB de passar por um advogado). O histórico guarda o texto
integral e `Message.meta.pdf`. Se o envio do arquivo falhar, o texto vai como mensagem.

## Leitura de PDF e imagem

`src/judith/leitura.ts`: PDF, JPG, PNG e WebP até 15 MB e 20 páginas são transcritos pelo
modelo multimodal (`JUDITH_MODEL_LEITURA`, Gemini) e entram como análise, com a legenda do
cliente como pedido. `Message.meta.anexo` guarda tipo, páginas, caracteres e modelo. Formato
não suportado, arquivo grande, foto sem texto e falha de leitura respondem avisos próprios sem
modelo caro e sem cota; a cota só é consumida quando a JUDITH responde, então falha nunca
cobra. Áudio continua com Whisper.

## Preços avulsos

`ProdutoAvulso` (painel em Preços avulsos): nome, preço e à venda por serviço. O site lê a
tabela em `web/src/lib/avulso.ts` (`carregarServicosAvulso`) com a reserva antiga por baixo, mostra
em /planos e usa no link gerado quando a cota do mês acaba.

## Dizer o Direito

`src/knowledge/dizerodireito.ts`: com `GOOGLE_CSE_KEY` e `GOOGLE_CSE_ID` (Programmable Search
restrito a dizerodireito.com.br), a dúvida cuja base própria trouxe menos de 3 blocos recebe
até 3 artigos como bloco de apoio, com a instrução de citar a URL. Sem as chaves, desligado.
