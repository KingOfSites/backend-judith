# Proposta de importação dos 19 cadernos — 24/09/2026

**Para revisão do cliente e do Admin. Nenhuma correção editorial, importação, publicação ou escrita no banco foi executada nesta rodada.**

## Evidências e limites

Foram encontrados os 19 arquivos declarados, em `C:/Users/Kauã/Downloads/judith-entrega-extracted/JUDITH-ENTREGA-23072026/01-conteudo-ia/base-rag/`. Seus hashes foram reconferidos contra o [inventário](evidence/2026-09-24/inventory.json). As duas cópias do ZIP da entrega contêm o mesmo conjunto: não são duas versões a importar. `_MANIFESTO-cross-tags-v1.md` e `_patch_kw.py` não são cadernos e não integram o lote.

Os 17 antigos são outro conjunto, com slugs `01-mei` a `17-confidencialidade-nda`, presente no banco e em `knowledge/`. Portanto, a diferença não significa que faltaram dois arquivos numa importação dos 19. A comparação abaixo usa os textos locais históricos e os novos originais; é um mapa de cobertura temática, **não uma equivalência jurídica ou integral de conteúdo, nem uma comprovação de igualdade byte a byte entre `knowledge/` e o banco**.

O último estado de produção registrado, em 24/09 às 15:11 UTC, tem backend `e330465`, parser `markdown-v3`, 17 fichas `EM_REVISAO`, nenhuma publicada e nenhum documento/chunk indexado. A reindexação dos publicados concluiu com zero itens. Esta proposta usa esse registro, sem nova consulta ao banco. Ver [resultado da implantação](knowledge-release-e330465.md) e [evidência após ativação](evidence/2026-09-24/post-activation-e330465.json). O estado deverá ser reconferido antes de uma futura importação.

Não faltam arquivos entre os 19 declarados. Os dois cadernos trabalhistas, material e processual, mencionados na especificação como entrega posterior em revisão externa, não foram encontrados no escopo pesquisado anteriormente. Seus nomes e versões não estão definidos nesses trechos. O antigo `06-direito-trabalho` não comprova recebimento deles.

## Quatro ocorrências inválidas em três arquivos

Linhas contadas a partir de 1 nos originais, sem edição. O [diagnóstico original](evidence/2026-09-24/original-validation.json) registra os quatro erros. A área de metadados `civil` usada naquele diagnóstico era apenas uma entrada de teste: não constitui proposta de classificação dos 19 cadernos.

Contrato vigente: `administrativo`, `ambiental`, `civil`, `consumidor`, `eca`, `empresarial`, `lgpd`, `tributario`, `previdenciario`, `processual`, `trabalhista`, `autoral`. As sugestões abaixo dependem de aprovação; não foram aplicadas.

| Arquivo e linha | Trecho original | Sugestão para revisão e justificativa |
| --- | --- | --- |
| `JUDITH-base-guias-v1.md:5` | `**Área:** administrativo, empresarial *(TAGUEADO POR MÓDULO em 06/07 — cada MÓDULO abaixo tem sua própria área; este guia não usa mais tag "geral" única. A tag válida por chunk é o cabeçalho Área do módulo.)*` | Deixar a marcação como `**Área:** administrativo, empresarial` e preservar a explicação integral em parágrafo separado. A anotação hoje integra o segundo identificador e o torna inválido. A capa não gera chunk, mas suas áreas continuam sendo lidas e validadas para herança. |
| `JUDITH-base-guias-v1.md:105` | `**Área:** empresarial, tributário, administrativo` | Propor `**Área:** empresarial, tributario, administrativo`. O módulo 4, “FRENTE ADMINISTRATIVA” (linha 103), já declara as três áreas; a mudança proposta é apenas adequar o identificador acentuado à grafia do contrato. |
| `JUDITH-base-propaganda-v1.md:89` | `**Área:** consumidor, empresarial, penal` | Manter bloqueado até decisão editorial. Opção dentro da taxonomia atual: `**Área:** consumidor, empresarial`, somente se o cliente aprovar a retirada do roteamento `penal`, preservando toda a prosa sobre riscos penais. Essas duas áreas já estão declaradas no módulo 4, “SORTEIOS, RIFAS E PROMOÇÕES COM PREMIAÇÃO” (linha 87). Não há equivalência automática de `penal` com uma das 12 áreas. Se a intenção exigir rota penal independente, será necessária decisão de escopo do produto, fora desta importação. |
| `JUDITH-resumo-direito-autoral-v1.md:7` | `**Área:** direito-autoral` | Propor `**Área:** autoral`, identificador permitido para o tema explicitamente nomeado pelo próprio caderno. Não muda o assunto nem autoriza alteração da prosa. |

Em Propaganda, acrescentar `administrativo` por haver autorizações no assunto também seria uma decisão editorial adicional, não uma tradução de `penal`. Não proponho adicionar uma 13ª área nem suprimir texto para contornar o validador.

## Comparação dos 17 antigos com os 19 novos

Na tabela, nomes novos omitem apenas o prefixo `JUDITH-` e a extensão `.md`. “Cobertura” significa assunto localizado; não garante preservação de cada orientação, modelo ou exemplo antigo.

| Antigo (`knowledge/`, slug) | Novos candidatos de cobertura | Decisão ou diferença a revisar |
| --- | --- | --- |
| `01-mei` | `resumo-simples-nacional-v2`, `resumo-tributario-v1`, `resumo-empresarial-v1`, `resumo-previdenciario-mei-v1`, `base-guias-v1` | Conteúdo repartido entre tributação, operação e previdência; não substituir pelo primeiro título parecido. |
| `02-me-epp` | `resumo-empresarial-v1`, `resumo-simples-nacional-v2`, `resumo-administrativo-v2`, `base-guias-v1` | Abertura, obrigações e encerramento distribuídos; definir referência principal por assunto. |
| `03-autonomo-sem-cnpj` | `resumo-simples-nacional-v2`, `resumo-tributario-v1`, `resumo-previdenciario-mei-v1`, `resumo-civil-contratos-v2` | Cobertura tributária/previdenciária/contratual; não demonstrada substituição integral dos alertas sobre vínculo trabalhista. |
| `04-contratos-geral` | `resumo-civil-contratos-v2`, `resumo-civil-obrigacoes-v1`, `resumo-civil-parte-geral-v1` | Reorganização em contratos, obrigações e atos jurídicos; conferir exemplos antigos necessários. |
| `05-cdc-relacoes-consumo` | `resumo-consumidor-v1`, `base-propaganda-v1`, `base-guias-v1` | CDC ampliado e separado de publicidade/canais administrativos; revisar sobreposições. |
| `06-direito-trabalho` | Trechos de `resumo-eca-v2`, `resumo-previdenciario-mei-v1`, `resumo-lgpd-marco-civil-v3` | **Sem substituto integral demonstrado.** Aprendizagem, previdência e dados de empregados não substituem o caderno de CLT. Aguardar os dois trabalhistas ou aprovar explicitamente a lacuna. |
| `07-locacao` | `resumo-locacao-comercial-v1`, `resumo-civil-contratos-v2` | O antigo inclui residencial, temporada e curta duração; não assumir que o foco comercial preserva toda essa cobertura. |
| `08-notificacao-extrajudicial` | `base-guias-v1`, `resumo-civil-obrigacoes-v1`, `resumo-civil-contratos-v2` | Há protesto, mora e notificações em contextos específicos; **não demonstrada substituição do roteiro e modelo próprio do antigo**. |
| `09-cobranca-inadimplencia` | `resumo-civil-contratos-v2`, `resumo-civil-obrigacoes-v1`, `resumo-consumidor-v1`, `base-guias-v1`, `resumo-processo-civil-v1` | Cobrança contratual, limites consumeristas, protesto e execução distribuídos. |
| `10-juizado-especial-civel` | `resumo-processo-civil-v1`, `resumo-consumidor-v1` | JEC aparece no processo civil (capítulo na linha 720); revisar preservação do roteiro prático antigo. |
| `11-lgpd` | `resumo-lgpd-marco-civil-v3` | Sucessor temático principal; também inclui Marco Civil, WhatsApp empresarial e dados de empregados. |
| `12-simples-nacional-impostos` | `resumo-simples-nacional-v2`, `resumo-tributario-v1`, `resumo-penal-tributario-v2` | Separação de regime, tributos e riscos penais tributários; não somar as áreas por inferência do título. |
| `13-alvara-licencas` | `resumo-administrativo-v2`, `resumo-ambiental-v2`, `base-guias-v1` | Licenças administrativas, ambientais e orientações práticas têm interseções. |
| `14-prestacao-servicos` | `resumo-civil-contratos-v2`, `resumo-consumidor-v1` | Contratos tem capítulo de serviços (linha 204); conferir cláusulas/exemplos e distinção entre relação civil e de consumo. |
| `15-compra-venda` | `resumo-civil-contratos-v2`, `resumo-consumidor-v1` | Compra e venda na linha 79 de Contratos e regras de consumo em outro caderno. |
| `16-sociedade-empresarial` | `resumo-empresarial-v1`, `resumo-civil-parte-geral-v1`, `resumo-familia-sucessoes-v2` | Sociedades e pessoas jurídicas; Família acrescenta morte do MEI e divórcio com quotas, sem equivaler ao antigo inteiro. |
| `17-confidencialidade-nda` | Temas próximos em `resumo-lgpd-marco-civil-v3` e `resumo-empresarial-v1` | **Sem sucessor dedicado demonstrado.** Proteção de dados e propriedade industrial não equivalem ao NDA, suas cláusulas e modelo. Cliente decide se pede complemento ou aceita retirada desse escopo. |

Todos os 19 novos estão identificados abaixo para evitar que os complementos desapareçam do planejamento:

| Arquivo (sem `JUDITH-` / `.md`) | Papel proposto no conjunto |
| --- | --- |
| `base-guias-v1` | Canais de reclamação, agências, protesto e rotinas administrativas; interseção com vários antigos. |
| `base-propaganda-v1` | Publicidade, CONAR, promoções e venda online; amplia o antigo CDC. |
| `resumo-administrativo-v2` | Atos, processos, licitações e licenças; amplia o antigo Alvarás. |
| `resumo-ambiental-v2` | Caderno dedicado novo; interseção com licenças, resíduos e ruído. |
| `resumo-civil-contratos-v2` | Consolida assuntos antes separados em contratos, serviços, compra e venda e locação. |
| `resumo-civil-obrigacoes-v1` | Obrigações, mora e responsabilidade; complemento transversal. |
| `resumo-civil-parte-geral-v1` | Pessoas, bens e atos jurídicos; complemento transversal. |
| `resumo-consumidor-v1` | Referência temática principal do antigo CDC. |
| `resumo-direito-autoral-v1` | Caderno dedicado novo: autoria, licenças, ECAD, software e outros usos. |
| `resumo-eca-v2` | Caderno dedicado novo: aprendizagem, atividades, publicidade e proteção de menores. |
| `resumo-empresarial-v1` | Sociedades, marcas, títulos e operação empresarial. |
| `resumo-familia-sucessoes-v2` | Caderno dedicado novo, com impactos patrimoniais no pequeno negócio. |
| `resumo-lgpd-marco-civil-v3` | Amplia o antigo LGPD. |
| `resumo-locacao-comercial-v1` | Especialização comercial; não representa sozinho toda a locação antiga. |
| `resumo-penal-tributario-v2` | Complemento dedicado de riscos tributários/consumo; título não autoriza área `penal`. |
| `resumo-previdenciario-mei-v1` | Consolida previdência de MEI/autônomo e temas correlatos. |
| `resumo-processo-civil-v1` | Amplia JEC para processo e execução. |
| `resumo-simples-nacional-v2` | Referência dedicada do regime, MEI e obrigações correlatas. |
| `resumo-tributario-v1` | Referência tributária mais ampla, com interseções com Simples e MEI. |

## Substituição proposta, sem duplicidade ativa e com recuperação

**Recomendação:** preservar integralmente os 17 registros históricos, manter seus IDs/slugs e estado não publicado; preparar um lote distinto de 19 candidatos revisados. Não sobrescrever antigos por semelhança de título nem somar ambos os conjuntos na busca. Isso preserva cópias históricas deliberadamente, mas evita duas gerações publicadas do mesmo conteúdo. Se o cliente exigir também ausência de cópias históricas no banco, deverá aprovar outra política de arquivo externo; não é a opção recomendada.

O esquema atual tem `RASCUNHO`, `EM_REVISAO` e `PUBLICADA`; não existe estado `ARQUIVADA`, nem relacionamento de sucessão/versionamento. A rastreabilidade terá de ficar em manifesto auditável do lote, sem simular campos inexistentes. Os antigos já estão `EM_REVISAO`; não é necessário editá-los. Há áreas legadas inválidas em 12 antigos, portanto não presumir que salvá-los novamente pelo Admin passe na validação atual.

Procedimento futuro, **condicionado a autorização específica**:

1. **Congelar a referência e preparar recuperação.** Reconsultar IDs, slugs, status, hashes e índice; fazer novo backup consistente do banco e exportação completa dos 17 registros com todos os metadados. Guardar ZIPs/originais e hashes em local restrito. O backup da implantação anterior é referência histórica, não substitui este backup futuro. Testar restauração em banco isolado antes da troca.
2. **Aprovar o lote editorial.** Cliente decide as quatro marcações, as lacunas da comparação, o escopo de `###` e os metadados de cada arquivo: título, slug, área padrão, fontes e ordem. Conservar originais imutáveis e registrar cada diferença aprovada numa cópia de trabalho. Não inferir metadados apenas pelo nome do arquivo.
3. **Criar manifesto e simular.** Registrar chave do lote, arquivo/versão, SHA-256 original e aprovado, slug estável proposto, ID de destino, metadados aprovados, referências antigas muitos-para-muitos e decisão de cobertura. Sugestão de slug: nome do arquivo sem `JUDITH-`, `.md` e sufixo de versão, sujeito à verificação de colisões. Conferir os 19 hashes e rejeitar arquivos repetidos, slugs conflitantes e divergências não aprovadas. A versão pertence ao manifesto; não criar outro registro a cada reexecução.
4. **Validar sem persistir.** Submeter cada candidato à validação atual, com seus metadados aprovados. Exigir zero erros, ao menos um capítulo `##` com conteúdo, relatório de blocos inteiros e áreas efetivas de cada bloco. Revisar contagem e heranças. Não importar os três inválidos nem aceitar os outros 16 automaticamente apenas porque passaram no diagnóstico técnico.
5. **Importar somente para revisão.** Após autorização, criar uma vez cada registro do lote como `EM_REVISAO`, preservando os antigos. O futuro importador deve ser idempotente: mesmo lote/slug/hash = nenhuma nova escrita; colisão ou conteúdo diferente = interromper e pedir revisão, nunca sobrescrever silenciosamente. `slug` único ajuda, mas não substitui o manifesto e a conferência de hashes. Registrar IDs criados e hashes antes/depois; não alterar prompts ou tabelas de usuários/cobrança.
6. **Resolver sobreposições antes de publicar.** Cliente define qual caderno é referência para capítulos sobre MEI, licenças, cobrança, locação e consumo. Relatório de similaridade pode sinalizar repetições; não pode excluir ou fundir texto automaticamente. O cache de embeddings não elimina duplicidade editorial dos resultados. Uma aprovação do conjunto precisa aceitar as interseções legítimas e resolver repetições indesejadas.
7. **Troca futura controlada.** Publicar somente IDs explicitamente aprovados, em operação planejada e auditada; os 17 antigos continuam não publicados. Se o estado tiver mudado desde o levantamento, interromper e reconciliar a seleção antes da troca. Reindexar os publicados com uma nova `requestKey`, acompanhar até estado terminal e conferir IDs, áreas, quantidade de documentos/chunks e falhas. A mudança de status e a conclusão do índice não são uma troca instantânea garantida; planejar a janela de indisponibilidade e não prometer resposta jurídica antes de haver contexto confiável.
8. **Aceitar ou reverter o lote.** Validar busca hospedada com perguntas atuais, continuações e mudanças de assunto, filtro de área, até cinco blocos integrais e atualização de uma frase em ambiente isolado. Se falhar, retirar de publicação apenas os novos IDs do lote, restaurar os estados anteriores registrados e reconciliar o índice. Conferir hashes antes de reverter para não apagar edições concorrentes. No estado observado, rollback retorna a zero publicados — não autoriza publicar os antigos. Evitar restauração integral sobre o banco compartilhado, que apagaria alterações posteriores de outras funções; recuperar seletivamente pelo manifesto/exportação. Restauração completa só mediante procedimento próprio e nova autorização.

## Decisões pendentes do cliente

- **Áreas:** aprovar ou rejeitar cada uma das quatro sugestões, especialmente o destino editorial do módulo de promoções com `penal`; aprovar área padrão e demais metadados de cada caderno, sem usar o `civil` do diagnóstico como padrão real.
- **Cobertura:** confirmar se os 19 passam a ser o conjunto oficial; decidir tratamento de trabalhista, NDA, modelos de notificação e locações não comerciais. Nenhum texto faltante será inventado nem mesclado automaticamente a partir dos antigos.
- **Herança de `###`:** a especificação da entrega (§3, linhas 58–59) e a orientação “até aparecer outra linha” permitem leituras diferentes. Hoje, uma marcação no topo/`##` substitui a área vigente e persiste para capítulos seguintes; `###` herda a área do capítulo, e marcação própria vale apenas para aquele filho. Irmãos seguintes e o próximo capítulo retomam a área vigente do capítulo. Exemplo: `##` civil → `###` com consumidor → `###` sem marcação resulta hoje em civil, consumidor, civil. Na leitura persistente, o último seria consumidor. Os módulos de Guias (área na linha 37, filhos nas linhas 41–77) e as marcações de Propaganda mostram herança, mas não resolvem essa divergência. Cliente deve escolher explicitamente; nenhuma regra foi alterada nesta rodada.
- **Soma ou substituição:** o manifesto antigo de cross-tags menciona adição; o contrato atual usa substituição das listas explícitas, sem união automática com a área padrão. Confirmar prevalência editorial antes de aplicar qualquer patch histórico; `_patch_kw.py` não será executado.
- **Retenção e publicação:** aprovar guarda dos 17 como histórico não publicado, política de retenção dos backups, lote exato de publicação e responsáveis pela revisão. Aprovar importação não equivale a aprovar publicação.

## Entrega e pendências de validação

Esta rodada produziu apenas documentação a partir de leituras locais e evidências já registradas. Nenhum original foi corrigido, nenhum importador foi executado, nenhum dado/prompt foi alterado e nenhuma mensagem foi enviada a usuário real. Não houve deploy.

As validações técnicas anteriores não atestam correção jurídica, metadados definitivos ou cobertura integral dos 19. A aceitação com vetores reais em banco isolado, registrada no relatório de revisão, não comprova resposta final pelo WhatsApp. Após eventual aprovação/importação/publicação, continuam necessárias validação hospedada com corpus real e validação ponta a ponta do WhatsApp em ambiente/contato de teste autorizado, incluindo histórico, deduplicação e cobrança. Nesta proposta essas execuções não ocorreram.
