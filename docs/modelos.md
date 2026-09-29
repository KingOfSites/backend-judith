# Modelos por função

Em vigor desde 29/09/2026. Segue a tabela do fundador (spec §1).

| Função | Modelo | Variável |
|---|---|---|
| Dúvida | Gemini Flash | `JUDITH_MODEL_HAIKU` |
| Análise | GPT-4.1 | `JUDITH_MODEL_SONNET` |
| Redação | GPT-4.1 | `JUDITH_MODEL_SONNET` |
| Lembretes / coleta | Gemini Flash | `JUDITH_MODEL_HAIKU` |
| Classificadores de área, tipo e turno; auditoria de suporte | Gemini Flash | `JUDITH_MODEL_HAIKU` |
| Fallback | GPT-4.1-mini | `JUDITH_MODEL_FALLBACK` |
| Bots dos clientes do site | sem alteração | `BOT_MODEL_HAIKU`, `BOT_MODEL_SONNET` |

Os nomes `HAIKU` e `SONNET` continuam no banco (`ModelTier`) e nas variáveis como rótulos de
tier: leve e forte. Trocar o enum exigiria migrar dados sem ganho.

## Como o fornecedor é escolhido

`src/llm/client.ts` olha só o id do modelo: `gemini-*` vai para a Google, `gpt-*` para a
OpenAI, o resto para a Anthropic. Os pontos de chamada não sabem qual fornecedor atende.
Na subida, `src/config/env.ts` exige a chave do fornecedor de cada modelo configurado.

## Gemini 3.8 Flash, não 2.5

A especificação cita o Gemini 2.5 Flash. Em 29/09/2026 a API respondeu que ele não está
mais disponível para contas novas e indicou o 3.8 Flash. É o que está configurado.

## Thinking

A spec pede `thinking_budget=0` no Flash. No 3.8 o zero reduz mas não elimina o raciocínio.
Medido em 29/09/2026: de 35 a 45 tokens residuais em pergunta difícil ou com ferramenta
forçada, e eles contam no limite de saída. Com limite de 40 tokens, o classificador de área
voltava vazio. Por isso o limite enviado à Google é o pedido mais `MARGEM_RACIOCINIO_GEMINI`
(1024). O zero continua sendo enviado.

## Resiliência

Em 429, 5xx, timeout ou resposta vazia: nova tentativa com espera de 5 e depois 15 segundos.
Esgotando, troca de fornecedor para o fallback, uma única vez, e registra `llm.fallback` no
log. Erro de pedido (4xx) não repete nem troca. O fallback só vale entre fornecedores
diferentes: queda do GPT-4.1 não cai no GPT-4.1-mini.

A auditoria de suporte é criada com `maxRetries: 0`: ela vai direto ao fallback, sem esperar.

## Validação

- `npm test`: inclui `test/llm.test.cjs`, com fornecedores simulados.
- `node test/llm-real-isolated.cjs`: funções reais do sistema contra os fornecedores reais.
  Três rodadas em 29/09/2026, 17 de 17 em cada, sem queda para o fallback.
- `node test/llm-scope-real.cjs`: controles de escopo da auditoria com o Gemini como auditor.
  10 de 10, nenhuma resposta ruim aprovada, barreira do "direito ao esquecimento" mantida.

A bateria de utilidade com o snapshot dos cadernos (`test/utility-real-isolated.cjs`) não foi
repetida com os modelos novos. Ela usa infraestrutura isolada na VPS e ainda instrumenta o SDK
da Anthropic diretamente.

## Custo, em USD por 1M de tokens

| Modelo | Entrada | Saída | Entrada em cache |
|---|---|---|---|
| Gemini 3.8 Flash, até 31/12/2026 | 0,75 | 3,75 | 0,075 |
| Gemini 3.8 Flash, a partir de 01/01/2027 | 1,50 | 7,50 | 0,15 |
| GPT-4.1 | 2,00 | 8,00 | 0,50 |
