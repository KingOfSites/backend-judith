# Publicação da base de conhecimento — 23/09/2026

## Atualização do escopo — b22d764 (18:30 UTC)

**Deploy concluído; busca semântica real pendente de créditos de embeddings.** As seções seguintes registram o deploy inicial e seu estado histórico.

- Commit em execução: `b22d7648319d1a608110622d9600b075a3eea693`, branch da VPS `release-scope-b22d764`. Imagem `judith-knowledge:b22d764`, digest `sha256:b93e6cc504e2e3722468077900383cf5a2585fc2b2512e1743371e991f0dd727`.
- Confirmados: imagem do contêiner igual à imagem construída, label de revisão igual ao commit e ambos os filtros `PUBLICADA` presentes no indexador compilado. Health local e público 200 (`status=ok`), contêiner running, zero reinícios após os testes e limpeza.
- Acesso recuperado pelo mesmo método do deploy anterior: SSH com Paramiko e credencial local existente, sem reproduzir seu valor. Não foi necessário console Hostinger nem alterar credenciais.
- Rollback preservado: imagem `judith-backend-rollback:pre-b22d764` (digest `sha256:0ec77cb03c3042175d01e1647350952c5eea778ab206923b0bd2ab49e4a829b3`), configuração e revisão anteriores em `/opt/judith-backend/backups/scope-b22d764`. Script restrito `rollback.sh` nessa pasta restaura imagem e checkout anteriores. Nenhuma migration foi necessária.
- `npm test` do commit: build, 24 testes e 28 cenários aprovados. Na VPS, `test/knowledge-mysql.cjs` atualizado passou em MariaDB 10.11 descartável: revisão inválida não bloqueia publicado válido, fonte legada preservada, 117 chunks, filtro por área, idempotência, despublicação, rollback real, concorrência e exclusão. Nesse teste de integração os vetores são simulados; ele não comprova busca semântica real.
- Job real de produção `cmuefuehr0000qfgj9vsuenqi`, requestKey `scope-b22d764-production-check`: **completed**, total/processados/chunks = 0, sem erros, apesar de 12 cadernos em revisão com áreas inválidas. As 17 fichas continuam em revisão, sem publicações. Hashes de todas as fichas e prompts idênticos antes/depois. Validação autenticada de área inválida continua retornando 422.
- Teste com o provedor real em banco descartável `judith_knowledge_test`, com dois publicados sintéticos (`civil` e `lgpd`) e uma revisão inválida: job `cmuefut5f0002b21sa62inyad`, total 2, failed/INDEXING_FAILED. Erro original capturado: HTTP **429**, código **credit_balance_exhausted**, tipo **insufficient_quota**, mensagem “You have no credits remaining. Add credits to continue using the API”. Nenhum chunk parcial foi publicado; revisão legada permaneceu intacta. Claude classificou a pergunta sintética como `civil`, mas indexação e consulta semântica com filtro por área não foram concluídas por falta de embeddings.
- Recibos sem credenciais: `mysql-test.txt`, `deployment.txt`, `production-check.json` e `real-search.json` na pasta de backup acima. Contêineres/rede/banco descartáveis e arquivos temporários com credenciais foram removidos. Nenhum conteúdo sintético entrou no banco do cliente.

Pendência: repor créditos ou disponibilizar acesso válido ao provedor de embeddings e repetir o teste isolado de indexação e consulta por área. Deploy saudável não equivale a busca validada. Conferência visual do Admin permanece pendente de navegador conectado; nenhuma mudança funcional adicional foi feita no Admin.

Publicação e migração autorizadas explicitamente pelo usuário após a entrega inicial sem deploy.

## Ambiente e versão

- Backend: Docker na VPS, diretório `/opt/judith-backend`; não é projeto Vercel.
- URL: `https://judith-72-60-2-210.sslip.io`.
- Código em execução: `cd6f1a1`, branch da VPS `release-knowledge-cd6f1a1`.
- Imagem versionada: `judith-knowledge:cd6f1a1`.
- Digest: `sha256:0ec77cb03c3042175d01e1647350952c5eea778ab206923b0bd2ab49e4a829b3`.
- Worker habilitado por `docker-compose.override.yml`, `KNOWLEDGE_WORKER_ENABLED=true`.
- Health público/local 200, `status=ok`, versão de prompt `v22072026`, contêiner running e zero reinícios na verificação.

## Backup e banco

- Banco real: MariaDB 10.11.14, InnoDB, utf8mb4, usando a DATABASE_URL já configurada.
- Backup completo das 22 tabelas anteriores e da configuração: `/opt/judith-backend/backups/knowledge-20260923T160748Z`, acesso restrito. Gzip verificado antes da migração.
- Imagem anterior preservada: `judith-backend-rollback:pre-knowledge`.
- Aplicado somente o SQL `202609230001_knowledge_index/migration.sql`, via cliente MySQL. Não foi executado `db push` ou `migrate deploy` sobre schemas divergentes. O banco não possuía histórico Prisma; a aplicação direta está registrada neste relatório e no recibo da VPS.
- Criadas cinco tabelas Knowledge*; `FichaConhecimento.conteudo` ampliado para LONGTEXT/utf8mb4.
- Verificação após a migração: hashes de todas as fichas e prompts idênticos aos anteriores. Nenhum caderno publicado, corrigido ou apagado.

## Verificações

1. `npm test`: build, 22 testes node:test e 28 cenários de fluxo, aprovados.
2. `test/knowledge-mysql.cjs` executado em MariaDB 10.11 descartável, rede Docker isolada e credenciais próprias: migração, >169 mil caracteres, acentos/emoji, 117 chunks, leitura JSON, idempotência, áreas/publicação, rollback real por falha injetada, edição concorrente, dois workers e exclusão. Todos aprovados.
3. MariaDB retorna JSON de consultas brutas como texto em alguns caminhos. Corrigidas leitura de vetores e releitura de fontes sob lock para evitar diferenças de representação.
4. HTTP de produção: validação autenticada 200; requisições sem chave retornam 401 tanto localmente quanto publicamente; criação de job 202; consulta e repetição idempotente verificadas.
5. Claude classificou a pergunta sintética como `civil`. OpenAI recusou o teste de embedding com HTTP 429, código `credit_balance_exhausted`. Essa pendência não foi resolvida pelo deploy.

## Conteúdo atual e resultado da indexação

Banco possui 17 fichas, todas EM_REVISAO; zero PUBLICADA. Doze possuem áreas legadas inválidas:

| Slugs | Valor atual inválido |
| --- | --- |
| 01-mei, 02-me-epp | empresarial-tributario |
| 03-autonomo-sem-cnpj | empresarial-trabalhista |
| 04-contratos-geral, 14-prestacao-servicos, 15-compra-venda, 17-confidencialidade-nda | civil-contratual |
| 05-cdc-relacoes-consumo | consumo |
| 07-locacao | civil-imobiliario |
| 08-notificacao-extrajudicial, 09-cobranca-inadimplencia | civil-cobranca |
| 10-juizado-especial-civel | processual-civil |

Não há mapeamento automático desses valores. A correção requer decisão editorial explícita; slug não deve ser reutilizado como área.

Job de verificação `cmueb3l2f0000736xnmz62fbm`, requestKey `production-verification-cd6f1a1`: failed/VALIDATION, origem `01-mei:metadados`, valor `empresarial-tributario`. Nenhum índice parcial foi publicado. A mesma chave retornou o mesmo job. Após corrigir dados e repor saldo, usar requestKey nova.

## Handoff para Admin Judith

Backend e tabelas estão publicados. O Admin pode implementar seu contrato usando [knowledge-base.md](knowledge-base.md):

- Chamadas server-side para a URL acima, com `x-internal-key` usando o mesmo INTERNAL_API_KEY; exigir a autenticação Admin já existente. Não expor o segredo em browser ou variáveis NEXT_PUBLIC.
- Validar `{area, conteudo}` via POST `/internal/knowledge/validate` antes de salvar; mostrar campo, linha, capítulo, origem e valor inválido quando disponíveis.
- Preservar o conteúdo integral e permitir listas de áreas válidas por vírgula; manter slug independente.
- Sincronizar schema LONGTEXT e os modelos novos conforme política do banco compartilhado. Não reaplicar nem recriar a migration já executada e não usar schema incompleto para db push.
- Remover limite legado de 65.535 bytes de criação/edição e verificar limites HTTP do Admin/hospedagem para os cadernos grandes.
- Solicitar POST `/internal/knowledge/reindex` após alterações/publicação/despublicação/exclusão, com requestKey nova por operação; tratar 409 (job já ativo), consultar o job até completed/failed e mostrar seus erros/resultado. Nunca mostrar sucesso de indexação apenas porque recebeu 202.
- Permitir revisão explícita das 12 áreas legadas sem converter nem publicar automaticamente.
- Manter os prompts aprovados e demais funcionalidades intactos.

Pendências externas: saldo de embeddings na OpenAI, revisão das áreas e disponibilização dos cadernos novos base-propaganda/base-guias. Eles não existem entre as 17 fichas atuais; seus testes continuam sendo fixtures. A busca terá conteúdo apenas depois de fichas válidas serem indexadas e publicadas pelo responsável.
