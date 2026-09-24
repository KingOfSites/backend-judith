# Utilidade da geração com fontes — 24/09/2026

Atualização posterior: o [fechamento específico das três pendências](knowledge-pending-closure-2026-09-24.md) registra a versão técnica seguinte, as execuções reais dos seis casos e a limitação editorial de dados financeiros. Os resultados abaixo permanecem como evidência histórica da etapa anterior.

Resultado final qualificado: houve respostas úteis com recuperação e provedor reais, inclusive continuação e mudança de área. A rodada final direcionada `support-v7` teve **3 respostas liberadas e 2 bloqueios**, sem cobrança nos bloqueios. Os quatro controles de escopo passaram (dois negativos bloqueados, dois positivos aceitos); a barreira de esquecimento foi repetida com o provedor real e bloqueou a afirmação. Isso não aprova indiscriminadamente o sistema: permanecem os casos de recuperação/classificação e a recusa conservadora descritos abaixo.

Entrega: [respostas finais, fontes, versões e latências por caso](knowledge-utility-responses-2026-09-24.md), [recibo real final v7](evidence/2026-09-24/utility-real-final.json), [resumo de métricas](evidence/2026-09-24/utility-summary.json) e [replay local da rodada ampla](evidence/2026-09-24/utility-replay-v7.json).

## Diagnóstico dos três rascunhos anteriores

Referência: `evidence/2026-09-24/support-real-final.json`, política `support-v3`, fontes sintéticas do ensaio anterior. Os bloqueios completos eram justificados, embora existissem unidades inofensivas bloqueadas junto com eles.

| Rascunho | Extrapolação real | Falso bloqueio / parte aproveitável |
| --- | --- | --- |
| Eliminação | Equiparação a “direito ao esquecimento”; exemplos fiscais com cinco anos, contrato, ação judicial, anonimização; prazo de 15 dias para resposta ao pedido de exclusão; ANPD e processo sem suporte naqueles blocos | Abertura e transições conversacionais não cabiam na gramática restrita. O núcleo sobre consentimento/conservação tinha fonte. O modelo juiz aprovou equivocadamente o nome alternativo; a barreira determinística posterior o bloqueia |
| Recusa | Repetiu a pergunta antiga, acrescentou artigo/inciso, cobrança de dívida, investigação, multa e consequências não descritas nas fontes | “Mas tem um porém importante” e outras transições eram inofensivas, porém não isentas de evidência. A conservação por obrigação legal era aproveitável |
| Dados financeiros | Voltou às duas perguntas antigas e acrescentou contrato, disputa, denúncia, reparação e aumento de risco | A frase sobre dados financeiros não serem automaticamente sensíveis foi considerada apoiada. A resposta completa falhou por causa do restante, não dessa frase |

“Extrapolação” aqui significa falta de suporte nos blocos daquela execução; não é uma nova conclusão sobre a validade jurídica abstrata de cada afirmação. Uma pergunta sem resposta foi preservada no histórico, mas o gerador tratava o conjunto como várias perguntas pendentes e produzia respostas para todas.

## Ajuste técnico

Novo contrato `grounded-generation-v3`, em `src/knowledge/generation.ts`, anexado como bloco técnico somente no caminho `DUVIDA`. Não modifica nenhuma seção editorial no banco ou arquivo. O texto integral é versionado no código e seu hash/versão integra a auditoria.

O contrato exige uma a três frases em um parágrafo, apenas para a pergunta atual, histórico usado somente para referências, fontes fechadas nos blocos recuperados, conservação de condições/exceções, ausência de exemplos e consequências inventadas, sem introduções e transições desnecessárias. Declara explicitamente que essas restrições de suporte prevalecem sobre sugestões editoriais de expandir ou pesquisar fora das fontes. Isso é uma restrição técnica adicional ao comportamento de geração, não uma alteração oculta do prompt editorial.

O gerador preenche a ferramenta estruturada `grounded_answer`, com `answer` e `unsupported`. Quando a informação específica não consta nas fontes, o backend grava `generation_no_support` e devolve o aviso existente sem cobrança. O marcador legado `SEM_SUPORTE` também é tratado como ausência de resposta, mesmo seguido de explicação. O histórico salvo permanece intacto e participa da recuperação, mas não é repetido na conversa de geração: esta recebe somente a pergunta atual e, quando necessário, a consulta contextualizada extrativa. Uma negativa jurídica exige fonte; ausência de informação não autoriza inventar uma negativa.

Na versão final, pergunta e antecedente extrativo chegam juntos na mensagem de usuário, tanto ao gerador quanto ao verificador. Uma rodada anterior colocou o antecedente somente no bloco de sistema e recusou uma continuação com fonte adequada. Não se acrescentam fatos: o antecedente continua obrigatoriamente literal de mensagem anterior do usuário, limitado pelo contextualizador existente. A rejeição determinística de prazo associado à exclusão tem motivo específico para orientar a retirada desse prazo, sem orientar a substituição por outro número.

Após rejeição de suporte, permite-se uma única reformulação, com pergunta atual, mesmos blocos, rascunho rejeitado e motivos da rejeição como dados. O pedido manda remover afirmações rejeitadas e priorizar uma frase diretamente apoiada. A segunda resposta passa por verificação integral; se falhar, não há terceira tentativa nem cobrança. Ausência declarada de suporte, erro de auditoria, erro técnico de geração/verificação ou saída estruturada inválida não iniciam reformulação. Os dois IDs, hashes, usos e veredictos ficam na auditoria; motivos textuais de reparo não são duplicados no banco.

O verificador passou a `support-v4` **somente para o protocolo de citação**, após observar citações abreviadas e Markdown removido pelo modelo em respostas apoiadas. Em vez de redigitar uma citação, o modelo escolhe `chunkId`, `lineStart` e `lineEnd`; o código exige índices inteiros dentro da fonte e reconstrói o trecho original. O julgamento semântico, a exigência de todas as unidades apoiadas, o mínimo de evidência, números, “maioria”, prazo de exclusão, recusa/presunção e “esquecimento” não foram afrouxados. Coordenadas inválidas são rejeitadas. Não se normaliza nem aceita aproximação de citações.

A leitura humana da rodada `v4` encontrou duas aprovações indevidas: o gerador disse “única exceção” onde a fonte só tratava uma situação controvertida; e aplicou uma regra do capítulo de **acidente de consumo** à pergunta sobre **vício do produto**. A auditoria revelou que o verificador recebia o corpo do bloco, mas não seu capítulo pai. Na versão `support-v5`, capítulo e subcapítulo passaram a ser enviados como delimitadores de escopo, sem mudar a regra de `###`; a instrução reforçou que acidente e vício não são intercambiáveis. Uma barreira adicional exige fonte explícita para a expressão “única exceção”. Os dois rascunhos incorretamente aprovados viraram controles negativos, junto de controles positivos com fontes idênticas.

O controle negativo ainda foi aprovado indevidamente pelo modelo em `v5`, portanto essa rodada **falhou** apesar de dez respostas liberadas. `support-v6` acrescentou uma barreira conservadora de capítulo, mas a revisão humana encontrou uma variante na qual a resposta omitiu a palavra “vício”, presente na pergunta, e escapou da trava. Na versão final `support-v7`, o assunto é verificado na **pergunta contextualizada e na resposta**: uma unidade sobre vício, sem distinção explícita de acidente/fato do produto, não pode se apoiar em citação de capítulo de acidente de consumo. O motivo específico alimenta a reformulação. Essa trava cobre o cruzamento reproduzido; não é garantia geral contra transferências de escopo. “Aprovado pelo verificador” não equivale a “juridicamente correto”.

A rodada ampla tem 18 interações reais em `v6`; dez foram liberadas, mas uma delas era essa aprovação indevida. Após o último ajuste, foram repetidos **cinco fluxos completos em v7**, incluindo o caso afetado, continuação, mudança de área e ausência de suporte, além dos controles de escopo e esquecimento. Os dez veredictos aprovados da rodada ampla também foram reproduzidos localmente na versão final: nove continuam aprovados e a variante indevida é bloqueada. Esse replay não é uma nova chamada ao provedor; a tabela de respostas identifica a política e o recibo de cada execução.

## Método do ensaio real

Snapshot consistente somente de leitura dos 18 cadernos publicados e de suas tabelas derivadas, sem usuários/histórico/saldos/pagamentos. Cópia em MariaDB descartável, com IDs e fingerprints originais. Classificador e contextualizador Anthropic reais; embeddings de consulta E5 reais em container independente; filtro SQL por área/publicação, similaridade e seleção dos cinco blocos executados pelo código da aplicação. Vetores dos documentos foram copiados do índice existente, não recriados nem substituídos por vetores sintéticos.

O serviço isolado usa a mesma imagem do modelo de embeddings, sem conectar o processo ao banco de produção nem à Evolution. Geração e verificação usam Anthropic real. O fluxo `handleInbound` salva histórico, auditoria e consumo apenas no banco de teste. Transporte WhatsApp proibido pelo harness.

A primeira rodada definiu dez casos: três perguntas LGPD anteriores; mudança de assunto para arrependimento de compra online e continuação sobre prazo; três perguntas novas sobre acesso, encarregado e vício aparente de produto durável; duas perguntas sem suporte sobre estatística municipal e processo particular. A primeira rodada recusou todos; a segunda aceitou apenas um de doze. Ambas foram consideradas insuficientes e seus recibos preservados. A geração foi então estruturada e o protocolo de citação corrigido com base nesses achados. Foram acrescentados casos novos em cada rodada; os últimos tratam de compra na loja física e responsabilidade do comerciante. Não se apresenta o conjunto usado no desenvolvimento como benchmark independente.

A barreira de “direito ao esquecimento” é exercitada separadamente com fonte sintética mínima e provedor real, além do voto favorável propositalmente errado. Esse controle não é apresentado como recuperação de um caderno publicado.

## Regressões locais

`npm test`: 37 testes e 47 cenários de fluxo aprovados. O teste do marcador confirma que não há chamada ao verificador para uma não resposta; o teste de integração preserva o prompt editorial e restringe o contrato técnico ao caminho de dúvidas. Foram testados: reformulação aceita com cobrança única; segunda geração falha; segunda verificação falha; duas rejeições com limite de duas gerações e zero cobrança. Os testes existentes de falha, deduplicação e não consumo seguem aprovados. Seleção de linhas fora dos limites falha; reconstrução usa texto original.

## Limitações

Suporte textual não corrige erros das fontes. Os trechos editoriais LGPD anteriormente questionados continuam intactos. Resultado útil nesta amostra não é garantia jurídica nem medição abrangente de precisão. Os controles novos são casos de generalização desta rodada, não um benchmark independente grande.

O snapshot é uma cópia do índice publicado no momento do teste; não demonstra quais blocos foram usados nas antigas conversas do WhatsApp. Nenhuma mensagem foi enviada, nenhum conteúdo foi publicado, nenhuma implantação foi realizada.

## Resultados finais e pendências precisas

| Fluxo repetido com v7 | Resultado | Crédito isolado | Latência total |
| --- | --- | ---: | ---: |
| Responsabilidade pelo vício do produto | Duas tentativas retidas; o gerador não produziu resposta aprovada, embora haja fonte pertinente | 0 | 17.469 ms |
| Compra online e desistência | Resposta substantiva aprovada após reformulação | 1 | 18.129 ms |
| Continuação: preciso explicar por que quero desistir? | Resposta substantiva aprovada | 1 | 8.751 ms |
| Mudança de consumidor para LGPD/MEI/encarregado | Resposta substantiva aprovada | 1 | 10.185 ms |
| Valor de processo privado ausente | Classificador retornou fora do escopo; sem orientação | 0 | 883 ms |

Os testes positivos sobre solidariedade e arrependimento foram aceitos pelo **verificador real** com as mesmas fontes dos controles negativos. Isso demonstra que a barreira não proíbe esses temas em bloco, mas não prova que o gerador sempre produzirá a formulação apoiada: o fluxo espontâneo sobre responsabilidade pelo vício continuou recusado após a tentativa única de reparo. Essa é uma limitação vigente de utilidade, registrada sem liberar a resposta incorreta.

Na rodada ampla preservada:

- A pergunta sobre eliminação teve resposta aprovada após remover o prazo sem suporte. A continuação sobre recusa foi retida; não há afirmação de que as duas perguntas antigas passaram juntas na versão final.
- “Dados financeiros são automaticamente sensíveis?” foi classificada como **civil**, trazendo fontes inadequadas. O sistema bloqueou, sem responder por memória. Pendente corrigir/avaliar esse roteamento em uma amostra própria; a validação das 12 áreas e o filtro não foram relaxados.
- A continuação “qual é o prazo para exercer esse direito?” manteve corretamente o antecedente de compra online, mas os cinco blocos mais semelhantes tratavam de vício/reclamação. A fonte de arrependimento ficou fora da seleção. Esse bloqueio é adequado ao contexto efetivamente recuperado; a qualidade da busca para essa formulação continua pendente.
- Prazo de declaração completa de acesso e definição da função do encarregado não vieram nos blocos recuperados. Os blocos abordavam direitos gerais/dispensa; o gerador retornou ausência de suporte.
- Perguntas sobre estatística exata e processo privado foram barradas pelo classificador como fora de escopo. Logo, esses casos **não** comprovam o verificador de suporte posterior; a mensagem de fora de escopo para perguntas jurídicas sem informação específica ainda merece avaliação do roteamento.

Os recibos de todas as fases foram mantidos: `utility-real-first.json`, `utility-real-second.json`, `utility-real-third.json`, `utility-real-fourth.json`, `utility-extra-v4.json`, `utility-main-v5.json`, `utility-main-v6.json` e o final `utility-real-final.json`. As falhas nas fases anteriores não foram apagadas nem contadas como aprovação da versão final.

## Latência e uso do modelo na última rodada

Execução real final: 21:16:18–21:17:50 UTC, 18:16:18–18:17:50 de Brasília. Modelo Anthropic: `claude-haiku-4-5-20251001`. Snapshot: 18 documentos, 503 blocos e 503 embeddings reais; hash `4355951f0a8edee4e579df268e6a1c07399a0346685eced715986d7ce1a894ae`. SHA-256 do recibo final: `fe29ee1b5f1574919776a676ecb220a5aae1587c9d68b493da64732fe8fee0b3`.

| Componente | Chamadas | Mediana | Entrada / saída sem cache |
| --- | ---: | ---: | ---: |
| Classificação | 5 | 675 ms | 1.102 / 27 tokens |
| Contextualização | 2 | 910 ms | 1.841 / 88 tokens |
| Geração, incluindo as reformulações | 6 | 2.192 ms | 6.393 / 902 tokens |
| Verificação, incluindo cinco controles diretos | 11 | 6.040 ms | 57.910 / 5.047 tokens |

A geração também leu 111.183 tokens de cache. A verificação variou de 3.348 a 8.497 ms, sem cache nessa rodada. Os totais acima são apenas da última rodada, não o gasto acumulado das execuções de desenvolvimento. A tentativa adicional pode acrescentar **uma geração e uma verificação**; nunca há terceira tentativa lógica nem segundo crédito para a mesma resposta. Os tokens do provedor são utilizados mesmo quando não há consumo de crédito do usuário.

## Preservação e estado operacional

Prompt editorial permaneceu em `v22072026`, hash da seção A `1074a64ce472b3a5664cda40300efcde9d9398df5b6b6e9f43e5dc9d2322bb9d`. Snapshots de conteúdo e índice mantiveram o mesmo hash nas rodadas. Não houve gravação no banco de produção. Foram removidos os containers/rede de teste e os arquivos temporários com acesso ao provedor e snapshot editorial; imagens isoladas e recibos permanecem para reprodução. Produção conferida em execução na revisão `9959f206770b1104d9d1cf4f8e7b1a2f372a58e9`.

Comandos locais de regressão: `npm test` e `node test/utility-replay.cjs`. Resultado: 37 testes + 47 cenários de fluxo aprovados; replay preserva nove decisões positivas e bloqueia a variante incorreta. `git diff --check` aprovado. Para o ensaio de rede foram usados `test/utility-real-isolated.cjs` e os drivers locais `.work-deploy-local/run-utility-isolated.sh` / `run-utility-extra.sh`, exclusivamente com MariaDB e embeddings descartáveis. Não houve teste de entrega pelo WhatsApp.
