# Base de conhecimento — implementação e operação

## Estado da entrega

Implementação local. Nenhum deploy, migração aplicada, alteração de prompts aprovados ou escrita no banco compartilhado. A análise inicial está em [knowledge-analysis.md](knowledge-analysis.md). Não há importação automática dos Markdown históricos nem publicação automática de fichas.

## Arquivos

- `src/knowledge/areas.ts`: contrato reutilizável, 12 áreas exatas, listas por vírgula e erros estruturados. Não depende de banco/SDK; pode ser compartilhado com Admin, ou utilizado via endpoint.
- `src/knowledge/parser.ts`: capítulos/subcapítulos, escopo de áreas, preservação de conteúdo, código opaco.
- `src/knowledge/core.ts`: fingerprints, preparação incremental, cache semântico, cosseno e top 5.
- `src/knowledge/provider.ts`: classificador Claude e embeddings OpenAI; instrução técnica nova e independente das seções aprovadas A/B/C.
- `src/knowledge/repository.ts`: seleção SQL por área/publicação, snapshot consistente e rejeição de fontes obsoletas.
- `src/knowledge/indexer.ts`, `worker.ts`: jobs persistidos, progresso, lease, fencing, cache e transação de publicação do índice.
- `src/routes/knowledge.ts`: validação, solicitação e consulta autenticadas.
- `src/judith/conhecimento.ts`, `claude.ts`: contexto completo de até cinco chunks somente em `duvida`.
- `src/server.ts`, `src/config/env.ts`, `.env.example`: registro/configuração do worker e endpoints.
- `prisma/schema.prisma`, `prisma/migrations/202609230001_knowledge_index/migration.sql`: persistência e alteração não destrutiva.
- `test/knowledge*.test.cjs`, `test/indexer.test.cjs`, `test/fixtures/`: casos novos; testes de conteúdo/fluxo existentes ajustados à consulta exclusiva em dúvida. `package.json` contém `npm test`.

## Áreas e parser

Valores: administrativo, ambiental, civil, consumidor, eca, empresarial, lgpd, tributario, previdenciario, processual, trabalhista, autoral. Slug é identificador independente; `civil-contratos` não é área. Espaços ao redor dos itens são removidos; grafia/case/acentos não são corrigidos. Itens vazios ou desconhecidos invalidam a lista inteira.

O campo `area` da ficha é o padrão. Suporta frontmatter simples observado nos arquivos históricos (`area: civil, consumidor`), `**Área:** civil, consumidor`, `**Área**: civil` e `Área: civil`. Frontmatter, quando presente, define o padrão do Markdown; tanto seu valor quanto o campo da ficha são validados. Não é um parser YAML genérico: arrays YAML e outras sintaxes não são convertidos silenciosamente.

`##` inicia capítulo com padrão do caderno; `###` herda a área do capítulo. Uma marcação logo após o título aplica-se ao bloco inteiro; após prosa, inicia um segmento novo e afeta somente o conteúdo seguinte. Marcação no capítulo afeta seus subcapítulos; marcação em um subcapítulo não contamina seus irmãos ou o próximo capítulo. A marcação no topo redefine o padrão. Nenhuma área explícita é somada ao padrão.

Texto do capítulo não inclui a prosa de seus subcapítulos. Títulos/metadados de localização são armazenados separadamente. O texto de cada bloco conserva quebras de linha, acentos e marcações. Frontmatter não vira prosa; título/preâmbulo com conteúdo pode formar chunk próprio. Não interpreta marcações ou títulos dentro de cercas de backticks/tildes ou linhas de código indentadas. Não interpreta headings dentro de citações/listas como seções do caderno.

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

A migration foi gerada comparando schemas locais e revisada; não foi aplicada. O repositório não possuía histórico de migrations. **Não executar `migrate dev`, `db push` ou `migrate deploy` indiscriminadamente no banco compartilhado.** Antes de adoção, o responsável precisa conferir schema real/charset/engine (InnoDB), backup, baseline do histórico e política única de migrations, testar o SQL em cópia isolada e planejar janela de DDL. MySQL pode reconstruir/bloquear a tabela durante o alargamento; não se afirma que esse ALTER seja online em toda versão. Não há rollback automático para TEXT, pois isso poderia truncar dados novos.

Repositórios identificados para coordenação (não editados nesta entrega):

1. `ADMIN JUDITH/admin-judith`: sincronizar FichaConhecimento para LONGTEXT e os novos modelos se mantiver schema completo; retirar limite fixo de 65.535 bytes nos POST/PUT de fichas e revisar limites de transporte/hospedagem. Chamar validação antes de salvar e solicitar reindexação após salvar/publicar/despublicar/excluir.
2. `WEB JUDITH/web-judith`: seu schema local já omite FichaConhecimento/PromptConfig. Se for usado para evolução do banco, precisa ser sincronizado com o schema canônico, incluindo as tabelas novas; não permitir que um `db push` tente removê-las. Runtime de pagamentos não depende dessas tabelas.
3. `WEB JUDITH/backend-judith`: cópia local alternativa do Backend identificada; confirmar qual checkout é canônico antes de geração de clientes/migrations ou futura publicação.

O estado real do banco e de repositórios remotos não foi inspecionado.

## Busca

1. Apenas `askJudith` com `funcao === "duvida"` chama `getBaseConhecimento(pergunta)`. Roteador, cotas, onboarding, redação, análise, bots de clientes e seções aprovadas não mudam.
2. Claude Haiku, usando configuração existente, escolhe **uma área predominante** das 12 ou `nenhuma`. Resposta desconhecida/múltipla é erro; não há correção nem fallback. `nenhuma` retorna base vazia. Perguntas ambíguas ou dependentes de histórico precisam de avaliação de qualidade; o classificador recebe a pergunta atual.
3. SQL parametrizado filtra `KnowledgeChunkArea.area`, documento publicado, ficha ainda PUBLICADA e a versão da representação antes de qualquer similaridade. A fonte atual é lida uma vez por ficha em transação RepeatableRead; fingerprint diferente remove os candidatos daquele caderno. Fichas excluídas não passam pelo JOIN. Não há cache de resultados antigos.
4. Calcula embedding da pergunta somente se houver candidatos; compara vetores desses candidatos por similaridade de cosseno. Ordena por score decrescente e ID no empate, devolvendo no máximo cinco (todos, se forem menos). Sem expansão para outras áreas ou busca por palavras-chave.
5. O contexto contém conteúdo integral, título, capítulo, subcapítulo e fontes. Não há `.slice` de texto ou corte de contexto. Se os cinco chunks ultrapassarem limites do provedor de resposta, a API poderá falhar e o tratamento existente avisará falha ao usuário; não há truncamento silencioso.

Representação: `text-embedding-3-small`, 1536 dimensões, com identificador versionado no código. Usa SDK e `OPENAI_API_KEY` já existentes. Segundo a [documentação oficial de embeddings](https://developers.openai.com/api/docs/guides/embeddings), a API aceita texto e retorna vetores para comparação. Para chunks extensos, todas as partes de até 6.000 bytes UTF-8 são representadas e agregadas por média ponderada pelos bytes, normalizada. Esse particionamento é técnico: não divide nem trunca o chunk devolvido. Relevância dessa agregação deve ser avaliada com perguntas/cadernos reais.

## Indexação incremental e atomicidade

Cada solicitação compara fingerprints de conteúdo e metadados (incluindo área, status, fontes, título, slug, ordem e versão do parser). Cadernos inalterados no mesmo modelo não são parseados/indexados novamente. Caderno alterado tem seus chunks substituídos; somente representações ausentes são calculadas. O cache é por hash do texto sem marcações de área, contexto dos títulos e versão da representação. Área, fontes, slug, título do caderno ou status, isoladamente, podem reutilizar embeddings. Mudança de texto/títulos de seção/modelo invalida a representação pertinente.

Prepara todos os cadernos alterados fora da transação, incluindo validação. Embeddings podem ficar persistidos se o job falhar, para reaproveitamento seguro; não ficam visíveis sem chunks ativos. No swap: verifica lease sob lock, relê fontes com `FOR UPDATE`, compara fingerprints e substitui todos os documentos alterados/remove documentos excluídos em uma única transação Serializable. Resultado completed e troca do índice fazem parte do mesmo commit. Qualquer falha reverte o índice inteiro. Fonte modificada durante preparação causa `SOURCE_CHANGED`, exigindo nova solicitação. Transação tem timeout de 60s: excedê-lo falha com rollback, sem índice parcial.

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

Números ilustrativos. total/processed são cadernos; chunks conta chunks dos cadernos alterados nesta execução, não o total global. Progresso de preparação não indica que o índice já foi publicado. Estados: pending, processing, completed, failed. Poll sugerido: 2–5s. Erros: VALIDATION (issues), SOURCE_CHANGED, LEASE_LOST, WORKER_INTERRUPTED, OPENAI_API_KEY_REQUIRED, INVALID_VECTOR, VECTOR_DIMENSION_MISMATCH ou INDEXING_FAILED sanitizado. SDK/Prisma não têm seus erros brutos persistidos nem enviados na resposta.

Comuns: 401 UNAUTHORIZED, 400 INVALID_PAYLOAD, 404 JOB_NOT_FOUND, 413 INVALID_PAYLOAD (limite HTTP existente), 503 WORKER_DISABLED, 500 KNOWLEDGE_OPERATION_FAILED. O bodyLimit existente do Backend é 10 MiB, não um limite de número de cadernos/chunks; o payload de reindexação não transporta os cadernos.

## Configuração e adoção futura

Mantém `DATABASE_URL`, `ANTHROPIC_API_KEY`, `JUDITH_MODEL_HAIKU`, `OPENAI_API_KEY`, `INTERNAL_API_KEY`. OpenAI key passa a ser necessária para construir representações e buscar com candidatos; requer acesso/cota de embeddings. Há custo adicional de classificação e embeddings. Nenhuma chamada real foi feita nesta entrega.

`KNOWLEDGE_WORKER_ENABLED=false` é o padrão seguro antes da migração. Depois de migração validada/aplicada pelo responsável, schemas sincronizados e credenciais disponíveis, configurar `true`, iniciar serviço, solicitar primeira indexação e acompanhar completed. Antes do primeiro índice, não haverá trechos disponíveis. Não há fallback para a concatenação antiga. Instalar este código sem as tabelas não é suportado.

## Testes e limites da validação

`npm test` compila e executa testes locais com mocks. `test/fluxo.test.cjs` mantém opção antiga `JUDITH_TEST_READ_DB=1` para leitura de prompt real; **não ativada nesta entrega**. Nenhum teste novo abre banco/APIs reais.

Cobertura: 12 áreas/listas/erros/slug, parser ##/###/herança/sobrescrita/código, dois casos solicitados com fixtures, arquivos históricos reais LGPD/contratos, filtro SQL antes da similaridade, publicação, obsolescência, top 5/menos/sem fallback/integralidade, UTF-8 >169 mil caracteres e 117 chunks, classificação estrita, particionamento completo dos embeddings, primeira indexação/alterações/repetição/exclusão/falhas/rollback/fencing/concorrência, HTTP/autenticação/status e fluxos existentes de quotas/créditos/onboarding.

Executados: build, 21 testes node:test, 28 cenários do teste de fluxo; todos passaram na revisão desta entrega. A suíte não comprova locks/DDL/charset/performance reais de MySQL, disponibilidade/custo/relevância dos provedores, nem compatibilidade com os cadernos ativos ausentes. Não havia MySQL/Docker disponível para ensaio isolado. Nenhum número de cadernos/chunks é limite no código.

Pendências antes de produção: obter cadernos ativos e conferir especialmente base-propaganda/base-guias, corrigir áreas legadas mediante decisão editorial explícita, integrar Admin e ampliar seu transporte/validação, ensaiar migração/concorrência/rollback/charset em MySQL isolado, sincronizar os schemas e testar relevância com perguntas reais. Publicação e aplicação da migração permanecem fora desta entrega.
