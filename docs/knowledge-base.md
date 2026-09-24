# Base de conhecimento — implementação e operação

> Atualização de 24/09: consulte [a retomada e o handoff do Admin](knowledge-review-2026-09-24.md). Embeddings são locais; as referências históricas a créditos OpenAI neste documento estão superadas por [local-embeddings.md](local-embeddings.md). Os 19 arquivos da entrega foram localizados, sem importação ou correção automática.

## Estado da entrega

Implementação publicada na VPS em 23/09/2026 após autorização explícita do usuário para migração e deploy. Consulte [knowledge-production.md](knowledge-production.md) para versão, backup, testes reais e pendências operacionais. Prompts e fichas foram preservados. A análise inicial está em [knowledge-analysis.md](knowledge-analysis.md). Não há importação automática dos Markdown históricos nem publicação automática de fichas.

## Arquivos

- `src/knowledge/areas.ts`: contrato reutilizável, 12 áreas exatas, listas por vírgula e erros estruturados. Não depende de banco/SDK; pode ser compartilhado com Admin, ou utilizado via endpoint.
- `src/knowledge/parser.ts`: capítulos/subcapítulos, escopo de áreas, preservação de conteúdo, código opaco.
- `src/knowledge/core.ts`: fingerprints, preparação incremental, cache semântico, cosseno e top 5.
- `src/knowledge/provider.ts`: classificador Claude e embeddings locais E5; instrução técnica nova e independente das seções aprovadas A/B/C.
- `src/knowledge/repository.ts`: seleção SQL por área/publicação, snapshot consistente e rejeição de fontes obsoletas.
- `src/knowledge/indexer.ts`, `worker.ts`: jobs persistidos, progresso, lease, fencing, cache e transação de publicação do índice.
- `src/routes/knowledge.ts`: validação, solicitação e consulta autenticadas.
- `src/judith/conhecimento.ts`, `claude.ts`: contexto completo de até cinco chunks somente em `duvida`.
- `src/server.ts`, `src/config/env.ts`, `.env.example`: registro/configuração do worker e endpoints.
- `prisma/schema.prisma`, `prisma/migrations/202609230001_knowledge_index/migration.sql`: persistência e alteração não destrutiva.
- `test/knowledge*.test.cjs`, `test/indexer.test.cjs`, `test/fixtures/`: casos novos; testes de conteúdo/fluxo existentes ajustados à consulta exclusiva em dúvida. `package.json` contém `npm test`.

## Áreas e parser

Correção local de 24/09, ainda não publicada: parser `markdown-v3` ignora a capa inteira antes do primeiro `##` real, inclusive prosa e `###` de capa. Continua lendo e validando áreas/frontmatter nessa região para definir a área inicial dos capítulos. Código cercado não inicia capítulo. Caderno com zero blocos é rejeitado por `KnowledgeValidationError`, campo `conteudo`, valor `SEM_BLOCOS`: requer capítulo `##` seguido de conteúdo. A validação HTTP retorna 422 também para rascunho vazio, e o indexador aplica a mesma regra. A mudança de versão invalida fingerprints antigos; numa implantação futura será necessário reindexar os publicados. Vetores de capítulos iguais continuam reutilizáveis.

Valores: administrativo, ambiental, civil, consumidor, eca, empresarial, lgpd, tributario, previdenciario, processual, trabalhista, autoral. Slug é identificador independente; `civil-contratos` não é área. Espaços ao redor dos itens são removidos; grafia/case/acentos não são corrigidos. Itens vazios ou desconhecidos invalidam a lista inteira.

O campo `area` da ficha é o padrão. Suporta frontmatter simples observado nos arquivos históricos (`area: civil, consumidor`), `**Área:** civil, consumidor`, `**Área**: civil` e `Área: civil`. Frontmatter, quando presente, define o padrão do Markdown; tanto seu valor quanto o campo da ficha são validados. Não é um parser YAML genérico: arrays YAML e outras sintaxes não são convertidos silenciosamente.

Regra do cliente (mensagem de 23/09): “se no meio do texto aparecer uma linha **Área:** consumidor, dali pra baixo os blocos passam a ser consumidor, até aparecer outra linha. Os subcapítulos ### herdam do capítulo ## acima.” E, sobre base-guias: “nenhum [módulo] herda do topo […] o que vale mesmo é a linha de cada módulo.”

- Campo `area` (ou frontmatter) é o padrão até a primeira marcação.
- Marcação no topo ou num capítulo `##` vale para aquele ponto e **para todos os capítulos seguintes**, até outra marcação no topo/capítulo. Capítulos `##` sem marcação não voltam ao padrão (caso do Módulo 4 de base-guias, cujas seções usam `##`). Para voltar ao padrão, escreve-se outra marcação, como o base-propaganda já faz no Módulo 5.
- `###` herda a área vigente do capítulo.
- Marcação dentro de um `###` vale só para aquele subcapítulo; os irmãos e o próximo capítulo voltam à área do capítulo. **Pendente de confirmação do cliente**: a regra literal (“até aparecer outra linha”) e a herança do `##` divergem neste caso, e os cadernos reais não têm marcação em `###`.
- Marcação logo após o título aplica-se ao bloco; após conteúdo, inicia segmento novo com o conteúdo seguinte.
- Nenhuma área explícita é somada ao padrão.

Texto do capítulo não inclui a prosa de seus subcapítulos. Títulos/metadados de localização são armazenados separadamente. O texto de cada bloco conserva quebras de linha, acentos e marcações. Frontmatter não vira prosa. Blocos compostos só de títulos, separadores (`---`, `***`, `___`), linhas em branco e marcações de área não viram chunks; o título continua como capítulo/subcapítulo dos blocos seguintes. Qualquer outra linha (texto, lista, negrito, código) é conteúdo e mantém o bloco. Validação reúne todos os erros do caderno (campo, frontmatter e cada marcação, com linha e capítulo) numa única resposta 422; o formato de cada item não mudou. Não interpreta marcações ou títulos dentro de cercas de backticks/tildes ou linhas de código indentadas. Não interpreta headings dentro de citações/listas como seções do caderno.

## Banco compartilhado e migração

Novas tabelas:

| Tabela | Finalidade |
| --- | --- |
| KnowledgeDocument | Versão/fingerprint, modelo e publicação do caderno indexado |
| KnowledgeChunk | Conteúdo LONGTEXT, posição, linha, capítulo e representação |
| KnowledgeChunkArea | Relação multiárea, chave composta e índice por área |
| KnowledgeEmbedding | Vetor JSON, dimensões e identificador determinístico de texto/modelo |
| KnowledgeJob | Solicitação idempotente, exclusão mútua, progresso, estados, erros e resultado |

Única alteração em tabela existente: `FichaConhecimento.conteudo` TEXT → LONGTEXT, explicitamente utf8mb4. Não altera outros campos, enums, dados, prompts ou status. Não há FK nova para FichaConhecimento, evitando modificar o contrato de exclusão dos outros sistemas; FKs com cascade existem somente entre tabelas derivadas novas. Índices únicos impedem chunks duplicados por posição e duas execuções ativas.

A migration foi gerada comparando schemas locais, testada em MariaDB isolado e aplicada ao banco compartilhado em 23/09/2026, após backup e autorização. O repositório não possuía histórico de migrations. **Não reaplicar esta migration nem executar `migrate dev`, `db push` ou `migrate deploy` indiscriminadamente no banco compartilhado.** Evoluções futuras exigem baseline do histórico e política única de migrations. MySQL pode reconstruir/bloquear a tabela durante alargamentos; não se afirma que esse ALTER seja online em toda versão. Não há rollback automático para TEXT, pois isso poderia truncar dados novos.

Repositórios identificados para coordenação (não editados nesta entrega):

1. `ADMIN JUDITH/admin-judith`: sincronizar FichaConhecimento para LONGTEXT e os novos modelos se mantiver schema completo; retirar limite fixo de 65.535 bytes nos POST/PUT de fichas e revisar limites de transporte/hospedagem. Chamar validação antes de salvar e solicitar reindexação após salvar/publicar/despublicar/excluir.
2. `WEB JUDITH/web-judith`: seu schema local já omite FichaConhecimento/PromptConfig. Se for usado para evolução do banco, precisa ser sincronizado com o schema canônico, incluindo as tabelas novas; não permitir que um `db push` tente removê-las. Runtime de pagamentos não depende dessas tabelas.
3. `WEB JUDITH/backend-judith`: cópia local alternativa do Backend identificada; confirmar qual checkout é canônico antes de geração de clientes/migrations ou futura publicação.

O banco real foi inspecionado na publicação: MariaDB 10.11.14, InnoDB, utf8mb4. O estado remoto dos outros repositórios ainda depende da integração do Admin.

## Busca

1. Apenas `askJudith` com `funcao === "duvida"` chama `getBaseConhecimento(pergunta, histórico)`. Redação, análise, bots de clientes e seções aprovadas permanecem intactos.
2. Claude Haiku escolhe **uma área predominante** das 12 ou `nenhuma`, a partir da consulta atual. Com histórico, uma etapa extrativa examina até oito mensagens anteriores do usuário (nenhuma da assistente) e escolhe um único trecho literal de até 300 caracteres somente para continuação. O backend verifica que o trecho existe literalmente; texto inventado falha explicitamente. Pergunta autossuficiente/mudança de assunto deve usar só a pergunta atual. Saída de área fora da lista exata gera `CLASSIFICATION_INVALID`; não há conversão editorial. `nenhuma` gera `KNOWLEDGE_OUT_OF_SCOPE`, com explicação do escopo; área sem candidatos gera `KNOWLEDGE_NO_CONTEXT`, informando ausência de conteúdo publicado disponível; somente falhas técnicas sugerem tentar novamente. Nenhum desses caminhos chama o gerador jurídico ou registra consumo. Código sanitizado aparece em `judith.reply.knowledgeFailure`.
3. SQL parametrizado filtra `KnowledgeChunkArea.area`, documento publicado, ficha ainda PUBLICADA e a versão da representação antes de qualquer similaridade. A fonte atual é lida uma vez por ficha em transação RepeatableRead; fingerprint diferente remove os candidatos daquele caderno. Fichas excluídas não passam pelo JOIN. Não há cache de resultados antigos.
4. Embedding recebe só pergunta atual, opcionalmente seguida do trecho curto extraído. Nunca recebe o histórico completo ou respostas anteriores da JUDITH. Só calcula com candidatos filtrados; ordena por cosseno decrescente e ID no empate, devolvendo no máximo cinco blocos completos. Sem expansão para outras áreas ou busca por palavras-chave.
5. O contexto contém conteúdo integral, título, capítulo, subcapítulo e fontes. Não há `.slice` de texto ou corte de contexto. Se os cinco chunks ultrapassarem limites do provedor de resposta, a API poderá falhar e o tratamento existente avisará falha ao usuário; não há truncamento silencioso.

Representação atual: `intfloat/multilingual-e5-large`, ONNX INT8 local, 1024 dimensões, revisão fixa e identificador versionado no código. Não usa OpenAI nem provedor pago para embeddings. Para chunks extensos, todas as janelas de até 480 tokens participam de uma média ponderada normalizada; o chunk devolvido continua integral. Consulte [local-embeddings.md](local-embeddings.md) para modelo, infraestrutura, testes reais de qualidade, limites e implantação. Anthropic permanece responsável pela classificação de área e respostas.

## Indexação incremental e atomicidade

O escopo do job é exclusivamente `status=PUBLICADA`, tanto na preparação quanto na releitura antes do swap. Rascunhos e cadernos em revisão legados não são parseados nem geram embeddings, mesmo com áreas inválidas. Isso não dispensa a validação obrigatória de áreas em todo salvamento pelo Admin, inclusive rascunhos. Documentos/chunks de fontes despublicadas ou excluídas são removidos na mesma transação de reconciliação. Publicação ou despublicação durante a preparação altera o conjunto de fontes e aborta o swap com `SOURCE_CHANGED`.

Cada solicitação compara fingerprints de conteúdo e metadados (incluindo área, status, fontes, título, slug, ordem e versão do parser). Cadernos inalterados no mesmo modelo não são parseados/indexados novamente. Caderno alterado é parseado por inteiro (a herança de áreas depende do texto anterior), mas somente representações ausentes são calculadas e somente registros diferentes são gravados.

Comparação por chunk (`planChunks`): identidade = id da representação (modelo + capítulo + subcapítulo + texto sem marcações), não a posição. Blocos inalterados são ancorados pela maior subsequência comum; blocos movidos são reconhecidos pela identidade; blocos restantes entre as mesmas âncoras são tratados como edição do mesmo registro (ID preservado). Resultado: texto alterado → UPDATE daquele registro; só área → inserção/remoção em KnowledgeChunkArea; inserção/remoção → um INSERT/DELETE, com os demais apenas reposicionados (`ordinal`/`line`) quando a posição muda. O índice único `(sourceId, ordinal)` é respeitado: movimentos em ordem relativa usam uma única passada; reordenações usam ordinais temporários negativos. O plano é calculado dentro da transação, sobre as linhas lidas nela. O cache é por hash do texto sem marcações de área, contexto dos títulos e versão da representação. Área, fontes, slug, título do caderno ou status, isoladamente, podem reutilizar embeddings. Mudança de texto/títulos de seção/modelo invalida a representação pertinente.

Prepara todos os cadernos publicados alterados fora da transação, incluindo validação. Embeddings podem ficar persistidos se o job falhar, para reaproveitamento seguro; não ficam visíveis sem chunks ativos. No swap: verifica lease sob lock, relê fontes com `FOR UPDATE`, compara fingerprints e substitui todos os documentos alterados/remove documentos excluídos ou despublicados em uma única transação Serializable. Resultado completed e troca do índice fazem parte do mesmo commit. Qualquer falha reverte o índice inteiro. Fonte publicada modificada durante preparação causa `SOURCE_CHANGED`, exigindo nova solicitação. Transação tem timeout de 60s: excedê-lo falha com rollback, sem índice parcial.

Publicação/despublicação entram no fingerprint e no campo published do documento. Despublicação, edição e exclusão da ficha também são respeitadas **antes** de reindexar pela consulta à fonte atual. Após edição, aquele caderno deixa de aparecer até o novo índice estar concluído; não se serve a versão antiga. Demais cadernos válidos continuam disponíveis.

Exclusão remove somente documentos/chunks/áreas derivados no próximo job; cache de embeddings não é eliminado automaticamente. Retenção/limpeza futura desse cache e de jobs pode ser implementada conforme política operacional. Nenhum caderno é apagado pelo indexador.

`requestKey` identifica uma solicitação permanentemente. Repetir a mesma chave retorna o mesmo job, inclusive completed/failed; para tentar novamente após falha ou indexar alterações novas, usar uma chave nova. Uma chave ativa global permite um job por vez. Workers disputam claim por atualização condicional; lease de 5 minutos, heartbeat de 30s. Após crash, outro ciclo marca processing expirado como failed (`WORKER_INTERRUPTED`); pending persiste e será retomado. Worker antigo não pode publicar após perder lease. Uma nova solicitação reutiliza o cache concluído. Não há Redis/serviço adicional.

## Contrato com Admin

Autenticação existente servidor-servidor: header `x-internal-key` com `INTERNAL_API_KEY`, comparação em tempo constante. Admin deve exigir sua sessão HMAC existente antes de fazer proxy server-side. Nunca colocar essa chave em código cliente/`NEXT_PUBLIC_*`, browser ou logs. Os endpoints não aceitam cookie do Admin diretamente e não têm CORS público. O proxy/interface do outro repositório ainda não foi implementado.

### Validar antes de salvar

`POST /internal/knowledge/validate`

```json
{"area":"civil, consumidor","conteudo":"## Contratos\n**Área:** civil\nTexto integral"}
```

200: `{"valid":true,"chunks":1,"areas":["civil"]}`. 422:

```json
{"valid":false,"errors":[{"origem":"markdown","campo":"area","valor":"financeiro","linha":2,"capitulo":"Contratos","mensagem":"Área inválida: financeiro"}]}
```

O indexador usa o mesmo parser/validador novamente; erros do job identificam também slug na origem. Na validação de campo de metadados, linha/capítulo não se aplicam. Esta chamada não salva a ficha.

### Solicitar

`POST /internal/knowledge/reindex`

```json
{"requestKey":"reindex-20260923-001"}
```

202 para pending/processing, 200 para chave já terminada:

```json
{"jobId":"identificador","status":"pending","statusUrl":"/internal/knowledge/jobs/identificador"}
```

Reindexação reconcilia toda a coleção, processando apenas diferenças. 409 se outro requestKey já está ativo: `{"error":"INDEXING_BUSY","jobId":"identificador"}`. Não cria fila ilimitada de solicitações repetidas.

### Progresso, resultado e erros

`GET /internal/knowledge/jobs/:id`

```json
{
  "jobId":"identificador",
  "status":"completed",
  "total":19,
  "processed":19,
  "result":{"changed":2,"unchanged":17,"removed":0,"embeddingsCreated":3,"embeddingsReused":20,"chunks":23},
  "errors":null,
  "createdAt":"2026-09-23T12:00:00.000Z",
  "updatedAt":"2026-09-23T12:01:00.000Z"
}
```

Números ilustrativos. total/processed são cadernos; chunks conta chunks dos cadernos alterados nesta execução, não o total global. Campos adicionais (aditivos, sem remover os anteriores): `chunksCreated`, `chunksUpdated` (texto, títulos, representação ou áreas), `chunksRepositioned` (só `ordinal`/`line`), `chunksUnchanged`, `chunksRemoved` (inclui chunks de cadernos despublicados/excluídos), `areaLinksAdded`, `areaLinksRemoved`. Progresso de preparação não indica que o índice já foi publicado. Estados: pending, processing, completed, failed. Poll sugerido: 2–5s. Erros: VALIDATION (issues), SOURCE_CHANGED, LEASE_LOST, WORKER_INTERRUPTED, OPENAI_API_KEY_REQUIRED, INVALID_VECTOR, VECTOR_DIMENSION_MISMATCH ou INDEXING_FAILED sanitizado. SDK/Prisma não têm seus erros brutos persistidos nem enviados na resposta.

Comuns: 401 UNAUTHORIZED, 400 INVALID_PAYLOAD, 404 JOB_NOT_FOUND, 413 INVALID_PAYLOAD (limite HTTP existente), 503 WORKER_DISABLED, 500 KNOWLEDGE_OPERATION_FAILED. O bodyLimit existente do Backend é 10 MiB, não um limite de número de cadernos/chunks; o payload de reindexação não transporta os cadernos.

## Configuração e adoção futura

Mantém `DATABASE_URL`, `ANTHROPIC_API_KEY`, `JUDITH_MODEL_HAIKU`, `OPENAI_API_KEY`, `INTERNAL_API_KEY`. OpenAI key passa a ser necessária para construir representações e buscar com candidatos; requer acesso/cota de embeddings. Há custo adicional de classificação e embeddings. Na publicação, classificação real funcionou; o teste de embeddings foi recusado por `credit_balance_exhausted`.

`KNOWLEDGE_WORKER_ENABLED=false` é o padrão seguro antes da migração. Depois de migração validada/aplicada pelo responsável, schemas sincronizados e credenciais disponíveis, configurar `true`, iniciar serviço, solicitar primeira indexação e acompanhar completed. Antes do primeiro índice, não haverá trechos disponíveis. Não há fallback para a concatenação antiga. Instalar este código sem as tabelas não é suportado.

## Testes e limites da validação

`npm test` compila e executa testes locais com mocks. `test/fluxo.test.cjs` mantém opção antiga `JUDITH_TEST_READ_DB=1` para leitura de prompt real; **não ativada nesta entrega**. Nenhum teste novo abre banco/APIs reais.

Cobertura: 12 áreas/listas/erros/slug, parser ##/###/herança/sobrescrita/código, dois casos solicitados com fixtures, arquivos históricos reais LGPD/contratos, filtro SQL antes da similaridade, publicação, obsolescência, top 5/menos/sem fallback/integralidade, UTF-8 >169 mil caracteres e 117 chunks, classificação estrita, particionamento completo dos embeddings, primeira indexação/alterações/repetição/exclusão/falhas/rollback/fencing/concorrência, HTTP/autenticação/status e fluxos existentes de quotas/créditos/onboarding.

Executados: build, 22 testes node:test e 28 cenários do teste de fluxo, todos aprovados. Posteriormente, `test/knowledge-mysql.cjs` passou em MariaDB isolado na VPS, incluindo DDL, conteúdo Unicode grande, JSON, rollback e concorrência reais. Relevância/performance com a futura coleção completa ainda precisam de avaliação. Nenhum número de cadernos/chunks é limite no código.

Pendências operacionais: repor saldo OpenAI, disponibilizar os cadernos novos (especialmente base-propaganda/base-guias), corrigir as 12 áreas legadas mediante decisão editorial explícita, integrar Admin e ampliar seu transporte/validação, sincronizar os schemas relacionados e testar relevância com perguntas reais. Backend e migration já publicados; nenhum caderno foi publicado automaticamente.
