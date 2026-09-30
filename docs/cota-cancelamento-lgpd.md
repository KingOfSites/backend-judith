# Cota por dúvida, cancelamento e LGPD

Em vigor desde 30/09/2026 (lista do fundador, itens 6, 13 e 15).

## Cota por dúvida, não por mensagem

A primeira dúvida da sessão consome cota e vira o "tema" da sessão (`Session.duvidaTema`,
`Session.duvidaCobradaEm`). Cada mensagem seguinte passa pelo classificador de tema
(`src/judith/cota-duvida.ts`, tier leve): continuação do mesmo assunto, resposta às perguntas
de coleta da JUDITH e pedidos de esclarecimento não cobram; assunto novo cobra e vira o novo
tema. Se o classificador falhar, não cobra. O prompt é editável em Regras → Classificadores
(`classificadorDuvida`); `Message.meta.cotaMotivo` diz por que cobrou ou não. Redação e
análise continuam cobrando por documento (`fluxoCobrado`).

Trial: o aceite dos termos abre 30 dias (`User.trialFimEm`) e grava a versão dos termos
(`User.termosVersao`, constante `TERMOS_VERSAO` em `src/judith/termos.ts`). Sem linha `TRIAL`
no catálogo, o trial usa as cotas do Essencial. Trial vencido recebe o link dos planos.

## Cancelamento pelo WhatsApp

`src/judith/cancelamento.ts`. "Quero cancelar" (só quando é sobre a JUDITH: "cancelar um
contrato com fornecedor" segue como dúvida) mostra o uso do mês e pede SIM/NÃO; a confirmação
vale 15 minutos (`User.cancelamentoPendenteEm`). SIM marca a assinatura `CANCELED` com
`cancelMotivo` e `cancelOrigem`, encerra a recorrência no Mercado Pago pelo site
(`POST /api/assinatura/cancelar`, chave interna) e abre alerta `CANCELAMENTO`. Pagamento aprovado
há menos de 7 dias (art. 49 do CDC): o acesso encerra na hora, o alerta é `ESTORNO` com o
pagamento, e o botão em Alertas dispara o estorno integral pelo site
(`POST /api/assinatura/estornar`). Nunca estorna sozinho. Pelo painel: botão em Usuários →
assinatura (`/internal/assinaturas/:id/cancelar`). Cancelamentos ficam em Assinaturas.

## Exclusão de dados e retenção

Pedido pelo WhatsApp ("quero excluir meus dados") grava `User.exclusaoSolicitadaEm` e abre
alerta `EXCLUSAO_DADOS`; "quero manter meus dados" desfaz. A rotina de retenção
(`src/jobs/retencao.ts`, de madrugada) apaga 30 dias depois do pedido, ou 30 dias depois do
fim do acesso de uma assinatura cancelada sem uso no período. Pelo painel: Usuários → "Excluir
dados" (motivo + EXCLUIR), que chama `/internal/usuarios/:id/excluir`.

A exclusão (`src/retencao/exclusao.ts`) grava em `ArquivoRetencao` (ambiente segregado) o
aceite, o log das conversas e os pagamentos, identificados pelo SHA-256 do número, por 5 anos;
apaga o usuário em cascata (sessões, mensagens, lembretes, uso, assinaturas, créditos), os
rastros da base e as reações; e emite `ExclusaoCertificado`, visível e imprimível em
Exclusões (LGPD). A rotina também apaga arquivos vencidos (5 anos) e `ConversaAcesso` com mais
de 6 meses (art. 15 do Marco Civil).

## Rotinas

`src/jobs/runner.ts` roda a cada 10 minutos (`JOBS_ENABLED`): lembretes e avisos em horário
comercial de Brasília, retenção uma vez por dia entre 3h e 5h. O painel dispara na hora em
Lembretes → "Executar rotinas agora" (`/internal/rotinas/executar`).
