# Validação isolada de auditoria e suporte — 24/09/2026

Relatório histórico da etapa `support-v3`. A validação posterior com recuperação real, geração estruturada e controles `support-v7` está em [knowledge-utility-validation-2026-09-24.md](knowledge-utility-validation-2026-09-24.md).

## Resultado e fronteira da evidência

Validação da implementação local, sem deploy. MariaDB 10.11 e Anthropic reais, em containers descartáveis na VPS, separados da aplicação e do banco de produção. O processo recebeu somente acesso ao provedor, URL do banco descartável e cópia de leitura do prompt editorial vigente. Não recebeu credenciais da Evolution nem URL do banco de produção. O transporte WhatsApp foi substituído por função que lança `WHATSAPP_FORBIDDEN`.

Modelo: `claude-haiku-4-5-20251001`. Política técnica final: `support-v3`. Prompt editorial preservado: versão `v22072026`, hash da seção A `1074a64ce472b3a5664cda40300efcde9d9398df5b6b6e9f43e5dc9d2322bb9d`. Nenhum caderno, área, prompt editorial, saldo real ou pagamento foi modificado.

As fontes deste ensaio são cinco blocos **sintéticos**, definidos em `test/support-real-isolated.cjs`. A recuperação foi substituída por contexto fixo; classificação, ranking e embeddings não foram exercitados. Portanto esta execução não reproduz nem comprova os blocos das interações históricas do contato 4822. Nenhum contato real foi carregado no banco de teste.

## MariaDB e auditoria

O banco foi inicialmente criado com `prisma db push`; em seguida, a tabela de auditoria vazia foi retirada e o SQL real de `202609240002_knowledge_interaction/migration.sql` executado. Isso testa a migração aditiva, não a cadeia completa do mecanismo `prisma migrate deploy`.

Asserções aprovadas:

1. Ausência da tabela retorna `TRACE_UNAVAILABLE`.
2. Hash do conjunto de usuários, cadernos, prompts, cortesias e compras pendentes sintéticos permanece idêntico antes/depois da migração.
3. JSON e acentos persistem corretamente; ID repetido falha sem sobrescrever o primeiro conteúdo.
4. Atualização de ID inexistente falha; inserção seguida de exceção dentro de transação sofre rollback.
5. Duas criações concorrentes do mesmo ID produzem exatamente um vencedor.
6. Usuário SQL com permissão apenas de leitura não consegue gravar e a falha é sanitizada.

Também foram exercitados área, consulta, IDs/versões/snapshots dos blocos, versão/hash do prompt, ID/modelo da geração e metadados da verificação no fluxo com Prisma real.

## Correções motivadas pelas execuções

- A política inicial rejeitou indevidamente uma paráfrase expressamente limitada ao mesmo precedente de vazamento descrito na fonte. A instrução técnica passou a distinguir essa paráfrase de transferência para recusa de exclusão.
- A gramática finita de unidades conversacionais passou a aceitar combinações como “Oi! Ótima pergunta.” e o encerramento breve, preservando a exigência de fonte para texto jurídico. Não existe isenção arbitrária decidida pelo modelo.
- Na rodada `support-v2`, o avaliador chegou a aprovar parágrafos mistos com consequências e bases legais não descritas nas fontes. O resultado final ainda foi bloqueado pelas barreiras determinísticas, mas o voto semântico estava errado. `support-v3` exige análise de cada afirmação antes do voto e inclui os contraexemplos observados. Foram acrescentados dois casos sem números para evitar que o teste passe apenas pela barreira numérica.
- Mesmo em `support-v3`, um voto aprovou a equivalência com “direito ao esquecimento” reconhecendo que o termo não constava na fonte. Foi acrescentada barreira determinística que exige o termo nas citações e regressão local. Após esse último ajuste, os 16 veredictos reais e três fluxos foram **reexecutados localmente a partir dos recibos**, sem novas chamadas ao provedor: resultados preservados e voto incorreto individual bloqueado. A última execução de rede precede somente essa barreira adicional; não foi apresentada como nova execução real dessa última linha de código.
- A auditoria guarda latência, ID, modelo e uso adicional do verificador, inclusive quando este falha após obter resposta. Falhas de serialização são convertidas em erro de auditoria; falha de geração tem estágio próprio.
- O log automático de erros do Prisma foi desativado porque pode imprimir argumentos privados da operação. O tratamento explícito e sanitizado permanece; avisos continuam habilitados.

## Provedor real

A rodada final aprovou **16/16 expectativas**: nove respostas válidas aceitas e sete respostas sem suporte rejeitadas.

| Grupo | Casos |
| --- | --- |
| Aceitos | Eliminação condicionada; prazo de acesso no contexto certo; continuação sobre recusa; nuance de dados financeiros; precedente restrito ao vazamento; limite da recusa; saudação simples; saudação/encerramento combinados; negativa explícita de transferir prazo/indenização |
| Bloqueados | Prazo de exclusão inventado; indenização presumida pela recusa; “maioria perde”; dados financeiros sempre sensíveis/indenização automática; transferência para atraso de produto; parágrafo com consequências adicionais; parágrafo com bases legais adicionais |

Também foi executada geração real, com o prompt editorial intacto, seguida de verificação real e persistência/consumo reais no banco isolado:

- “Pela LGPD, um cliente pode pedir a eliminação de dados?”
- Continuação: “E se a empresa se recusar a apagar?”
- “Responda em uma frase: dados financeiros são automaticamente dados sensíveis?”

Os três rascunhos foram retidos e nenhum crédito foi consumido. Isso não é prova de resposta útil entregue: o gerador continuou extrapolando as fontes sintéticas. As perguntas anteriores sem resposta permaneceram no histórico e influenciaram a geração subsequente. As nove respostas fundamentadas foram controles de texto fixo avaliados pelo verificador real, não nove respostas espontâneas produzidas pelo fluxo completo.

## Falhas e consumo

Com `handleInbound`, Prisma e MariaDB reais, foram injetados: tabela de auditoria ausente; indisponibilidade do verificador; rejeição do verificador; falha da gravação final após verificação favorável. Todos retornaram aviso fixo, sem orientação jurídica substantiva, sem redução de saldo e sem novo `UsageEvent`. Cada pergunta foi encontrada uma única vez no banco. Indisponibilidade/rejeição foram injetadas, não uma interrupção real do serviço Anthropic; a falha de persistência foi produzida por indisponibilidade real da tabela no banco descartável.

`npm test` passou: 37 testes e 43 cenários de fluxo, incluindo deduplicação, preservação do histórico e créditos, falhas anteriores/posteriores à geração. Build TypeScript aprovado. `git diff --check` aprovado.

## Evidências e reprodução

- [Resultado final completo](evidence/2026-09-24/support-real-final.json): respostas de teste, veredictos, IDs do provedor, auditorias e tokens. Contém somente dados sintéticos; não contém o texto do prompt editorial nem credenciais.
- [Resumo de métricas](evidence/2026-09-24/support-summary.json).
- [Replay da barreira final](evidence/2026-09-24/support-replay.json), executável por `node test/support-replay.cjs` depois de `npm run build`.
- Rodadas anteriores preservadas: [primeira](evidence/2026-09-24/support-real-first.json), [diagnóstico](evidence/2026-09-24/support-real-diagnostic.json), [v2](evidence/2026-09-24/support-real-v2.json). Não substituir seus resultados pelos da versão final.
- Harness: `test/support-real-isolated.cjs`; executar apenas em banco descartável, hostname `support-isolated-db`, schema `support_isolated`, com montagem `/private/prompt.json` somente leitura e `/evidence` gravável. O harness exige esse isolamento e impede credenciais Evolution.
- Procedimento desta sessão: `.work-deploy-local/run-support-isolated.sh`, pacote local somente `dist`, `prisma`, `test`, imagem derivada da revisão já em execução. Não incorpora arquivo de ambiente à imagem. A limpeza remove containers, rede e cópias temporárias de credencial/prompt; os recibos ficam no diretório isolado de evidências.

## Latência e uso adicional

Rodada final real: 20:30:24–20:32:32 UTC (17:30:24–17:32:32 de Brasília). SHA-256 do recibo: `e09cd15c489940425c19a6c055124ac62e12c74f595b08519b2c4fe731c656c3`.

| Medida | Resultado |
| --- | --- |
| Chamadas reais do verificador | 19: 16 controles + 3 fluxos |
| Latência adicional do verificador | mínimo 2.946 ms; mediana 4.189 ms; máximo 11.361 ms |
| Tokens adicionais do verificador | 38.824 entrada + 10.765 saída; sem cache nesta rodada |
| Geração real | 6 chamadas: 3 fluxos + 3 cenários de falha após geração |
| Tokens da geração | 496 entrada sem cache; 86.988 leitura de cache; 2.416 saída |
| Latência total dos 3 fluxos | 17.276 ms; 16.764 ms; 13.434 ms |
| Consumo de créditos nos 3 fluxos | 0, 0, 0 |

Uma verificação extra por rascunho jurídico; nenhuma reescrita nem retry automático do verificador. Esses totais são da rodada final, não a soma das tentativas de desenvolvimento anteriores. Não representam preço em reais nem latência garantida: fontes maiores e rascunhos extensos aumentam o trabalho; 4.096 tokens é o limite de saída do verificador, e truncamento bloqueia a resposta.

Limpeza conferida após execução: nenhum container/rede `support-isolated` restante; arquivos temporários `provider.env` e `prompt.json` removidos; canário privado ausente do stderr. Aplicação de produção continuou `running` na revisão `9959f206770b1104d9d1cf4f8e7b1a2f372a58e9`. A imagem e evidências isoladas permanecem; não houve troca da aplicação.

## Limitações e pendências exatas

1. A amostra demonstra discriminação nesses casos, não sensibilidade/especificidade geral. O voto semântico pode aprovar afirmações erradas ou rejeitar paráfrases válidas; as falhas observadas foram preservadas nos recibos.
2. O gerador e o juiz usam a mesma família de modelo. As barreiras determinísticas não cobrem toda formulação possível. Suporte em uma fonte não garante que a própria fonte esteja juridicamente correta.
3. A resposta inteira é retida quando uma unidade falha; não há reescrita automática. A gramática conversacional é restrita e pode bloquear outras aberturas inofensivas. Não foi comprovada taxa de respostas úteis com os cadernos publicados.
4. Pendente, antes de publicação: avaliar corpus representativo de respostas espontâneas com recuperação real, preparar backup/rollback e exercício do histórico completo das migrações, definir acesso/retenção da auditoria. A proposta editorial LGPD permanece separada e não aplicada.
5. Sem teste de entrega hospedada/WhatsApp. Não foi feito deploy nem enviada qualquer mensagem. O consumo de tokens do provedor nos ensaios existe mesmo quando o crédito do usuário é preservado.
