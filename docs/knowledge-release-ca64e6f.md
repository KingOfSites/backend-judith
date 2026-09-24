# Entrega preservada no GitHub e backend ativado — 24/09/2026

Publicação autorizada pelo usuário após a validação local, com preservação dos cadernos e da pendência editorial. Concluída em 24/09/2026; verificação do backend em **23:45:31 UTC / 20:45:31 BRT**.

## Backend JUDITH

- Repositório: `KingOfSites/backend-judith`, branch `main`.
- Código publicado e ativo: [`ca64e6ffcd6e5097777b1338d8b1db4f03bda6ca`](https://github.com/KingOfSites/backend-judith/commit/ca64e6ffcd6e5097777b1338d8b1db4f03bda6ca).
- Commit preserva 134 arquivos relacionados: implementação, migração, testes, scripts administrativos/importador, lote original e candidatos, diffs, metadados, recibos sanitizados e relatórios das validações anteriores. Conferidos os hashes dos 19 originais e 19 candidatos também nos blobs preparados para Git: 38/38 idênticos ao manifesto.
- Container `judith-backend`: `running`, zero reinícios na verificação. Label de revisão e imagem conferidos.
- Imagem: `judith-backend:support-ca64e6ffcd6e5097777b1338d8b1db4f03bda6ca`; digest `sha256:e3ee7d1703d1d4175e386bb608775d82b2a50526647ca5b508e7deebdc5cd1ef`.
- Políticas em execução: `grounded-generation-v6`, `support-v11`.
- Saúde local e pública HTTP 200. O campo `versao=v22072026` do health é a versão do prompt; o SHA de código foi comprovado separadamente pela imagem/checkout.
- Validação em memória, local e pública: vazio 422, capa sem capítulos 422 (`SEM_BLOCOS`), capítulo com conteúdo válido 200/um bloco. Nenhum conteúdo de teste foi persistido.
- Embeddings locais: mesmo modelo E5 fixado, 1.024 dimensões, vetor finito. Nenhuma consulta jurídica ou mensagem WhatsApp foi enviada para testar o deploy.

Testes antes do commit: **41 testes + 47 cenários de fluxo**, além de três testes offline do importador. A imagem builder da VPS repetiu os 41 testes e os 47 cenários sem rede. `git diff --check` e verificação de segredos dos arquivos selecionados aprovados. A entrega de respostas jurídicas com provedor real permanece comprovada pelo ensaio isolado anterior, não por esses testes de saúde: [resultados dos seis casos](knowledge-pending-closure-2026-09-24.md).

## Backup, migração e rollback

Diretório restrito na VPS:

`/opt/judith-backend/backups/support-ca64e6ffcd6e5097777b1338d8b1db4f03bda6ca`

- Backup consistente completo de 27 tabelas: `database.sql.gz`, 5.358.776 bytes; gzip e contagem de tabelas verificados. SHA-256 `1c21f9d52d4ab5cdc41ff3b93afd03acf1a014a239ef0e76553332febaf04168`.
- Preservados prompts, ambiente, Compose/override, checksums de configuração, imagem/container e revisão anteriores. Dados completos e segredos permanecem no backup restrito, não no GitHub.
- Única mudança de schema: SQL aditivo `202609240002_knowledge_interaction`, criando `KnowledgeInteraction`. A tabela não existia antes; quatro colunas e zero linhas após criação conferidos. Não foi usado `db push` nem reaplicado histórico de migrations do banco compartilhado.
- O rollback restaura somente imagem e checkout anteriores, revisão `9959f206770b1104d9d1cf4f8e7b1a2f372a58e9`. Não apaga a auditoria nem restaura o banco automaticamente, evitando sobrescrever atividade posterior.

Comando exato de rollback, caso necessário:

```bash
bash /opt/judith-backend/backups/support-ca64e6ffcd6e5097777b1338d8b1db4f03bda6ca/rollback.sh
```

A configuração permaneceu idêntica aos checksums do backup. Não houve falha de ativação nem execução do rollback.

## Preservação dos dados

Antes/depois iguais: **35 cadernos, 17 EM_REVISAO e 18 PUBLICADA, 18 documentos, 503 blocos e 10 jobs**. Nenhuma reindexação, importação, publicação, alteração de área ou operação de cobrança foi solicitada nesta implantação. Não houve leitura de conversas pessoais nesta etapa.

- Hash dos registros completos dos cadernos: `2ea864401c149ea35b4624234bb3ba397c00e5e79d5edcf05b20689a6711fa73`.
- Hash dos prompts: `1e57c34b004ab4fe8c827931ec15df93af7d39f39086b6c8fca4dfdaf115328f`.
- Verificação de schema contou zero auditorias naquele instante; não foi inserida uma interação sintética em produção.

Recibos: [backup](evidence/2026-09-24/release-ca64e6f/backup-verification.json), [antes](evidence/2026-09-24/release-ca64e6f/before.json), [migração](evidence/2026-09-24/release-ca64e6f/migration.json), [verificação após ativação](evidence/2026-09-24/release-ca64e6f/verification.json), [revisão/imagem ativa](evidence/2026-09-24/release-ca64e6f/deployment.txt) e [testes da imagem](evidence/2026-09-24/release-ca64e6f/image-tests.txt).

Procedimento versionado: `scripts/deploy/stage-support.sh`, `activate-support.sh` e `verify-support.cjs`. Drivers dos ensaios isolados preservados em `scripts/validation/`. A confirmação documental posterior no GitHub não exige outra troca da imagem: a revisão de código ativa permanece a indicada acima.

## Admin JUDITH

- Repositório: `KingOfSites/admin-judith`.
- Estado inicial: quatro relatórios/recibos não versionados e dois arquivos gerados modificados (`next-env.d.ts`, `tsconfig.tsbuildinfo`).
- Durante a operação, outro trabalho no mesmo workspace criou [`f564cc75af1a71263bec6b51d2d05e85e09272b9`](https://github.com/KingOfSites/admin-judith/commit/f564cc75af1a71263bec6b51d2d05e85e09272b9), reunindo esses quatro arquivos e mais três recibos relacionados. O commit existente foi conferido e aproveitado, sem reescrita nem troca da branch local em uso.
- Sete arquivos documentais passaram pela verificação de segredos. O commit foi enviado a `main` e preservado também em `docs/relatorios-2026-09-24`. Os dois arquivos gerados ficaram intactos localmente e fora do commit.
- Como havia trabalho da entrega ainda ausente do GitHub, ocorreu **uma publicação automática** pela integração GitHub–Vercel. Nenhum deploy manual adicional foi disparado; não houve alteração funcional.
- GitHub: status Vercel `success`; ambiente `Production`, SHA `f564cc7`.
- Vercel CLI: **Ready**, deployment `dpl_GY5bfaX1qyJ9dH294wJSy4uNh7jL`.
- URL imutável: https://admin-judith-385c13bo7-solid-tech-8366995d.vercel.app.
- Alias confirmado no deploy: https://admin-judith.vercel.app.

## Pendências preservadas

O trecho do caderno LGPD sobre dados financeiros continua pendente de revisão editorial; a implantação não o corrige nem o torna juridicamente aprovado. Mantida a [proposta editorial](lgpd-editorial-proposal-2026-09-24.md) e o [diagnóstico específico](knowledge-pending-closure-2026-09-24.md). Também permanecem os limites de amostra e de confiabilidade do verificador registrados na validação.

Não foram executados novos testes de conversa pelo WhatsApp, nem inspeção visual/interativa do Admin nesta publicação documental. Saúde, contrato HTTP e embeddings foram conferidos no backend hospedado; isso não equivale a comprovar resposta final no WhatsApp. Não houve envio automático de teste, alteração de conexão, saldo, assinatura ou pagamento.
