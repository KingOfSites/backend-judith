# Importação autorizada dos 18 — 24/09/2026

**Atualização posterior:** os 18 foram publicados e indexados mediante nova autorização. [Resultado da publicação e busca real](knowledge-publication-result-2026-09-24.md). Abaixo permanece o registro da importação anterior, quando todos estavam em revisão.

**Concluída em produção, exclusivamente como EM_REVISAO.** Executado o comando autorizado após preflight às 16:44:03 UTC. Verificação independente por nova leitura às **16:46:01 UTC (13:46:01 Brasília)**.

```bash
bash /opt/judith-backend/backups/import-review-20260924/prepared/scripts/knowledge-import-vps.sh --apply-reviewed-18
```

## Resultado confirmado

- Antes: 17 registros, zero publicados, hashes das fichas e prompts iguais aos da preparação.
- Transação confirmada na primeira tentativa: **18 criados, zero ignorados, nenhum conflito**.
- Depois: **35 registros, todos EM_REVISAO, zero publicados**.
- Cada novo registro foi comparado ao manifesto e ao candidato: ID do recibo, slug, título, área, status, fontes, ordem e conteúdo integral conferem. SHA-256 do conteúdo de cada um está na evidência.
- Os 17 antigos foram comparados integralmente, incluindo IDs, conteúdo, metadados e timestamps: inalterados.
- Prompts: hash anterior e posterior idêntico, `1e57c34b004ab4fe8c827931ec15df93af7d39f39086b6c8fca4dfdaf115328f`.
- Hash de todas as fichas após importação: `7ac261ae7f68105e1a784ff9f94b0d58601d1146c2d241d960ecf21e5264ce5a`.
- Propaganda excluído; nenhum registro `base-propaganda`. Nenhuma alteração em `penal`.
- Guias permanece com `fontes=[]`, pendência editorial explícita. Slugs e ordem mantidos como organização provisória; títulos, versões e marcações preservados.
- **Sem publicação ou reindexação:** índice antes/depois com zero documentos, zero chunks e oito jobs. Nenhuma mensagem enviada a usuários; nenhum deploy.

[Evidência com os 18 IDs, hashes, metadados conferidos e hashes dos recibos](../review/knowledge-2026-09-24/production-import-verification.json).

## Backup e recibos

Diretório restrito na VPS:

```text
/opt/judith-backend/backups/import-review-20260924/apply-18-eaugTQlC
```

- `database.sql.gz`: backup completo anterior à escrita, 27 tabelas; leitura gzip e hash reconferidos após a operação.
- SHA-256 do dump: `707e6cf0976893c0e229c64c5083527917d9f061efe5f0be0f3ec1a321fb4d07`.
- `backup-verification.json`: recibo do backup.
- `before.json`, `after.json`: snapshots completos antes/depois.
- `import-commit.json`: confirmação de COMMIT, 18 criados, zero ignorados.
- `import-commit.json.attempt-1.json`: recibo de recuperação com os 18 IDs e valores completos criados. Seu marcador pré-COMMIT `VERIFY_COMMIT` foi reconciliado com a confirmação e com o banco: todos os registros existem e conferem.
- `result.json`: resultado do executor.
- `live-verification-snapshot.json`: leitura independente posterior.
- `verification.json`: resultado integral das conferências, sem texto dos prompts.

Dump e snapshots completos permanecem restritos na VPS; não foram adicionados ao Git. Credenciais temporárias `database.env` e `mysql-client.cnf` foram removidas pelo procedimento e sua ausência foi confirmada.

## Recuperação seletiva disponível, não executada

Somente mediante autorização para desfazer esta importação:

```bash
bash /opt/judith-backend/backups/import-review-20260924/prepared/scripts/knowledge-import-vps.sh --recover-created /opt/judith-backend/backups/import-review-20260924/apply-18-eaugTQlC/import-commit.json.attempt-1.json
```

O procedimento cria backup/snapshot novos e remove em transação somente os IDs criados neste recibo. Recusa alterações posteriores, publicação ou indexação; preserva os 17 antigos e os prompts. Não restaurar o dump integral para desfazer apenas o lote, pois isso poderia apagar outras alterações legítimas posteriores. Nenhuma recuperação foi necessária ou executada.

## Pendências para o Admin

Os 18 estão disponíveis para revisão, não aprovados para publicação. Permanecem as pendências de fontes de Guias, versões divergentes preservadas, sobreposições/lacunas editoriais e decisão sobre `penal` em Propaganda. A regra atual de `###` não mudou.

Não há conteúdo publicado/indexado: a importação não comprova busca hospedada com corpus real nem resposta final pelo WhatsApp. Publicação, reindexação e testes de canal exigem etapa autorizada própria. A preparação e os testes isolados estão em [knowledge-import-ready-2026-09-24.md](knowledge-import-ready-2026-09-24.md).
