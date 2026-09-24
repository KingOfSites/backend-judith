# Fechamento das três pendências — 24/09/2026

Escopo: classificação de dados financeiros, continuação sobre prazo de arrependimento e responsabilidade do comerciante por vício. Os três controles úteis são compra pela internet, continuação sobre necessidade de justificar e mudança para LGPD/MEI/encarregado. Não houve deploy, envio por WhatsApp, edição de cadernos, áreas ou prompt editorial.

**Resultado final:** cinco respostas úteis liberadas, pergunta financeira retida sem cobrança, seis controles de suporte corretos (três positivos e três negativos). Classificação e recuperação corrigidas; recusa indevida do comerciante resolvida nos testes finais. O defeito editorial financeiro permanece explicitamente pendente. As correções técnicas estão validadas neste escopo; **não se aprova a liberação jurídica do conjunto com o trecho LGPD atual**.

## Diagnóstico por camada

| Caso | Conteúdo | Recuperação/classificação | Geração | Verificação |
| --- | --- | --- | --- | --- |
| Dados financeiros | O caderno LGPD inclui indevidamente “dados financeiros sigilosos” na enumeração de sensíveis. Depende de revisão editorial | A classificação anterior em civil foi corrigida na taxonomia do classificador para lgpd; não se codificou a resposta jurídica | Pode reproduzir a premissa problemática da fonte e inferir exclusividade a partir dela | Confere suporte textual; uma aprovação não comprova que a fonte é juridicamente correta. Este caso não conta como resposta jurídica aprovada |
| Continuação sobre prazo | Há fonte de arrependimento entre os blocos publicados | A concatenação longa favorecia defeito/garantia e deixava o bloco pertinente fora dos cinco. A consulta curta extrativa recupera o objeto perguntado | Deve conservar literalmente o termo inicial, sem inventar precedência entre eventos | A primeira rodada desta etapa revelou aprovação de “o que for posterior” sem essa precedência na citação; acrescentada barreira específica de suporte temporal, sem alterar o prazo da fonte |
| Responsabilidade do comerciante | Há fonte explícita de solidariedade no caderno consumidor | O bloco pertinente já era recuperado, junto de um bloco de acidente de consumo | Escolhia a regra de acidente para responder sobre vício, até na reformulação. A recusa era desnecessária no fluxo, mas o rascunho era inadequado | A barreira final bloqueava corretamente a transferência de escopo. Não foi enfraquecida para liberar a resposta |

## Mudanças técnicas, sem correção editorial oculta

- `provider.ts`: instrução de taxonomia esclarece que classificação de dados comuns/sensíveis pertence a LGPD, mesmo quando menciona dados financeiros. Saída continua limitada às 12 áreas ou `nenhuma`.
- Para continuação, o contextualizador seleciona um antecedente literal de uma mensagem do usuário e 2–6 trechos literais da pergunta/antecedente, com limite total de 180 caracteres. Trechos inventados, tipos inválidos e consulta sem participação da pergunta atual ou do antecedente são rejeitados. Só mensagens do usuário participam. Pergunta autossuficiente ou mudança de assunto usa somente a pergunta atual.
- `core.ts`: separa `searchText` (embedding) de `resolvedQuestion` (pergunta integral com antecedente, para classificação/geração/verificação). Mantém filtro de área/publicação antes da similaridade, cinco resultados, blocos inteiros e o mesmo modelo de embeddings. Não há busca sem filtro nem escolha de bloco por ID.
- `scope.ts` / `conhecimento.ts`: o conflito de escopo já protegido pela barreira final — capítulo de acidente de consumo para pergunta sobre vício — também impede o uso desse bloco na geração. Os cinco recuperados permanecem na auditoria; a lista `excludedFromGeneration` registra ID e motivo. Não se substitui por um sexto bloco, não se edita fonte e não se cria uma resposta fixa. Perguntas explicitamente sobre acidente ou comparação entre os dois regimes não recebem essa exclusão.
- `grounded-generation-v6`: ferramenta requer `scopeAnalysis` antes da resposta, identificando fato gerador/capítulo/trecho. Acrescenta instrução técnica para conservar termo inicial sem inventar precedência; geração de DUVIDA usa temperatura zero. Essa análise é transitória, não enviada ao usuário nem duplicada na auditoria. Prompt editorial continua intacto.
- `support-v11`: conserva todas as proteções anteriores e rejeita “o que for posterior/primeiro”, “o que vier depois” e variantes cobertas quando a evidência não estabelece essa precedência. A instrução semântica distingue acrescentar ordem de apenas conservar o “ou” da fonte: a segunda situação não exige inventar uma solução para uma ordem não perguntada. O verificador recebe a pergunta completa e usa a mesma seleção de escopo da geração; `sourceIds` e `excludedSourceIds` registram essa seleção no recibo. Um bloco excluído não pode materializar uma citação válida. Os cinco recuperados continuam íntegros na auditoria, e a barreira determinística contra transferência de escopo permanece ativa. No máximo uma reformulação, seguida de nova verificação.

Limites técnicos: seleção de termos por modelo pode perder nuance, embora não possa acrescentar palavras inexistentes. A pergunta completa é preservada para as etapas decisórias. A proteção determinística de escopo é delimitada ao conflito reproduzido; não é um classificador universal de aplicabilidade jurídica. As barreiras de palavras/precedência não cobrem todas as paráfrases possíveis. O julgamento semântico continua sujeito a erros.

## Pendência editorial exata: dados financeiros

Arquivo preservado: [`JUDITH-resumo-lgpd-marco-civil-v3.md`](../review/knowledge-2026-09-24/candidates/JUDITH-resumo-lgpd-marco-civil-v3.md), **linha 109**, CHUNK 5:

> **Dados sensíveis** (saúde, biometria, religião, origem étnica, dados financeiros sigilosos — art. 5º, II e art. 11 LGPD)

O art. 5º, II não inclui genericamente dados financeiros sigilosos no rol de dados sensíveis. O sigilo financeiro não substitui o critério legal. Um dado concreto pode revelar informação de uma categoria sensível, o que exige examinar seu conteúdo. Conferência em fonte primária: [LGPD, art. 5º, II](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), consultada nesta etapa.

**Proposta, não aplicada:** retirar “dados financeiros sigilosos” dessa enumeração e incluir: “Dados financeiros não são automaticamente dados pessoais sensíveis pela LGPD. A classificação depende do conteúdo e das categorias do art. 5º, II; sigilo financeiro e classificação de sensibilidade não são equivalentes.” Submeter a revisão jurídica junto ao contexto do precedente já identificado na [proposta editorial LGPD](lgpd-editorial-proposal-2026-09-24.md). Não transportar a conclusão de um caso concreto para toda informação financeira.

Nenhuma regra de código foi adicionada para devolver essa proposta como resposta, bloquear uma palavra financeira ou substituir silenciosamente a fonte. O resultado real desta pergunta deve ser lido como evidência do defeito editorial, não como aprovação para publicação.

## Procedimento e preservação

Ensaio `test/utility-pending-real-isolated.cjs`, em MariaDB descartável e serviço E5 local descartável na VPS, usando o provedor Anthropic real. Produção foi lida por snapshot consistente somente das fichas publicadas, índice e prompt; não foram consultadas conversas reais nem créditos de contatos. As seis perguntas são sintéticas; os antecedentes de prazo e financeiro são inseridos explicitamente no banco isolado, não atribuídos a uma conversa real. Os três controles úteis percorrem uma mesma sessão real do harness, incluindo resposta anterior e mudança de assunto.

Todas as escritas de usuários, mensagens, auditorias e consumo ocorrem apenas no MariaDB isolado. O cliente de WhatsApp é substituído por funções que falham se chamadas. A concessão usada pelo teste é fictícia e não toca o contato 4822. A regra de `###`, o índice de produção e a publicação dos cadernos permanecem intactos.

Hashes dos 19 originais e das 19 cópias de revisão conferidos contra o manifesto: **38/38 iguais**. Regressão local: **41 testes e 47 cenários de fluxo**, incluindo rejeição, falha técnica/auditoria, preservação do crédito, histórico e deduplicação. `git diff --check` sem erro.

Primeira rodada desta etapa preservada em [utility-pending-first.json](evidence/2026-09-24/utility-pending-first.json): instrução de escopo sozinha não resolveu o comerciante; duas tentativas bloqueadas, zero crédito. A resposta sobre prazo acrescentou precedência ausente. Esses resultados motivaram a exclusão auditável do bloco incompatível e a proteção temporal; não foram contados como aprovação final.

Segunda rodada preservada em [utility-pending-second.json](evidence/2026-09-24/utility-pending-second.json): os seis fluxos retornaram texto, mas a leitura das respostas encontrou “o que vier depois” no controle de compra online. A aprovação do harness não foi aceita como evidência suficiente de qualidade. A variante recebeu regressão e a mesma bateria foi repetida. Os controles auxiliares de esquecimento nessas duas rodadas usavam a pergunta financeira, por herança do harness; não são usados para comprovar essa barreira. A rodada final corrige o controle para a pergunta sobre eliminação.

Terceira rodada preservada em [utility-pending-third.json](evidence/2026-09-24/utility-pending-third.json): a barreira reteve a precedência inventada, mas o juiz recusou também a reformulação fiel “O prazo é de 7 dias, contados da assinatura do contrato ou do recebimento do produto”. Esse foi um falso bloqueio de verificação, com zero crédito. `support-v10` esclarece a diferença sem liberar a precedência; um par de controles reais positivo/negativo usa exatamente esses rascunhos e a fonte recuperada. A pergunta financeira também ficou sem resposta e sem cobrança nessa rodada, mas isso não elimina a premissa editorial incorreta que gerou respostas liberadas nas anteriores.

Quarta rodada preservada em [utility-pending-fourth.json](evidence/2026-09-24/utility-pending-fourth.json): os cinco fluxos com fonte adequada responderam e financeiro ficou sem cobrança, porém o controle positivo de solidariedade foi recusado pelo juiz. Ele tratou a regra do capítulo de acidente como contradição da regra de vício. Isso justificou aplicar a mesma seleção auditável de escopo também ao verificador (`support-v11`), em vez de liberar a resposta contra um voto negativo. O controle negativo continua exigindo bloqueio; citações de fontes excluídas não podem ser aceitas.

## Resultados reais da versão final

Execução UTC: 2026-09-24T21:51:56.375Z a 2026-09-24T21:54:06.749Z. Modelo: `claude-haiku-4-5-20251001`. Políticas `grounded-generation-v6` / `support-v11`.

[Recibo integral](evidence/2026-09-24/utility-pending-final.json) e [métricas/hashes do código](evidence/2026-09-24/utility-pending-summary.json). Os IDs/versões/conteúdo/escores dos cinco blocos de cada busca estão no recibo; abaixo ficam a resposta e as evidências efetivamente citadas pelo verificador.

| Caso | Área | Resultado técnico | Tentativas | Crédito isolado | Latência |
| --- | --- | --- | ---: | ---: | ---: |
| lgpd-financial | lgpd | SUPPORT_INSUFFICIENT | 2 | 0 | 13.791 s |
| consumer-followup | consumidor | Resposta liberada | 2 | 1 | 16.962 s |
| final-holdout-suppliers | consumidor | Resposta liberada | 1 | 1 | 11.625 s |
| extra-online | consumidor | Resposta liberada | 2 | 1 | 20.903 s |
| extra-followup | consumidor | Resposta liberada | 1 | 1 | 13.744 s |
| extra-change | lgpd | Resposta liberada | 1 | 1 | 11.877 s |

Dados financeiros: aprovação de suporte, quando ocorre, não conta como aprovação jurídica. A pendência editorial permanece independentemente do veredicto desta execução.

### lgpd-financial

Pergunta: Responda em uma frase: dados financeiros são automaticamente dados sensíveis?

Consulta de embedding: `Responda em uma frase: dados financeiros são automaticamente dados sensíveis?`

Resposta final capturada (sem envio):

> Não encontrei suporte suficiente para responder com segurança a esse ponto específico. Prefiro não afirmar prazos ou consequências sem essa referência. Consulte um advogado para avaliar o caso. Nenhum crédito foi consumido.

Nenhuma evidência final aceita; resposta substantiva não liberada.


### consumer-followup

Pergunta: E qual é o prazo para exercer esse direito?

Consulta de embedding: `prazo para exercer esse direito desistir da compra produto pela internet`

Resposta final capturada (sem envio):

> O prazo é de 7 dias, contados da assinatura do contrato ou do recebimento do produto.

Evidências aceitas pelo verificador:

- `cmuftcwlo00pz48hx6ea52k2k` — CHUNK 7 — CONTRATOS: CLÁUSULAS ABUSIVAS; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

### final-holdout-suppliers

Pergunta: No CDC, quem responde pelo vício do produto: apenas o fabricante ou também o comerciante?

Consulta de embedding: `No CDC, quem responde pelo vício do produto: apenas o fabricante ou também o comerciante?`

Resposta final capturada (sem envio):

> No CDC, a responsabilidade pelo vício do produto é solidária: o fabricante, o comerciante e a assistência técnica respondem juntos. O comerciante não pode se recusar a receber o produto com defeito ou mandar o consumidor direto para o fabricante — tem obrigação de intermediar a reparação, recebendo o produto, encaminhando e acompanhando até a devolução corrigida. Se o vício não for sanado em 30 dias, o consumidor pode exigir troca, reembolso ou abatimento de qualquer um deles.

Evidências aceitas pelo verificador:

- `cmuftd4nm00rp48hxdiu2tetk` — COMPLEMENTO STJ — Consumidor: Jurisprudência Prática; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcq2800ol48hxb9a4dzzr` — Q&A — VÍCIO DO PRODUTO; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

Excluídos da geração por escopo, mas preservados entre os recuperados/auditados: [{"id": "cmuftcrw600oz48hxo4ev1p03", "reason": "SOURCE_SCOPE_CONFLICT"}].

### extra-online

Pergunta: Comprei um produto pela internet. Tenho direito de desistir da compra?

Consulta de embedding: `Comprei um produto pela internet. Tenho direito de desistir da compra?`

Resposta final capturada (sem envio):

> Sim. Compras pela internet conferem direito de desistência: você tem 7 dias para se arrepender sem justificar, contados da assinatura do contrato ou do recebimento do produto, e tudo que pagou deve ser devolvido integralmente com correção monetária.

Evidências aceitas pelo verificador:

- `cmuftcwlo00pz48hx6ea52k2k` — CHUNK 7 — CONTRATOS: CLÁUSULAS ABUSIVAS; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

### extra-followup

Pergunta: E preciso explicar por que quero desistir?

Consulta de embedding: `preciso explicar por que quero desistir desistir da compra`

Resposta final capturada (sem envio):

> Não, você não precisa explicar o motivo. Compra pela internet dá direito de arrependimento de 7 dias sem justificativa — basta comunicar a desistência ao fornecedor. O prazo conta da assinatura do contrato ou do recebimento do produto, e você recebe de volta tudo que pagou, com correção monetária.

Evidências aceitas pelo verificador:

- `cmuftcwlo00pz48hx6ea52k2k` — CHUNK 7 — CONTRATOS: CLÁUSULAS ABUSIVAS; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

### extra-change

Pergunta: Agora sobre proteção de dados: sendo MEI sem tratamento de alto risco, preciso indicar formalmente um encarregado de dados?

Consulta de embedding: `Agora sobre proteção de dados: sendo MEI sem tratamento de alto risco, preciso indicar formalmente um encarregado de dados?`

Resposta final capturada (sem envio):

> Não. A Resolução CD/ANPD nº 2/2022 dispensa agentes de tratamento de pequeno porte — como MEI, ME e EPP sem tratamento de alto risco — da indicação formal de encarregado de dados. Se um cliente ou parceiro perguntar quem é seu DPO, você pode informar que está dispensado dessa obrigação por enquadramento como agente de pequeno porte conforme a regulamentação da ANPD.

Evidências aceitas pelo verificador:

- `cmuftb3zk00cx48hx8r257nex` — Q&A — LGPD na prática do pequeno empresário; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.

### Controles de suporte e custo do modelo

| Controle | Resposta esperada | Resultado |
| --- | --- | --- |
| final-holdout-suppliers / bad | Bloquear | Bloqueada |
| final-holdout-suppliers / good | Aceitar | Aceita |
| topic-change / bad | Bloquear | Bloqueada |
| topic-change / good | Aceitar | Aceita |
| temporal-ordering / bad | Bloquear | Bloqueada |
| temporal-ordering / good | Aceitar | Aceita |

Barreira auxiliar de equivalência com esquecimento: supported=False; voto positivo forçado também bloqueado=True. Usa pergunta de eliminação e fonte sintética, não é recuperação real nem um sétimo fluxo de usuário.

| Etapa | Chamadas | Mediana | Entrada | Saída | Leitura de cache | Escrita de cache |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| select_context | 4 | 1255.0 ms | 4390 | 290 | 0 | 0 |
| classification | 6 | 646.5 ms | 1782 | 32 | 0 | 0 |
| grounded_answer | 9 | 4086 ms | 11927 | 2716 | 168434 | 0 |
| support_verdict | 15 | 4911 ms | 77880 | 6250 | 0 | 0 |

Totais apenas da rodada final, incluindo controles diretos; não representam o custo acumulado do desenvolvimento. Uso do provedor existe mesmo quando o usuário não é cobrado.

Snapshot: 18 documentos, 503 blocos, 503 vetores; SHA-256 `4355951f0a8edee4e579df268e6a1c07399a0346685eced715986d7ce1a894ae`. Prompt `v22072026`, hash da seção A `1074a64ce472b3a5664cda40300efcde9d9398df5b6b6e9f43e5dc9d2322bb9d`. SHA-256 do recibo final `04aa66739819d020c89d34a1a0686118653202f5433225473de80398d1c38dd7`.

## Conclusão para publicação

1. **Técnico concluído neste escopo:** classificação financeira em LGPD, recuperação da continuação e uso/verificação de fonte pertinente ao vício. Cinco respostas com base adequada passaram, incluindo os três controles úteis anteriores. Não foi necessário alterar os cadernos nem retirar a barreira final.
2. **Editorial pendente e impeditivo para aprovar o conjunto jurídico:** linha 109 do caderno LGPD. A última execução reteve a resposta e preservou o crédito, mas execuções anteriores reproduziram e aprovaram a premissa incorreta. O verificador de suporte não corrige uma fonte errada. A proposta está acima e depende de aprovação editorial; não foi aplicada nem compensada no código.
3. **O que pode avançar:** o código das correções técnicas está validado localmente e pode integrar uma versão candidata à publicação. Não recomendo liberar o conjunto backend/base como juridicamente aprovado mantendo essa fonte conhecida como problemática. Uma publicação posterior continua dependendo da decisão editorial e da autorização operacional; nenhuma publicação foi executada aqui.
4. **Limitações que permaneceriam:** amostra delimitada a seis casos, mesmo modelo/provedor, sem garantia universal de classificação, recuperação ou verificação. A proteção por escopo e por expressão temporal cobre conflitos reproduzidos, não toda linguagem jurídica. Mesmo temperatura zero não assegura determinismo do provedor. A latência final foi de 11,6–20,9 segundos; houve uso adicional de modelo mesmo no bloqueio sem crédito. Não houve teste hospedado no backend ativo nem teste de entrega pelo WhatsApp.

Encerramento operacional: `check-pending-cleanup.sh` retornou `PRIVATE_TEMP_REMOVED`, sem containers/rede de teste remanescentes; arquivos temporários de credencial e snapshot removidos de todas as rodadas. Produção permanece `running` na revisão `9959f206770b1104d9d1cf4f8e7b1a2f372a58e9`. Recibos e imagens de teste isoladas foram preservados. Não houve alteração de dados reais, conexão, cobrança, cadernos, prompts ou publicação.
