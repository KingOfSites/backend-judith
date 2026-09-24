# Entrega WhatsApp — 24/09/2026

## Evidências e limites

- Contato de teste: final 4822; instância `judith`. Nenhuma outra conversa foi usada como conteúdo de diagnóstico.
- Teste simples autorizado, ID `3EB0FB84E52ADDEEC03931`: HTTP 201, inicialmente PENDING; presença nos dois aparelhos confirmada pelo usuário.
- Nova tentativa automática: entrada `3A6CA957796718FF4341`, 18:46:59 UTC; saída `3EB0E8CC91A3292E190DB7`, 18:47:02 UTC. Backend registrou uma resposta; Evolution registrou a saída e ACKs correlacionados à mesma mensagem/instância/destinatário. Usuário informou ausência de resposta visível. ACK não equivale à validação visual.
- Destinatário do teste e dos automáticos coincide; o telefone recebido no webhook já havia sido resolvido pela Evolution a partir do LID. Nenhuma alteração de nono dígito pelo backend foi constatada.
- Teste simples: `number`, `text`, `linkPreview:false`; automático anterior: `number`, `text`, opção de prévia omitida. Ambos sem citação. Resposta automática contém link dos termos e quebras de linha/emoji; teste simples não.
- Código instalado da Evolution produz `externalAdReply` ao resolver metadados de link. Teste isolado extraiu os métodos da versão em execução, simulou os metadados e interrompeu antes do transporte: quatro combinações de presença de link e desativação de prévia. Somente link com opção omitida produziu cartão, com mediaType=2 e sem thumbnail no cenário simulado. `linkPreview:false` suprimiu esse caminho. Isso demonstra diferença de formato, não comprova causalidade da falta de entrega.
- O banco não preservou os metadados completos do cartão nas respostas investigadas. O backend anterior descartava o corpo HTTP. Não é possível reconstruir esse recibo integral retrospectivamente.

## Ajuste publicado

- Commit `9959f206770b1104d9d1cf4f8e7b1a2f372a58e9`, no repositório `KingOfSites/backend-judith`.
- Texto enviado com `linkPreview:false`, preservando conteúdo, URL dos termos e destinatário. Trata-se de mitigação do caminho de prévia, ainda dependente de validação visual.
- O próprio cliente HTTP automático agora registra `evolution.send.receipt`: HTTP status, ID de saída, ID de entrada, instância, status inicial, comparação do destinatário e hashes. Não registra texto, chave, cabeçalhos ou corpo bruto da resposta. Falhas HTTP são sanitizadas; o cliente não adiciona repetição.
- Captura no caminho automático permanece ativa, sem depender do observador temporário de 30 minutos. O recibo fica nos logs do backend; correlacionar o próximo ID com os registros da Evolution e a confirmação visual.
- Nenhuma alteração na Evolution, conexão, número, prompts, base jurídica ou lógica de cobrança. Nenhum envio adicional foi executado nesta rodada.

## Verificação e recuperação

- Build TypeScript aprovado; dois testes novos com HTTP simulado aprovados, inclusive ausência de retry e vazamento de segredos.
- `npm test`: 33 testes e 39 cenários de fluxo aprovados. Teste novo executado separadamente: `node --test test/evolution-delivery.test.cjs`.
- Imagem construída na VPS; testes novos também aprovados com `--network none`.
- Imagem ativa: `sha256:85be79b2e86044610396909a5f0319872f616693042703e7d59612f6d047d01e`. Estado running, zero reinícios; health local OK, prompt `v22072026`.
- Hashes de todos os cadernos e prompts idênticos antes/depois. Total 35, publicados 18.
- Backup de imagem/configuração e recibos: `/opt/judith-backend/backups/delivery-fix-9959f20/`.
- Rollback: `bash /opt/judith-backend/backups/delivery-fix-9959f20/rollback.sh` (retorna à imagem e revisão anteriores, sem restauração ou escrita em banco).

## Pendência única de entrega

Um novo “Oi” pelo contato autorizado, quando o usuário decidir, para conferir resposta visível nos dois aparelhos e correlacionar o recibo HTTP agora preservado. Não foi solicitado nem enviado outro teste durante a implementação. Não declarar a entrega corrigida até essa confirmação.
