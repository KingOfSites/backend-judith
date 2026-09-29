# Regras de Composição e de Análise

Implementado em 29/09/2026. Conteúdo é do fundador e é editado no Admin, em `/regras`.
O Backend só lê.

## O que é

- **Regras de Composição** andam com a Seção B (a JUDITH escreve um documento).
- **Regras de Análise** andam com a Seção C (ela olha um documento que o cliente mandou).

Diferente da base de conhecimento, aqui **não tem área e não tem busca**. O classificador
de tipo devolve uma etiqueta, a tabela `TipoDocumento` diz quais regras entram, e elas
sobem inteiras. É endereço, não busca.

## Pacote de cada função

| Função | Pacote |
|---|---|
| Redação | Seção A + Seção B + regras que entram sempre + até 2 receitas do tipo + extras do tipo |
| Análise | Seção A + Seção C + regras que entram sempre + até 2 fichas do tipo + extras do tipo |
| Dúvida | Seção A + até 5 blocos da base + perfil + histórico. Nem B, nem C, nem regras |

A ordem é estático → dinâmico. São no máximo 4 pontos de cache por chamada: Seção A,
Seção B ou C, regras que entram sempre e regras do tipo.

## Tabelas

- `RegraDocumento`: texto em markdown, `conjunto` (COMPOSICAO ou ANALISE), `codigo`
  (o endereço), `grupo`, `entraSempre`, `ativo`.
- `TipoDocumento`: a tabela tipo → ficha. `composicao` e `analise` têm teto de 2 códigos.
  `composicaoExtras` e `analiseExtras` são os blocos que entram "se o tipo pedir" e ficam
  fora do teto. `desviaRedacao` e `mensagemDesvio` formam a lista de desvio.
- `RegraConfig`: prompts `classificadorTipo` e `classificadorTurno`, e `mensagemDesvioPadrao`.
- `Session` ganhou `fluxo`, `fluxoTipo`, `fluxoOcioso` e `fluxoCobrado`.

Não existe arquivo `.json` para regerar. O recorte é montado a partir das linhas do banco a
cada chamada, com cache de 60 segundos. O que o fundador salva vale em até 1 minuto, sem
reiniciar o bot. O Admin mostra o recorte em `/regras/simular`.

## Comportamento

1. **Liga e desliga por dado.** Sem nenhum `TipoDocumento` ativo, o fluxo é o anterior:
   nenhum classificador roda e nenhuma regra sobe.
2. **Classificador de tipo** (Haiku, temperatura 0) roda só em redação e análise. A lista
   de etiquetas ativas é anexada ao prompt. Etiqueta fora da tabela vira `outro`, que sobe
   só o que entra sempre.
3. **Desvio antes do modelo**, só na redação: responde a mensagem de encaminhamento, não
   chama o modelo caro e não consome cota. Na análise o mesmo tipo segue normal.
4. **Teto de 2** é validado no Admin e cortado de novo no Backend. O que foi cortado e o que
   a tabela pede e não existe vão para o log, em `judith.reply`, campo `regras`.
5. **Fluxo aberto na sessão.** Com redação ou análise em andamento, a mensagem sem pedido
   explícito passa pelo classificador de turno: `continua`, `redacao`, `analise`,
   `nova_duvida` ou `abandona`. O fluxo expira após 5 turnos seguidos fora dele.
6. **Troca análise → redação.** No "então escreve pra mim", o sistema troca a Seção C pela B,
   carrega a Composição, mantém o tipo do documento e o histórico. A cláusula pronta só vem
   da Composição.
7. **Cota por documento.** O primeiro turno do fluxo consome. Os turnos seguintes do mesmo
   documento não consomem de novo. A troca análise → redação consome uma redação.

## Decisões em aberto, do fundador

- A spec pede a cota da redação na entrega do documento ou no "sim" da confirmação. Hoje ela
  é consumida no primeiro turno do fluxo, que é o ponto determinístico disponível.
- O documento parcial em 24 horas e a leitura de PDF anexado não fazem parte desta entrega.
- O prompt do classificador de tipo em uso precisa ser colado no Admin. Sem ele vale um
  prompt reserva genérico.

## Validação

`npm test` inclui `test/regras.test.cjs`, com banco e modelo simulados.
