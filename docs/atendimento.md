# Atendimento: formatação, anexos, humano, perfil e dados técnicos

Em vigor desde 30/09/2026.

## Formatação para o WhatsApp

Os modelos escrevem em Markdown; o WhatsApp usa marcação própria. `src/evolution/format.ts`
converte na saída, antes de enviar, tanto para a JUDITH quanto para os bots dos clientes:
`**negrito**` vira `*negrito*`, títulos viram linha em negrito, `- item` vira `• item`,
links viram `texto: url`. O histórico guarda o texto original do modelo.

## Foto ou arquivo

Ainda não há leitura de imagem nem de PDF. Quando chega um anexo, a JUDITH responde com a
mensagem configurada em Classificadores e desvio (`mensagemAnexoNaoLido`), sem chamar o modelo
e sem consumir cota. Antes, o placeholder "(anexo)" entrava como análise e cobrava por nada.
Áudio continua sendo transcrito normalmente.

## Pedido de atendimento humano

Pedido explícito ("quero falar com uma pessoa", "tem atendente?") fora de um documento em
andamento: mensagem fixa (`mensagemAtendimentoHumano`, com o canal de atendimento dos Termos),
alerta `HUMAN_REQUEST` no painel e aviso no WhatsApp de `ALERTA_WHATSAPP`. O alerta não copia
a mensagem do cliente. Sem modelo e sem cota.

## Perfil de quem entra por cortesia

O cadastro pelo painel cria o usuário com onboarding concluído e sem tipo de empresa. Na
primeira conversa a JUDITH pergunta MEI, ME/EPP ou autônomo, guarda a dúvida enviada junto e
responde depois. A dica de onboarding do perfil também sai nessa hora.

## Dados técnicos por turno

`Message.meta` guarda, na resposta da JUDITH: função, modelo real, tipo do documento, regras
que subiram (papel:código · título), se consumiu cota, troca de fluxo, fallback e blocos da
base usados na redação com consulta. Para a dúvida, o rastro completo continua em
`KnowledgeInteraction`, com os blocos recuperados.

## Redação que consulta a base

`TipoDocumento.consultaBase`: a redação roda a mesma busca da dúvida com o relato do cliente,
sempre puxando a área processual (`extraAreas` em `retrieve`), e coloca os blocos no fim do
pacote, depois das regras, para não estragar o cache. Se a busca falhar, a redação segue só
com as regras e registra `redacao.consultaBase.falhou`. Pensado para a petição de Juizado.

## Conteúdo protegido no painel

As telas de conversa mostram só dados técnicos. O texto abre com a senha própria
`ADMIN_CONTEUDO_SENHA` (mínimo 8 caracteres, variável do painel), motivo com pelo menos 15
caracteres e uma das três bases legais da política de privacidade. Toda abertura, certa ou
errada, fica em `ConversaAcesso` com data, e-mail do admin, base legal e motivo.
