# Preparação transacional dos 18 candidatos — 24/09/2026

**Atualização posterior:** importação autorizada concluída e verificada às 16:46 UTC: 18 criados em EM_REVISAO, total 35, zero publicados. [Resultado e recibos de recuperação](knowledge-import-result-2026-09-24.md). O texto abaixo preserva o estado da preparação anterior à autorização.

**Preparado e testado; importação em produção NÃO executada. Nenhum caderno publicado.** Slugs e ordem do manifesto passam a ser a organização provisória autorizada para o lote. Títulos, marcações, versões e regra de `###` permanecem intactos. Guias continua com `fontes=[]`, ausência explicitamente pendente de revisão. Propaganda permanece excluído por `penal`; o executor seleciona apenas os outros 18, nunca tenta corrigir esse arquivo.

## Simulação contra produção real

Snapshot obtido exclusivamente por SELECT em transação RepeatableRead, às **16:30:47 UTC (13:30:47 Brasília)**. Foram exportados os registros completos das fichas, mas apenas o hash dos prompts, sem seus textos. Exportação completa restrita fora do Git:

- VPS: `/opt/judith-backend/backups/import-review-20260924/current-snapshot.json`.
- Cópia local: `../.work-deploy-local/import-current-snapshot.json`.
- SHA-256 do arquivo: `2fc893b7dfd6a16b83039a68a377ebcb0968492ebd1c9ed939db7cea9a49f97a`.

Resultado: **17 registros existentes; zero publicados; 18 WOULD_CREATE, zero conflitos, zero registros idênticos a reaproveitar; Propaganda BLOCKED e excluído da escrita.** [Resultado por candidato](../review/knowledge-2026-09-24/simulation-current.json).

Nova conferência somente de leitura às **16:37:26 UTC** confirmou 17 registros, zero publicados e hashes inalterados:

- Fichas: `9f59935593b94475c67d96f9f5903dc7a5b728a7d52ee0f6e58e9d566ae89546`.
- Prompts: `1e57c34b004ab4fe8c827931ec15df93af7d39f39086b6c8fca4dfdaf115328f`.

Esta comparação usa o banco real naquele instante. Não garante que ele permanecerá igual até a autorização: o executor obtém snapshot novo e reconcilia novamente durante a transação. Duplicação é verificada por slug e conteúdo exato; similaridade temática não é equivalência automática.

## Executor

[Executor transacional](../scripts/knowledge-import-execute.cjs), [snapshot somente de leitura](../scripts/knowledge-snapshot.cjs) e [procedimento VPS](../scripts/knowledge-import-vps.sh).

- Requer ação explícita `--apply`, hash fixado do manifesto e snapshot completo anterior. Não carrega `.env` implicitamente.
- Reconfere hashes dos originais, candidatos e manifesto e valida os 18 pelo parser dentro da transação. Todos são criados como `EM_REVISAO`.
- Transação `Serializable`, com leitura bloqueante de toda a faixa do índice primário de `FichaConhecimento`. Isso serializa a decisão de conflito e as inserções, incluindo escritores que não usam um lock voluntário. Pode bloquear temporariamente edições do Admin; executar em janela coordenada. Timeout aborta, sem afrouxar a verificação.
- Confere os registros do snapshot integralmente e o hash dos prompts. Mudanças desde o snapshot ou registros inesperados exigem nova revisão. Não atualiza os antigos nem os prompts.
- IDs determinísticos do lote; registro idêntico é ignorado, divergência aborta toda a transação. Restrição única de slug também permanece ativa no banco.
- Retry limitado a deadlock/aborto transacional confirmado (`P2034`), até quatro tentativas. Falha com resultado de COMMIT desconhecido não é repetida automaticamente.
- Antes do COMMIT, grava recibo exclusivo e sincronizado em disco, com IDs/valores completos dos registros efetivamente criados. Após sucesso, grava confirmação separada. Recibo pré-COMMIT tem `VERIFY_COMMIT`: existência do arquivo sozinha não prova que a transação confirmou.
- Não há publicação, reindexação, chamadas de embeddings ou envio de mensagens no executor.

O snapshot inicial autoriza apenas uma linha de base técnica: a execução continua dependente de autorização do usuário. O campo `approvedForImport:false` do manifesto original foi preservado como registro da preparação editorial; a autorização operacional não é inferida desse arquivo nem da simulação.

## Testes em banco isolado

MariaDB 10.11 descartável, InnoDB e `LONGTEXT`, rede Docker interna própria, sem credenciais nem conexão com o banco de produção. Importados os **18 candidatos reais do lote** contra **17 registros legados sintéticos** e um prompt sintético. Portanto, a importação/recuperação foi testada de verdade em banco, mas não com cópias de usuários ou prompts reais.

[Recibo completo](../review/knowledge-2026-09-24/isolated-import-report.json). [Teste reproduzível](../test/knowledge-import-mysql.cjs).

| Caso | Resultado |
| --- | --- |
| Importar 18 candidatos | 18 criados; total 35; nenhum PUBLICADA; Propaganda ausente |
| Repetir importação | Zero criados; 18 ignorados como idênticos |
| Recuperar recibo de repetição | Zero removidos; não assume propriedade de registros anteriores |
| Recuperar recibo da criação e repetir recuperação | 18 removidos; segunda execução remove zero |
| Slug existente com conteúdo diferente | Conflito; nenhuma criação do lote |
| Falha injetada após quinta inserção | Rollback integral; total volta a 17 |
| Dois executores concorrentes | Um cria 18, outro ignora 18; total 35, sem duplicação |
| Registro editado após importar | Recuperação recusada; deleções anteriores da mesma transação também revertidas |
| Registro novo após snapshot | Importação recusada por snapshot desatualizado |
| Preservação ao final | 17 registros sintéticos e prompt exatamente iguais à linha de base |

Containers, rede e credenciais temporárias foram removidos após o teste; recibos foram preservados. Também passaram os **20 testes locais** do planejador/parser, incluindo adulteração de hashes, duplicidade de conteúdo e slug, conflito de metadados, bloqueio de `penal` e proibição de `PUBLICADA`. Sintaxe do wrapper VPS validada com `bash -n`. O wrapper de backup/aplicação em produção não foi executado; sua persistência utiliza o mesmo executor exercitado no banco isolado.

## Pacote preparado na VPS

Diretório: `/opt/judith-backend/backups/import-review-20260924/prepared`.

Contém scripts e cópias do lote, com `SHA256SUMS` verificado. Não foi instalado no backend em execução e não houve deploy.

- Manifesto: `99886b09a8850e0896d0e67feeee2d53a722931e8ef2a87075e115d9631c6e5e`.
- Arquivo `import-prepared.tgz`: `4a6fe1d5c70b441ca86d5663e3b79f2e510b151ebdf58267f2d225fc60ca3bb2`.
- Arquivo `prepared/SHA256SUMS`: `d0d68d42c5f6974038bfa76a785d05e8080bdd15483bcc5e5c09c603289db6c1`.
- Imagem usada pelo runner/teste: `judith-backend:review-e330465`; revisão exigida `e330465bd29a4a7bc88cdc5f067fa0747b89d70d`.

## Comando exato, somente após autorização

Na VPS, como operador com acesso Docker e ao procedimento de backup:

```bash
bash /opt/judith-backend/backups/import-review-20260924/prepared/scripts/knowledge-import-vps.sh --apply-reviewed-18
```

**Esse comando não foi executado.** Ele confere o pacote, cria uma pasta restrita `apply-18-XXXXXXXX`, faz dump completo novo com `mysqldump --single-transaction`, rotinas/triggers/eventos, valida leitura gzip e pelo menos 27 tabelas e registra hash. Depois obtém snapshot fresco, executa a transação dos 18 e grava snapshot posterior e recibos. Credencial temporária contém apenas `DATABASE_URL`, tem acesso restrito e é removida ao terminar; não aparece na linha de comando. Backup completo fica restrito na VPS, sem envio ao Git.

Se o backup, hash, snapshot ou qualquer conflito falhar, interromper e analisar; não apagar recibos nem sobrescrever registros para continuar. Em perda de conexão após COMMIT, consultar o recibo de tentativa e os IDs antes de qualquer nova ação. Reexecução completa cria outra pasta de operação e reconcilia idempotentemente o estado, sem reutilizar/truncar recibos.

## Recuperação seletiva

Usar **o recibo de tentativa da operação que criou os registros**, indicado em `result.json`/`import-commit.json`. Exemplo de forma do comando, substituindo apenas a pasta e tentativa pelos valores reais:

```bash
bash /opt/judith-backend/backups/import-review-20260924/prepared/scripts/knowledge-import-vps.sh --recover-created /opt/judith-backend/backups/import-review-20260924/apply-18-XXXXXXXX/import-commit.json.attempt-1.json
```

O wrapper faz backup e snapshot novos antes da recuperação. A transação remove somente IDs do recibo, nunca os IDs da linha de base. Exige valores e timestamps exatamente iguais aos gravados, estado `EM_REVISAO` e ausência de documento indexado. Ausentes são ignorados; editados, publicados ou indexados bloqueiam a operação inteira. Se já houve revisão editorial, decidir recuperação manual específica; não restaurar o dump integral sobre dados compartilhados posteriores. A recuperação seletiva e sua proteção contra edições foram testadas no banco isolado; restauração integral do dump futuro não foi executada/testada nesta rodada.

## Pendências

1. Autorização explícita para executar a importação em produção. Os 18 estão preparados para entrada em revisão, não para publicação.
2. Guias: fontes continuam pendentes; títulos e versões divergentes continuam preservados para revisão. Slugs e ordem são provisórios conforme autorização.
3. Propaganda: decisão editorial sobre `penal`, fora deste lote de 18.
4. Revisão editorial de sobreposições, lacunas dos 19 versus 17 e escopo de `###`; regra atual preservada.
5. Após eventual importação: conferir os 35 registros esperados (se a base continuar em 17), 18 novos em revisão, antigos/prompts inalterados e zero publicações novas. Publicação e reindexação exigem outra autorização.
6. Não houve validação de respostas hospedadas ou WhatsApp. Importação em revisão não cria corpus publicado nem demonstra resposta jurídica final.
