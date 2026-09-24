# Publicação e busca real — 24/09/2026

**Execução concluída, com recuperação de uma falha de indexação e uma ressalva de classificação.** Estado final conferido às **17:39:12 UTC / 14:39:12 Brasília**: 35 cadernos, **18 PUBLICADA**, **17 antigos EM_REVISAO**, índice com **18 documentos, 503 blocos, 503 embeddings de 1024 dimensões e 542 vínculos de área**. Zero jobs ativos. Propaganda excluído.

## Escopo e preservação

Os 18 IDs vieram exclusivamente de `import-commit.json.attempt-1.json`, da operação `apply-18-eaugTQlC`. Antes de publicar, todos os 35 registros foram comparados com o snapshot após importação; os 18 foram também comparados integralmente com o recibo. A publicação alterou apenas status e timestamp de atualização desses 18, em transação Serializable. Conteúdo, área, título, fontes, slug e ordem não foram alterados. Os 17 antigos foram preservados integralmente, inclusive timestamps. Prompts e regra de `###` não foram alterados.

Depois da indexação, foram conferidos todos os 503 blocos contra o parser: texto integral, capítulo, subseção, linha, ordinal e áreas. Todos os vetores têm 1024 dimensões e norma aproximadamente 1; documentos têm fingerprint atual e modelo esperado. A lista completa de IDs do índice é exatamente a lista autorizada. Fontes de Guias continuam vazias, com pendência editorial preservada.

- [Publicação dos 18 IDs](evidence/2026-09-24/publication/publication-result.json).
- [Estado final e IDs indexados](evidence/2026-09-24/publication/final-state.json).
- Hash final das fichas: `2ea864401c149ea35b4624234bb3ba397c00e5e79d5edcf05b20689a6711fa73`.
- Hash dos prompts, inalterado: `1e57c34b004ab4fe8c827931ec15df93af7d39f39086b6c8fca4dfdaf115328f`.
- Saúde local HTTP 200, versão de prompt `v22072026`. Sem deploy e sem mensagens enviadas a usuários.

## Falha inicial e recuperação operacional

O primeiro job, `cmufs52yd0004jq80mp1zcz2q`, gerou os 503 vetores e processou 18/18, mas o worker falhou durante a gravação final. Nenhum documento ou chunk parcial ficou visível. O job terminou como `failed`, código `WORKER_INTERRUPTED`, após expirar a lease. [Recibo da primeira tentativa](evidence/2026-09-24/publication/first-job.json).

Foi feita uma única recuperação operacional com o mesmo indexador da imagem em execução, sem deploy: processo separado, job já adquirido em sua criação para impedir dupla execução pelo worker residente e limite da transação final ampliado de 60 para **240 segundos apenas nesse processo**. As validações de origem, fingerprint, filtro de publicados, lease e gravação atômica do algoritmo implantado foram mantidas. O cache foi reaproveitado; nenhuma área, conteúdo ou prompt foi modificado para contornar a falha.

Segundo job: **`cmuft3jns000048hx5evejp7k`**, chave `publish-18-receipt-eaugTQlC-retry-240s`, **completed às 17:36:36 UTC**. Resultado: 18 documentos alterados, 503 blocos criados, 542 vínculos criados, 503 embeddings reutilizados e **zero novas chamadas de embedding**. [Recibo da recuperação](evidence/2026-09-24/publication/retry-report.json).

A transação final dessa tentativa durou aproximadamente três minutos. Houve erros MySQL 1205 nas atualizações periódicas de acompanhamento, bloqueadas pela transação principal; ela confirmou e o job terminou sem erros. O limite padrão de 60 segundos é insuficiente para uma gravação desse porte nesta execução. O erro terminal da primeira tentativa registra interrupção/lease, não diagnostica sozinho toda a cadeia de falha. **Não houve correção permanente do timeout ou do acompanhamento no backend**: futuras reindexações grandes podem reencontrar o problema. Isso fica registrado como pendência operacional específica, sem abrir nova revisão geral nesta etapa.

## Busca real no ambiente de produção

Foram usados o classificador real, o contextualizador real e os embeddings locais reais, pelo caminho `retrieve → loadCandidates` do backend implantado e pelo banco de produção. Não houve mock de classificação, área forçada, geração de resposta jurídica final, gravação de conversas ou consumo de créditos de um usuário da JUDITH. As chamadas do classificador utilizam o provedor configurado e não são uma prova de cobrança do canal WhatsApp.

[Consultas e resultados originais](evidence/2026-09-24/publication/validation.json), [consultas complementares](evidence/2026-09-24/publication/search-supplement.json).

| Caso | Resultado observado |
| --- | --- |
| LGPD: eliminação de dados de cliente | Área lgpd; cinco blocos, incluindo o caderno LGPD/Marco Civil |
| Autoral: fotografia de terceiro em publicidade | Área autoral; cinco blocos, incluindo Direito Autoral |
| Tributário: opção pelo Simples Nacional | Área tributario; cinco blocos, incluindo Simples Nacional |
| Previdenciário: benefícios do MEI/INSS | Área previdenciario; cinco blocos, incluindo Previdência MEI |
| Consumidor: prazo de reparo de produto com defeito | Área consumidor; cinco blocos, incluindo Consumidor |
| Continuação: “E se a empresa se recusar a apagar?” | Mantém lgpd; consulta curta inclui apenas trecho literal da pergunta anterior do usuário; não inclui resposta anterior da JUDITH |
| Mudança de assunto: LGPD → fotografia de terceiro | Área autoral; consulta igual à pergunta atual; mesmos cinco IDs e mesma ordem da busca sem histórico |
| Ambiental explícito: licenciamento e poluição sonora | Área ambiental; cinco blocos, com licenciamento em primeiro e poluição sonora de bares em segundo |
| Administrativo explícito: defesa contra multa da prefeitura | Área administrativo; cinco blocos, com processo administrativo em primeiro |
| Trabalhista: férias pela CLT | Área trabalhista e zero blocos; o caderno antigo em revisão não entrou na busca |

Nos testes principais bem-sucedidos foi verificado filtro de área antes do embedding, limite de cinco, IDs provenientes do corpus autorizado e ausência da resposta distratora da JUDITH no embedding. O histórico de teste incluía intencionalmente uma resposta anterior sobre tema ambiental, sem que ela dominasse a continuação de LGPD ou a mudança para autoral.

**Ressalva preservada:** “Meu bar pode ser multado por ruído excessivo e poluição sonora?” foi classificada como `administrativo`, embora a expectativa do teste fosse `ambiental`. Os resultados administrativos eram pouco específicos para ruído (VISA, fiscalização, AVCB e alvarás). O teste original permanece marcado como falho em `validation.json`; não foi apagado nem convertido em sucesso. A formulação explícita sobre legislação ambiental recuperou os capítulos ambientais esperados. Isso demonstra sensibilidade do roteamento à formulação e uma limitação de relevância nesse caso, não falha de integridade do índice. Nenhuma orientação jurídica final foi gerada nesse ensaio. O corpus foi mantido publicado e consistente; não se modificou prompt ou taxonomia para fazer o teste passar.

## Backup e recuperação seletiva

Diretório restrito na VPS: `/opt/judith-backend/backups/publish-18-20260924`.

- Backup anterior à publicação: `database.sql.gz`, **27 tabelas**, leitura gzip validada novamente ao final.
- SHA-256: `5e43c05e320eaf3953f549b65d33c945b3857f717ece1fff313b3a6f29a92ddc`.
- `import-receipt.json`: seleção original dos 18 IDs.
- `before.json` e `published.json`: snapshots para comparação e recuperação da publicação.
- `publication-result.json`, `job.json`, `retry-report.json`, `validation.json`, `search-supplement.json`, `final-state.json`: resultados preservados.
- `rollback-publication.sh`, `publish18.cjs` e `receipts.sha256`: recuperação seletiva e hashes. [Hashes dos recibos](evidence/2026-09-24/publication/receipts.sha256).

Recuperação disponível, **não executada**:

```bash
bash /opt/judith-backend/backups/publish-18-20260924/rollback-publication.sh
```

Ela exige ausência de job ativo e compara os 18 registros com o snapshot publicado, recusando edições posteriores. Em uma transação, retira somente seus documentos/blocos derivados e restaura status EM_REVISAO e timestamp anterior. Preserva os 17 antigos e todos os conteúdos/metadados; o cache de vetores pode permanecer sem referências. Não apaga os cadernos importados. Não usar a recuperação de importação diretamente sobre registros publicados/indexados, nem restaurar o dump inteiro sobre mudanças posteriores do banco. Uma reversão futura requer autorização e conferência do estado então vigente.

## Roteiro curto para o próprio WhatsApp

1. Envie **“Oi”**: espere uma resposta breve e natural, sem consumo de crédito por consulta jurídica.
2. Pergunte **“Pela LGPD, um cliente pode pedir a eliminação dos dados pessoais que minha empresa guarda?”**.
3. Continue com **“E se a empresa se recusar a apagar?”**: confira se mantém o assunto e não inventa fatos.
4. Mude para **“Posso usar uma fotografia de outra pessoa na publicidade da minha empresa sem autorização do autor?”**: confira se passa a tratar de direito autoral, sem permanecer em LGPD.
5. Pergunte **“Quais são as condições tributárias para uma empresa optar pelo Simples Nacional?”**.

Anote horário, pergunta e resposta se houver falha ou troca indevida de assunto. A validação desta execução prova recuperação real de contexto no backend, **não a resposta final nem histórico/cobrança ponta a ponta pelo WhatsApp**. Nenhuma mensagem foi enviada a terceiros. O roteiro acima é para execução manual do próprio usuário.
