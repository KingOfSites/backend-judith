# Respostas e fontes — ensaio isolado de utilidade

Saídas literais do backend em teste, não uma revisão jurídica independente. As fontes editoriais permanecem como recebidas. IDs e versões correspondem ao snapshot do índice publicado copiado para o banco isolado. A tabela combina a rodada ampla v6 com os cinco fluxos repetidos em v7, identificados pela política. As demais respostas aprovadas de v6 passaram por replay local do veredicto em v7; isso não é nova geração no provedor.

| Caso | Política | Área | Resultado | Gerações | Crédito isolado | Latência total |
| --- | --- | --- | --- | ---: | ---: | ---: |
| lgpd-deletion | support-v6 | lgpd | Resposta aprovada | 2 | 1 | 17217 ms |
| lgpd-refusal | support-v6 | lgpd | SUPPORT_INSUFFICIENT | 2 | 0 | 13760 ms |
| lgpd-financial | support-v6 | civil | SUPPORT_INSUFFICIENT | 2 | 0 | 9912 ms |
| topic-change | support-v6 | consumidor | Resposta aprovada | 1 | 1 | 10095 ms |
| consumer-followup | support-v6 | consumidor | SUPPORT_INSUFFICIENT | 2 | 0 | 11922 ms |
| holdout-access | support-v6 | lgpd | SUPPORT_INSUFFICIENT | 1 | 0 | 1936 ms |
| holdout-dpo | support-v6 | lgpd | SUPPORT_INSUFFICIENT | 1 | 0 | 1801 ms |
| holdout-consumer | support-v6 | consumidor | Resposta aprovada | 1 | 1 | 8125 ms |
| unsupported-statistic | support-v6 | — | KNOWLEDGE_OUT_OF_SCOPE | 0 | 0 | 676 ms |
| unsupported-personal | support-v6 | — | KNOWLEDGE_OUT_OF_SCOPE | 0 | 0 | 729 ms |
| new-holdout-nondurable | support-v6 | consumidor | Resposta aprovada | 1 | 1 | 7910 ms |
| new-holdout-small-dpo | support-v6 | lgpd | Resposta aprovada | 1 | 1 | 7963 ms |
| final-holdout-store | support-v6 | consumidor | Resposta aprovada | 1 | 1 | 10440 ms |
| final-holdout-suppliers | support-v7 | consumidor | SUPPORT_INSUFFICIENT | 2 | 0 | 17469 ms |
| extra-online | support-v7 | consumidor | Resposta aprovada | 2 | 1 | 18129 ms |
| extra-followup | support-v7 | consumidor | Resposta aprovada | 1 | 1 | 8751 ms |
| extra-change | support-v7 | lgpd | Resposta aprovada | 1 | 1 | 10185 ms |
| extra-unsupported | support-v7 | — | KNOWLEDGE_OUT_OF_SCOPE | 0 | 0 | 883 ms |

## lgpd-deletion

Pergunta: Pela LGPD, um cliente pode pedir a eliminação de dados?

Resposta final:

> Sim, o cliente tem direito de pedir exclusão dos dados tratados com base em consentimento. Se o tratamento se baseia em obrigação legal ou contrato em vigor, você pode manter os dados pelo tempo necessário para cumprir essas exigências.

Estágio: `support_passed`. Consulta: `Pela LGPD, um cliente pode pedir a eliminação de dados?`.

Blocos efetivamente recuperados:

- `cmuftb3zk00cx48hx8r257nex` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; Q&A — LGPD na prática do pequeno empresário; score 0.8911; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb37g00cr48hx74onvyop` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 3 — Direitos dos titulares: o que o cliente pode exigir; score 0.8630; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb5au00d748hxka0km3fb` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 8 — LGPD nas relações de trabalho: dados de funcionários e prestadores; score 0.8566; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb2oi00cn48hxweh8pptq` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 1 — O que é a LGPD e por que o MEI precisa saber; score 0.8538; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb2xw00cp48hxxv97r5g4` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 2 — Bases legais: quando posso usar dados de clientes?; score 0.8536; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.

Blocos citados pela verificação aprovada: cmuftb37g00cr48hx74onvyop, cmuftb3zk00cx48hx8r257nex.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## lgpd-refusal

Pergunta: E se a empresa se recusar a apagar?

Resposta final:

> Não encontrei suporte suficiente para responder com segurança a esse ponto específico. Prefiro não afirmar prazos ou consequências sem essa referência. Consulte um advogado para avaliar o caso. Nenhum crédito foi consumido.

Estágio: `generation_no_support`. Consulta: `E se a empresa se recusar a apagar?
Contexto informado pelo usuário: Pela LGPD, um cliente pode pedir a eliminação de dados?`.

Blocos efetivamente recuperados:

- `cmuftb3zk00cx48hx8r257nex` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; Q&A — LGPD na prática do pequeno empresário; score 0.9077; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb37g00cr48hx74onvyop` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 3 — Direitos dos titulares: o que o cliente pode exigir; score 0.8807; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb3q500cv48hxdhxbxmj7` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 5 — Sanções: o que acontece se descumprir a LGPD; score 0.8729; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb5au00d748hxka0km3fb` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 8 — LGPD nas relações de trabalho: dados de funcionários e prestadores; score 0.8724; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb2xw00cp48hxxv97r5g4` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 2 — Bases legais: quando posso usar dados de clientes?; score 0.8706; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.

Blocos citados pela verificação aprovada: nenhum veredicto final aprovado.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## lgpd-financial

Pergunta: Responda em uma frase: dados financeiros são automaticamente dados sensíveis?

Resposta final:

> Não encontrei suporte suficiente para responder com segurança a esse ponto específico. Prefiro não afirmar prazos ou consequências sem essa referência. Consulte um advogado para avaliar o caso. Nenhum crédito foi consumido.

Estágio: `generation_no_support`. Consulta: `Responda em uma frase: dados financeiros são automaticamente dados sensíveis?`.

Blocos efetivamente recuperados:

- `cmuftahpn008j48hx0vm575i8` — JUDITH — Resumo RAG: Direito Civil — Parte Geral (LINDB + Parte Geral); RODADA 4 — TEORIA DO FATO JURÍDICO + NEGÓCIO JURÍDICO; score 0.8433; versão `13d70ef581a73c74b083e9cdaa481e571a94076012782b8d52003287d41dabde`.
- `cmuftaf3s007z48hxhbqw2sdm` — JUDITH — Resumo RAG: Direito Civil — Parte Geral (LINDB + Parte Geral); RODADA 2 — DIREITOS DA PERSONALIDADE; score 0.8375; versão `13d70ef581a73c74b083e9cdaa481e571a94076012782b8d52003287d41dabde`.
- `cmuftamqd009j48hxky7zir6q` — JUDITH — Resumo RAG: Direito Civil III; BLOCO 10 — MANDATO E DEPÓSITO; score 0.8361; versão `09dbb3113f95ffba0cb760090cf13800eadc17ed35443f6dd323bdc2d1dd7b15`.
- `cmuftbg1e00fb48hxdvvmoj0m` — JUDITH — Resumo RAG: Direito Civil II; BLOCO 4 — RESPONSABILIDADE CIVIL: quando surge o dever de indenizar (subjetiva × objetiva; empregado, terceirizado; excludentes); score 0.8360; versão `1e05be24ede4f60376963cd80a63084a39163b1a74755ad516292f87ead86bb1`.
- `cmuftah6y008f48hxhcrn3n1x` — JUDITH — Resumo RAG: Direito Civil — Parte Geral (LINDB + Parte Geral); RODADA 3 — PESSOA JURÍDICA + DOMICÍLIO + BENS; score 0.8359; versão `13d70ef581a73c74b083e9cdaa481e571a94076012782b8d52003287d41dabde`.

Blocos citados pela verificação aprovada: nenhum veredicto final aprovado.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## topic-change

Pergunta: Mudando de assunto: comprei um produto pela internet. Posso desistir da compra mesmo sem defeito?

Resposta final:

> Sim, você tem direito de arrependimento de 7 dias para desistir de compras feitas fora do estabelecimento (internet, telefone, por catálogo, porta a porta) — sem precisar justificar. O prazo conta da assinatura do contrato ou do recebimento do produto, e você recebe de volta tudo que pagou, com correção monetária. A exceção é para produtos personalizados ou perecíveis (bolo sob encomenda, roupa sob medida, convite gravado), onde alguns fornecedores argumentam poder reter ao menos os custos incorridos — nesse caso, é bom conversar antes de fazer a devolução.

Estágio: `support_passed`. Consulta: `Mudando de assunto: comprei um produto pela internet. Posso desistir da compra mesmo sem defeito?`.

Blocos efetivamente recuperados:

- `cmuftd4nm00rp48hxdiu2tetk` — JUDITH — Base de Conhecimento: Direito do Consumidor; COMPLEMENTO STJ — Consumidor: Jurisprudência Prática; score 0.8825; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcq2800ol48hxb9a4dzzr` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — VÍCIO DO PRODUTO; score 0.8819; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd5fn00rv48hxjvduc59i` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 17 — TROCA DE PRODUTO SEM DEFEITO: O LOJISTA É OBRIGADO?; score 0.8805; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcwlo00pz48hx6ea52k2k` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 7 — CONTRATOS: CLÁUSULAS ABUSIVAS; score 0.8773; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd1ja00r148hxcuy4gzmb` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — DEFESA JUDICIAL E DIREITOS PRÁTICOS; score 0.8773; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

Blocos citados pela verificação aprovada: cmuftcwlo00pz48hx6ea52k2k.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## consumer-followup

Pergunta: E qual é o prazo para exercer esse direito?

Resposta final:

> Não encontrei suporte suficiente para responder com segurança a esse ponto específico. Prefiro não afirmar prazos ou consequências sem essa referência. Consulte um advogado para avaliar o caso. Nenhum crédito foi consumido.

Estágio: `generation_no_support`. Consulta: `E qual é o prazo para exercer esse direito?
Contexto informado pelo usuário: comprei um produto pela internet. Posso desistir da compra mesmo sem defeito?`.

Blocos efetivamente recuperados:

- `cmuftcq2800ol48hxb9a4dzzr` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — VÍCIO DO PRODUTO; score 0.8829; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd1ja00r148hxcuy4gzmb` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — DEFESA JUDICIAL E DIREITOS PRÁTICOS; score 0.8806; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcrdd00ov48hxlh2eizye` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — PRAZOS IMPORTANTES (RESUMO); score 0.8797; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd4nm00rp48hxdiu2tetk` — JUDITH — Base de Conhecimento: Direito do Consumidor; COMPLEMENTO STJ — Consumidor: Jurisprudência Prática; score 0.8763; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd3mf00rh48hxdzh6qgqb` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 15 — CDC DO LADO DO FORNECEDOR: O QUE ME E EPP PRECISAM SABER; score 0.8759; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

Blocos citados pela verificação aprovada: nenhum veredicto final aprovado.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## holdout-access

Pergunta: Qual é o prazo para a declaração completa de acesso aos meus dados pessoais na LGPD?

Resposta final:

> Não encontrei suporte suficiente para responder com segurança a esse ponto específico. Prefiro não afirmar prazos ou consequências sem essa referência. Consulte um advogado para avaliar o caso. Nenhum crédito foi consumido.

Estágio: `generation_no_support`. Consulta: `Qual é o prazo para a declaração completa de acesso aos meus dados pessoais na LGPD?`.

Blocos efetivamente recuperados:

- `cmuftb3zk00cx48hx8r257nex` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; Q&A — LGPD na prática do pequeno empresário; score 0.8626; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb5au00d748hxka0km3fb` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 8 — LGPD nas relações de trabalho: dados de funcionários e prestadores; score 0.8563; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb3q500cv48hxdhxbxmj7` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 5 — Sanções: o que acontece se descumprir a LGPD; score 0.8561; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb2oi00cn48hxweh8pptq` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 1 — O que é a LGPD e por que o MEI precisa saber; score 0.8518; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb3gs00ct48hxan59n1eq` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 4 — Segurança de dados: o que o MEI deve fazer na prática; score 0.8444; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.

Blocos citados pela verificação aprovada: nenhum veredicto final aprovado.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## holdout-dpo

Pergunta: Na LGPD, qual é a função do encarregado de dados?

Resposta final:

> Não encontrei suporte suficiente para responder com segurança a esse ponto específico. Prefiro não afirmar prazos ou consequências sem essa referência. Consulte um advogado para avaliar o caso. Nenhum crédito foi consumido.

Estágio: `generation_no_support`. Consulta: `Na LGPD, qual é a função do encarregado de dados?`.

Blocos efetivamente recuperados:

- `cmuftb3zk00cx48hx8r257nex` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; Q&A — LGPD na prática do pequeno empresário; score 0.8521; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb5au00d748hxka0km3fb` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 8 — LGPD nas relações de trabalho: dados de funcionários e prestadores; score 0.8403; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb2oi00cn48hxweh8pptq` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 1 — O que é a LGPD e por que o MEI precisa saber; score 0.8372; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb3q500cv48hxdhxbxmj7` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 5 — Sanções: o que acontece se descumprir a LGPD; score 0.8316; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb2xw00cp48hxxv97r5g4` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 2 — Bases legais: quando posso usar dados de clientes?; score 0.8310; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.

Blocos citados pela verificação aprovada: nenhum veredicto final aprovado.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## holdout-consumer

Pergunta: Comprei um produto durável com defeito aparente. Qual é o prazo para reclamar ao fornecedor?

Resposta final:

> Para produto durável com defeito aparente, você tem 90 dias para reclamar ao fornecedor, contados a partir da entrega do produto. Durante esse prazo, se reclamar formalmente ao fornecedor, o tempo congela enquanto ele responde — e volta a correr do ponto onde parou caso ele rejeite seu pedido.

Estágio: `support_passed`. Consulta: `Comprei um produto durável com defeito aparente. Qual é o prazo para reclamar ao fornecedor?`.

Blocos efetivamente recuperados:

- `cmuftcrdd00ov48hxlh2eizye` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — PRAZOS IMPORTANTES (RESUMO); score 0.8856; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd1ja00r148hxcuy4gzmb` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — DEFESA JUDICIAL E DIREITOS PRÁTICOS; score 0.8808; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcq2800ol48hxb9a4dzzr` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — VÍCIO DO PRODUTO; score 0.8774; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd4nm00rp48hxdiu2tetk` — JUDITH — Base de Conhecimento: Direito do Consumidor; COMPLEMENTO STJ — Consumidor: Jurisprudência Prática; score 0.8710; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcpsu00oj48hxjrkivzr7` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 2 — DEFEITO vs. VÍCIO: A DIFERENÇA CRUCIAL; score 0.8688; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

Blocos citados pela verificação aprovada: cmuftcpsu00oj48hxjrkivzr7, cmuftcrdd00ov48hxlh2eizye.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## unsupported-statistic

Pergunta: Qual é a porcentagem exata de pequenos empresários que perderam ações por recusa de apagar dados em Curitiba em 2025?

Resposta final:

> Atendo dúvidas nas áreas jurídicas disponíveis na JUDITH. Não identifiquei sua pergunta nesse escopo. Se for uma dúvida jurídica, diga o assunto e o que aconteceu. Nenhum crédito foi consumido.

Estágio: `retrieval_failed`. Consulta: `não houve recuperação`.


## unsupported-personal

Pergunta: Pela LGPD, qual foi o valor exato da indenização no processo particular de Maria Silva contra a Loja Aurora, ajuizado ontem em Curitiba?

Resposta final:

> Atendo dúvidas nas áreas jurídicas disponíveis na JUDITH. Não identifiquei sua pergunta nesse escopo. Se for uma dúvida jurídica, diga o assunto e o que aconteceu. Nenhum crédito foi consumido.

Estágio: `retrieval_failed`. Consulta: `não houve recuperação`.


## new-holdout-nondurable

Pergunta: Qual é o prazo para reclamar de um vício aparente em produto não durável?

Resposta final:

> O prazo para reclamar de um vício aparente em produto não durável (como alimentos e bebidas) é de 30 dias, contados da entrega do produto. Esse prazo é de decadência, o que significa que, se você não reclamar dentro desses 30 dias, perde o direito de cobrar reparação do fornecedor. No entanto, se você fizer reclamação formal ao fornecedor (por e-mail, WhatsApp ou por escrito), esse prazo fica congelado enquanto o fornecedor não responder de forma clara e negativa.

Estágio: `support_passed`. Consulta: `Qual é o prazo para reclamar de um vício aparente em produto não durável?`.

Blocos efetivamente recuperados:

- `cmuftcq2800ol48hxb9a4dzzr` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — VÍCIO DO PRODUTO; score 0.8848; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcrdd00ov48hxlh2eizye` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — PRAZOS IMPORTANTES (RESUMO); score 0.8802; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd1ja00r148hxcuy4gzmb` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — DEFESA JUDICIAL E DIREITOS PRÁTICOS; score 0.8766; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd4nm00rp48hxdiu2tetk` — JUDITH — Base de Conhecimento: Direito do Consumidor; COMPLEMENTO STJ — Consumidor: Jurisprudência Prática; score 0.8658; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcpsu00oj48hxjrkivzr7` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 2 — DEFEITO vs. VÍCIO: A DIFERENÇA CRUCIAL; score 0.8645; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

Blocos citados pela verificação aprovada: cmuftcpsu00oj48hxjrkivzr7, cmuftcrdd00ov48hxlh2eizye.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## new-holdout-small-dpo

Pergunta: Sou MEI e não faço tratamento de dados de alto risco. Preciso indicar formalmente um encarregado de dados?

Resposta final:

> Não, você está dispensado. A Resolução CD/ANPD nº 2/2022 dispensa agentes de tratamento de pequeno porte da indicação formal de encarregado de dados — como MEI que não realiza tratamento de alto risco, essa obrigação não se aplica a você.

Estágio: `support_passed`. Consulta: `Sou MEI e não faço tratamento de dados de alto risco. Preciso indicar formalmente um encarregado de dados?`.

Blocos efetivamente recuperados:

- `cmuftb3zk00cx48hx8r257nex` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; Q&A — LGPD na prática do pequeno empresário; score 0.8796; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb3gs00ct48hxan59n1eq` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 4 — Segurança de dados: o que o MEI deve fazer na prática; score 0.8600; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb5au00d748hxka0km3fb` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 8 — LGPD nas relações de trabalho: dados de funcionários e prestadores; score 0.8596; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb2xw00cp48hxxv97r5g4` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 2 — Bases legais: quando posso usar dados de clientes?; score 0.8587; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb3q500cv48hxdhxbxmj7` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 5 — Sanções: o que acontece se descumprir a LGPD; score 0.8572; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.

Blocos citados pela verificação aprovada: cmuftb3zk00cx48hx8r257nex.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## final-holdout-store

Pergunta: O direito de arrependimento de sete dias também vale para compra que fiz dentro da loja física?

Resposta final:

> Não. O direito de arrependimento de 7 dias vale apenas para compra feita fora do estabelecimento comercial — internet, telefone, porta de casa, catálogo. Em compra feita dentro da loja física, não existe direito legal de desistência; trocar por tamanho, cor ou gosto é apenas cortesia da loja, salvo se a loja houver anunciado uma política de troca (aí a promessa vincula).

Estágio: `support_passed`. Consulta: `O direito de arrependimento de sete dias também vale para compra que fiz dentro da loja física?`.

Blocos efetivamente recuperados:

- `cmuftcwlo00pz48hx6ea52k2k` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 7 — CONTRATOS: CLÁUSULAS ABUSIVAS; score 0.8751; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd5fn00rv48hxjvduc59i` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 17 — TROCA DE PRODUTO SEM DEFEITO: O LOJISTA É OBRIGADO?; score 0.8619; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd1ja00r148hxcuy4gzmb` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — DEFESA JUDICIAL E DIREITOS PRÁTICOS; score 0.8617; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd2ku00r948hxjhem60f4` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 12-A — FORTUITO INTERNO vs. EXTERNO: SISTEMATIZAÇÃO; score 0.8596; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd4nm00rp48hxdiu2tetk` — JUDITH — Base de Conhecimento: Direito do Consumidor; COMPLEMENTO STJ — Consumidor: Jurisprudência Prática; score 0.8590; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

Blocos citados pela verificação aprovada: cmuftcwlo00pz48hx6ea52k2k, cmuftd5fn00rv48hxjvduc59i.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-main-v6.json](evidence/2026-09-24/utility-main-v6.json).

## final-holdout-suppliers

Pergunta: No CDC, quem responde pelo vício do produto: apenas o fabricante ou também o comerciante?

Resposta final:

> Não encontrei suporte suficiente para responder com segurança a esse ponto específico. Prefiro não afirmar prazos ou consequências sem essa referência. Consulte um advogado para avaliar o caso. Nenhum crédito foi consumido.

Estágio: `support_rejected`. Consulta: `No CDC, quem responde pelo vício do produto: apenas o fabricante ou também o comerciante?`.

Blocos efetivamente recuperados:

- `cmuftd4nm00rp48hxdiu2tetk` — JUDITH — Base de Conhecimento: Direito do Consumidor; COMPLEMENTO STJ — Consumidor: Jurisprudência Prática; score 0.8821; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcq2800ol48hxb9a4dzzr` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — VÍCIO DO PRODUTO; score 0.8800; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcrw600oz48hxo4ev1p03` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 4 — RESPONSABILIDADE POR ACIDENTE DE CONSUMO; score 0.8695; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcp0o00od48hxof9eckpz` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — CONCEITOS FUNDAMENTAIS; score 0.8659; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd3d200rf48hx3ec47l6h` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 15 — CDC DO LADO DO FORNECEDOR: O QUE ME E EPP PRECISAM SABER; score 0.8644; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

Blocos citados pela verificação aprovada: nenhum veredicto final aprovado.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-real-final.json](evidence/2026-09-24/utility-real-final.json).

## extra-online

Pergunta: Comprei um produto pela internet. Tenho direito de desistir da compra?

Resposta final:

> Sim. Compras pela internet permitem desistência em até 7 dias, contados da assinatura do contrato ou recebimento do produto, sem precisar justificar, e o valor pago deve ser devolvido integralmente com correção monetária.

Estágio: `support_passed`. Consulta: `Comprei um produto pela internet. Tenho direito de desistir da compra?`.

Blocos efetivamente recuperados:

- `cmuftcwlo00pz48hx6ea52k2k` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 7 — CONTRATOS: CLÁUSULAS ABUSIVAS; score 0.8760; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd3mf00rh48hxdzh6qgqb` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 15 — CDC DO LADO DO FORNECEDOR: O QUE ME E EPP PRECISAM SABER; score 0.8637; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd1ja00r148hxcuy4gzmb` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — DEFESA JUDICIAL E DIREITOS PRÁTICOS; score 0.8633; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd4nm00rp48hxdiu2tetk` — JUDITH — Base de Conhecimento: Direito do Consumidor; COMPLEMENTO STJ — Consumidor: Jurisprudência Prática; score 0.8630; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcq2800ol48hxb9a4dzzr` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — VÍCIO DO PRODUTO; score 0.8629; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

Blocos citados pela verificação aprovada: cmuftcwlo00pz48hx6ea52k2k.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-real-final.json](evidence/2026-09-24/utility-real-final.json).

## extra-followup

Pergunta: E preciso explicar por que quero desistir?

Resposta final:

> Não, você não precisa explicar o motivo. Quem compra fora do estabelecimento comercial — pela internet, telefone, porta de casa ou catálogo — tem direito de desistir em até 7 dias contados da assinatura do contrato ou recebimento do produto, sem justificar. Tudo que pagou deve ser devolvido integralmente com correção monetária.

Estágio: `support_passed`. Consulta: `E preciso explicar por que quero desistir?
Contexto informado pelo usuário: Comprei um produto pela internet. Tenho direito de desistir da compra?`.

Blocos efetivamente recuperados:

- `cmuftcwlo00pz48hx6ea52k2k` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 7 — CONTRATOS: CLÁUSULAS ABUSIVAS; score 0.8802; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd3mf00rh48hxdzh6qgqb` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 15 — CDC DO LADO DO FORNECEDOR: O QUE ME E EPP PRECISAM SABER; score 0.8782; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd3d200rf48hx3ec47l6h` — JUDITH — Base de Conhecimento: Direito do Consumidor; CHUNK 15 — CDC DO LADO DO FORNECEDOR: O QUE ME E EPP PRECISAM SABER; score 0.8778; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftcq2800ol48hxb9a4dzzr` — JUDITH — Base de Conhecimento: Direito do Consumidor; Q&A — VÍCIO DO PRODUTO; score 0.8766; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.
- `cmuftd4nm00rp48hxdiu2tetk` — JUDITH — Base de Conhecimento: Direito do Consumidor; COMPLEMENTO STJ — Consumidor: Jurisprudência Prática; score 0.8761; versão `0c185d8be6aa7976475d48da9f11078aa39936cbc93c7e219272f86d37607165`.

Blocos citados pela verificação aprovada: cmuftcwlo00pz48hx6ea52k2k.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-real-final.json](evidence/2026-09-24/utility-real-final.json).

## extra-change

Pergunta: Agora sobre proteção de dados: sendo MEI sem tratamento de alto risco, preciso indicar formalmente um encarregado de dados?

Resposta final:

> Não, você está dispensado. A Resolução CD/ANPD nº 2/2022 dispensa agentes de tratamento de pequeno porte (MEI enquadra-se aqui) da indicação formal de encarregado de dados. Se um cliente ou parceiro perguntar quem é seu DPO, você pode informar que está dispensado dessa obrigação por enquadramento como agente de pequeno porte conforme a regulamentação da ANPD.

Estágio: `support_passed`. Consulta: `Agora sobre proteção de dados: sendo MEI sem tratamento de alto risco, preciso indicar formalmente um encarregado de dados?`.

Blocos efetivamente recuperados:

- `cmuftb3zk00cx48hx8r257nex` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; Q&A — LGPD na prática do pequeno empresário; score 0.8862; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb3gs00ct48hxan59n1eq` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 4 — Segurança de dados: o que o MEI deve fazer na prática; score 0.8751; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb5au00d748hxka0km3fb` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 8 — LGPD nas relações de trabalho: dados de funcionários e prestadores; score 0.8731; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb3q500cv48hxdhxbxmj7` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 5 — Sanções: o que acontece se descumprir a LGPD; score 0.8712; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.
- `cmuftb2xw00cp48hxxv97r5g4` — JUDITH — Resumo RAG: LGPD + Marco Civil da Internet; CHUNK 2 — Bases legais: quando posso usar dados de clientes?; score 0.8707; versão `41f4dfa565695662bfdb209b3794a43338a242d7b2374a7b5dbd1244e5996425`.

Blocos citados pela verificação aprovada: cmuftb3zk00cx48hx8r257nex.

Textos integrais dos blocos, fontes editoriais declaradas, rascunhos, coordenadas de evidência e recibos do provedor estão em [utility-real-final.json](evidence/2026-09-24/utility-real-final.json).

## extra-unsupported

Pergunta: Pela LGPD, qual foi a indenização exata no processo privado de João Teste contra Loja Exemplo iniciado ontem?

Resposta final:

> Atendo dúvidas nas áreas jurídicas disponíveis na JUDITH. Não identifiquei sua pergunta nesse escopo. Se for uma dúvida jurídica, diga o assunto e o que aconteceu. Nenhum crédito foi consumido.

Estágio: `retrieval_failed`. Consulta: `não houve recuperação`.

