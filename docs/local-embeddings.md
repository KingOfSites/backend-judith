# Embeddings locais na VPS

O backend usa um serviço de vetores semânticos na própria VPS. A classificação de área e as respostas continuam na Anthropic, usando a integração existente. O caminho de embeddings não instancia OpenAI e não tem fallback pago nem busca por palavras-chave. Indisponibilidade local falha explicitamente, preservando o índice anterior.

## Modelo escolhido

[`intfloat/multilingual-e5-large`](https://huggingface.co/intfloat/multilingual-e5-large), licença MIT, revisão `3d7cfbdacd47fdda877c5cd8a79fbcc4f2a574f3`, arquivo ONNX oficial `model_qint8_avx512_vnni.onnx`. É um encoder multilíngue com português, 1024 dimensões e limite de 512 tokens por inferência. A CPU AMD EPYC 9354P da VPS suporta AVX-512 VNNI; a imagem escolhida depende dessa capacidade. O modelo não gera respostas nem substitui a Anthropic.

Comparação prévia com as mesmas 19 perguntas e áreas conhecidas: E5 small FP32, 13/19 top-1; E5 base FP32, 15/19; E5 large INT8, 17/19. Todos alcançaram 19/19 top-5. A versão grande quantizada foi escolhida pela maior precisão observada e consumo em repouso de aproximadamente 1,1 GiB. Os dois erros de primeira posição foram comodato (responsabilidade civil à frente) e vazamento (direito de acesso à frente); os trechos esperados ficaram em segundo. Essa amostra é sintética e pequena.

Na inspeção inicial: 8 vCPUs, 32.101 MiB de RAM, 26.716 MiB disponíveis, 338 GiB livres, carga média 0,32 e CPU majoritariamente ociosa. O serviço escolhido fica limitado a 1 vCPU e 3 GiB, sem swap e sem aumento de plano. Há margem observada para ele e para os bots existentes; as medidas são pontuais, não uma garantia para picos futuros.

## Contrato e integridade

- `LOCAL_EMBEDDINGS_URL` aponta para `http://embeddings:8080` na rede Docker interna. O serviço não publica porta no host e não tem saída para a Internet em produção.
- O contrato `/embed` recebe `{text, kind}`, com `kind=query|passage`, e devolve o identificador completo da representação e um vetor normalizado. O backend rejeita modelo ou dimensão divergentes.
- Os prefixos do E5 são tokenizados junto com o texto conforme o publicador. Cada janela leva o prefixo correspondente. Todos os tokens participam, em janelas de 480 tokens, sem truncar o final; a média normalizada das janelas é ponderada pelo número de tokens. O texto integral do chunk continua no banco e na resposta. Uma entrada maior que 4 MiB é rejeitada explicitamente, nunca cortada.
- Média de janelas pode diluir assuntos secundários em chunks muito longos. A preservação de texto não implica qualidade uniforme para toda extensão de caderno; o teste de cauda verifica participação no vetor, não relevância jurídica universal.
- Consultas têm timeout de 30 segundos; passagens de indexação, 10 minutos, com heartbeat do job mantido durante a chamada. No teste real, um chunk de 49.200 caracteres/13.200 tokens usou 28 janelas e cerca de 37 segundos. Cadernos longos custam tempo de CPU; falhas ou limites nunca autorizam truncamento ou índice parcial.
- Nome, revisão dos pesos, formato numérico, dimensão e versão do algoritmo integram `provider.model`, usado no cache e na consulta. Vetores de modelos antigos nunca são misturados. Reindexar reconstrói os documentos publicados com a nova representação, reutilizando apenas embeddings compatíveis.
- Permanecem: filtro SQL por área e publicação antes da seleção dos cinco, fingerprint da fonte, troca transacional, proteção contra edição concorrente, remoção de despublicados/excluídos, validação obrigatória no Admin e exclusão dos legados em revisão/rascunho da preparação.

## Execução e recursos

`services/embeddings/Dockerfile` baixa pesos na construção, com revisão fixa do repositório original, e registra SHA-256 em `/app/model/manifest.json`. Depois funciona offline com ONNX Runtime CPU. Dependências Python são fixadas em `requirements.txt`. O processo roda sem root, com sistema de arquivos somente leitura, sem capacidades extras, uma thread de inferência e no máximo oito requisições admitidas. Os limites Docker impedem que use toda a VPS.

O arquivo `services/embeddings/compose.yml` deve ser mesclado à configuração de implantação; no ambiente real sua configuração fica incorporada ao override, para que um `docker compose up` normal a preserve. Não reutilizar cegamente o Compose de desenvolvimento do repositório sobre a VPS.

## Testes reproduzíveis

1. `npm test`: regressões do backend, Admin, cache, filtro, atomicidade e fluxo dos bots; simulações não equivalem à avaliação semântica.
2. `test/knowledge-mysql.cjs`: banco MariaDB descartável `judith_knowledge_test`, com `KNOWLEDGE_ISOLATED_TEST=true`; usa vetores simulados para testar persistência e transações.
3. `test/knowledge-local.cjs`: executar nesse banco depois do teste MariaDB, com o serviço real de embeddings. Usa fixtures sintéticas versionadas em `test/fixtures/semantic-portuguese.json`, vetores locais reais, SQL real e 19 consultas. Limite definido antes da avaliação: pelo menos 80% de top-1 e 100% de top-5 neste conjunto pequeno. Há oito candidatos civis e seis distrações deliberadas em outra área. Nas métricas de qualidade a área é explicitamente fornecida pela fixture, isolando a avaliação dos vetores. `KNOWLEDGE_REAL_CLASSIFIER=true` acrescenta duas consultas completas com o classificador Anthropic existente.
4. `services/embeddings/test_tokenization.py`: confirma equivalência com a tokenização integral do publicador e cobertura completa das janelas. Executar numa imagem de modelo, montando o teste em `/app`.
5. `services/embeddings/benchmark.py`: tempos seriais, quatro clientes concorrentes, normalização e rejeição de entradas inválidas, sem contato com provedores.

Os cadernos do cliente não são alterados nem publicados nesses testes. Exemplos sintéticos são apenas fixtures de recuperação, não orientação jurídica. Os resultados medem um conjunto pequeno e não substituem avaliação editorial futura em cadernos autorizados.

## Resultado na VPS — 23/09/2026

- Release em execução: `3c1e265171f799a59af4692597a01d654aaffd4b`. Backend e serviço de embeddings saudáveis após implantação; zero reinícios e OOM nos contêineres observados dos bots.
- Qualidade no MariaDB real descartável: 17/19 top-1 (89,5%) e 19/19 top-5. Indexação inicial: 25 documentos, 20 embeddings novos, cinco reutilizados, cerca de 4,28 s. Repetição integral sem novos embeddings; testes de metadados, despublicação, exclusão e conteúdo obsoleto aprovados.
- Duas consultas completas antes e depois do deploy, com classificador Anthropic existente: `civil` retornou inventário/herança em primeiro entre cinco chunks; `lgpd` retornou eliminação de dados em primeiro entre três. Depois do deploy usou-se a imagem publicada do backend e o serviço de modelo em produção, mantendo o banco sintético separado. Job isolado final `cmuehhofr0000opvyp2s7prn0`, completed.
- Falha real por parada do serviço: job `cmuehcg4p00006aijbxr3uyhf`, failed/LOCAL_EMBEDDING_UNAVAILABLE; documentos e chunks anteriores idênticos e fonte editada excluída da busca. Nenhum fallback pago.
- Embedding curto serial: mediana 85,05 ms, máximo 107,49 ms em dez chamadas. Quatro clientes concorrentes: mediana 331,73 ms, máximo 372,36 ms em 12 chamadas. Enquanto uma passagem de 12 janelas era processada, dez consultas ficaram entre 76,92 ms e 3,69 s. Não extrapolar esses números para tráfego de produção maior.
- Saúde do backend durante a avaliação: 120/120 HTTP 200; mediana 7 ms, p95 22,67 ms, máximo 472,97 ms. Isso comprova disponibilidade observada, não um ensaio de conversas reais em WhatsApp.
- Memória final do modelo: aproximadamente 1,1 GiB; pico observado 1.223.307.264 bytes (cerca de 1,14 GiB). Limites: 1 vCPU e 3 GiB. Imagem reportada pelo Docker: 592.914.543 bytes. Após limpeza: 25.521 MiB de RAM disponíveis e 331 GiB livres; builds e imagens de rollback também ocupam disco.
- SHA-256 dos pesos ONNX: `46f5d13dba7ade0160c67d346087d870162950882be17ff9319f873cf6fedff1`; tokenizer: `62c24cdc13d4c9952d63718d6c9fa4c287974249e16b7ade6d5a85e7bbb75626`.
- Job real no banco do cliente `cmuehhfj400003yevxb9ukfjb`: completed, zero publicados a processar, apesar de 12 revisões inválidas. As 17 fichas seguem EM_REVISAO e os hashes de fichas/prompts são idênticos antes/depois. Validação de área inválida continua em 422.
- Banco, contêineres e rede de teste, imagens dos modelos descartados e arquivos temporários com credenciais foram removidos. Evidências e rollback estão em `/opt/judith-backend/backups/local-embeddings`, com acesso restrito. Nenhuma credencial está neste documento.

O rollback usa `rollback.sh` nessa pasta e a imagem `judith-backend-rollback:pre-local-embeddings`. Como a versão anterior ainda continha embeddings pagos, o rollback desabilita o worker e deixa `OPENAI_API_KEY` vazia no override, impedindo cobrança: a indexação fica indisponível até restaurar a versão local. Não reativar o provedor pago como recuperação automática. Não houve migration nem contratação de serviço ou aumento de plano.
