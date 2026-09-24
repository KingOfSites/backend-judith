# Lote para revisão — 24/09/2026

**Estado mais recente, 17:39 UTC:** 18 publicados e indexados, 503 blocos; 17 antigos em revisão, Propaganda excluído. [Publicação, recuperação e validação real](../../docs/knowledge-publication-result-2026-09-24.md). As atualizações abaixo são históricas.

**Estado atual às 16:46 UTC:** os 18 candidatos foram importados em produção como EM_REVISAO mediante autorização. Total 35, zero publicados, Propaganda excluído, sem reindexação. [Resultado e recuperação seletiva](../../docs/knowledge-import-result-2026-09-24.md). As notas abaixo são o histórico da preparação.

**Atualização às 16:37 UTC:** snapshot real obtido, simulação sem conflitos e executor transacional testado em MariaDB isolado. [Preparação, evidências, backup, recuperação e comando futuro](../../docs/knowledge-import-ready-2026-09-24.md). O restante desta página registra a preparação offline inicial; a pendência de obter o primeiro snapshot e de construir o executor foi atendida. Não houve importação em produção.

**Não importado, não publicado, sem acesso ao banco.** Os 19 originais foram copiados byte a byte e preservados em `originals/`; as cópias de trabalho estão em `candidates/`. Conferência contra os hashes do inventário da entrega. Apenas Guias e Direito Autoral foram modificados, nos três pontos autorizados. `penal` permanece intacto em Propaganda. Parser e regra de `###` não foram alterados.

## Arquivos para o Admin

- [Manifesto](manifest.json): hashes original/candidato, três mudanças exatas, metadados propostos, origem/linha e pendências por arquivo.
- [Diff unificado](changes.diff): somente as três correções autorizadas. Guias ganha duas linhas após a antiga linha 5; a correção da antiga linha 105 aparece na linha 107 da cópia.
- [Metadados propostos](metadata.md): título e área explícitos; referências literais do cabeçalho. Slug sem versão, ordem do inventário e estado `EM_REVISAO` são propostas operacionais, não informações declaradas pelos autores.
- [Blocos e áreas efetivas](blocks.md): todos os 503 blocos válidos, com capítulo, subseção, linha e áreas efetivas.
- [Blocos integrais](blocks.json): texto completo e representação semântica de cada bloco, sem truncamento.
- [Estrutura do bloqueado](blocked-structure.json): títulos e marcações literais de Propaganda. A validação rejeita o caderno inteiro; não se apresenta uma lista parcial como apta a importar.
- [Simulação](simulation.json): payloads apenas para revisão, erros e plano offline. Não foi fornecido snapshot do banco: duplicidade contra dados atuais ainda precisa ser verificada.

## Resultado técnico

Build concluído; 20 testes locais passaram (17 regressões existentes e 3 testes do planejador). O primeiro comando de testes foi bloqueado pelo sandbox com `spawn EPERM`; a repetição autorizada passou. Nenhum teste acessou o banco de produção. Não houve ensaio de embeddings nesta rodada, pois não houve mudança na busca nem indexação.

| Candidato (sem prefixo JUDITH-) | Blocos válidos |
| --- | ---: |
| base-guias-v1 | 27 |
| base-propaganda-v1 | BLOQUEADO: penal, linha 89 |
| resumo-administrativo-v2 | 21 |
| resumo-ambiental-v2 | 62 |
| resumo-civil-contratos-v2 | 26 |
| resumo-civil-obrigacoes-v1 | 18 |
| resumo-civil-parte-geral-v1 | 24 |
| resumo-consumidor-v1 | 67 |
| resumo-direito-autoral-v1 | 14 |
| resumo-eca-v2 | 15 |
| resumo-empresarial-v1 | 39 |
| resumo-familia-sucessoes-v2 | 20 |
| resumo-lgpd-marco-civil-v3 | 11 |
| resumo-locacao-comercial-v1 | 9 |
| resumo-penal-tributario-v2 | 10 |
| resumo-previdenciario-mei-v1 | 17 |
| resumo-processo-civil-v1 | 41 |
| resumo-simples-nacional-v2 | 25 |
| resumo-tributario-v1 | 57 |
| **Total dos 18 válidos** | **503** |

Contagens são produzidas pelo parser atual, não pelos rótulos editoriais “CHUNK” ou “Versão” no texto. Guias não declara uma bibliografia estruturada no cabeçalho: `fontes=[]` é lacuna para revisão, não afirma ausência de referências no corpo. Propaganda declara CDC/CONAR na linha 3, preservada literalmente na proposta de fontes mesmo sem rótulo “Fonte”. Demais referências foram extraídas de Fonte/Fontes/Base/Legislação de referência; não se pretende inventariar todas as citações do corpo.

Há versões diferentes no nome e no cabeçalho (por exemplo Família `v2` no nome e `3.0` no cabeçalho; Administrativo `v2` no nome e `6` no cabeçalho). Ambas as evidências constam do manifesto; não se escolheu uma versão por suposição. Os títulos foram mantidos conforme o H1, inclusive Civil II/III: não se incorporou automaticamente o primeiro `##` ao título.

## Importador preparado em modo de simulação

A partir da raiz do repositório:

```powershell
npm run build
node scripts/knowledge-import.cjs --simulate review/knowledge-2026-09-24
# Opcional: comparação offline com exportação JSON autorizada, sem conectar ao banco:
node scripts/knowledge-import.cjs --simulate review/knowledge-2026-09-24 caminho/snapshot.json
```

Snapshot esperado: array de registros com `slug`, `titulo`, `area`, `status`, `fontes`, `ordem`, `conteudo` (exportação fiel dos campos do banco). Não foi exportado ou criado snapshot real nesta rodada.

O planejador exige 19 candidatos, confere hashes, rejeita slugs/conteúdos duplicados no lote, bloqueia erros do parser e aceita apenas status proposto `EM_REVISAO`. Na comparação com snapshot: mesmo slug, conteúdo e metadados resulta em `SKIP_IDENTICAL`; colisão de slug, conteúdo idêntico sob outro slug ou divergência de metadados resulta em `CONFLICT`. Sem snapshot, retorna `NEEDS_DATABASE_SNAPSHOT`, nunca declara ausência de colisões. `WOULD_CREATE` é uma simulação condicionada à fidelidade do snapshot e à aprovação editorial; não é autorização de escrita. Propaganda retorna `BLOCKED`.

**Não existe modo `--apply`, cliente de banco ou caminho de persistência neste executável.** Foi preparado o planejamento do importador, incluindo payloads e proteção contra repetição; o executor transacional de escrita fica para etapa autorizada, após decisões editoriais. Antes de implementá-lo/executá-lo: backup novo e recuperação testada, conferência ao vivo de IDs/slugs/hashes, proteção contra concorrência e manifesto dos IDs criados. Um snapshot offline não resolve corridas de escrita. Nenhum código de publicação/reindexação foi incluído.

## Pendências

- Cliente decidir `penal`, metadados, versões, sobreposições e lacunas dos 19 versus os 17, conforme a [proposta](../../docs/knowledge-import-proposal-2026-09-24.md).
- Regra atual de `###` preservada: sobrescrita local ao filho; irmãos retomam área do capítulo. Ambiguidade editorial continua pendente, sem impedir a inspeção técnica sob a regra vigente.
- Validação técnica não equivale a aprovação jurídica/editorial, autorização de importação ou de publicação.
- Comparação com o estado atual do banco e execução transacional ficam pendentes. Os 17 antigos e prompts não foram alterados.
- Busca hospedada com corpus aprovado e resposta final WhatsApp não foram validadas por este lote offline.
