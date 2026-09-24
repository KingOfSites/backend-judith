# JUDITH — Base de Conhecimento: Direito Tributário
**Fonte:** Cadernos Sistematizados — Direito Tributário 2026.1 (375p)
**Processado em:** 02/06/2026
**Validado em:** 09/06/2026 (Claude + Gemini + LH — 2ª rodada; 14 correções aplicadas)
**Fontes complementares:** CF/1988 (arts. 150, 153 §6°, 195), CTN (arts. 134, 135, 138), EC 132/2023, LC 214/2025, STJ Tema 962, STJ Tema 1.210, STF Tema 1.383, Súmula Vinculante 50 STF, Súmula 435 STJ
**Formato:** Misto — Q&A para conceitos objetivos + Chunks para temas complexos
**Uso:** Indexação RAG — não indexar a apostila original
**Área:** tributario

---


**NOTAS DE USO PARA O RAG (não indexar — fora do RAG por decisão de 17/07/2026)**

**Limites da base:** este resumo cobre os principais conceitos para resposta a dúvidas de consumidores e pequenas empresas. Para questões específicas de planejamento tributário, alíquotas atualizadas do Simples Nacional por CNAE, execuções fiscais em andamento ou parcelamentos disponíveis, JUDITH deve encaminhar ao contador ou à Receita Federal/Secretaria de Fazenda competente.

**Linguagem:** JUDITH usa "informações jurídicas" — não "orientações" nem "consultoria".

**Tributos mais relevantes para o perfil JUDITH:**
- IPTU e ITBI: dúvidas de locatários, compradores de imóveis
- ISS: prestadores de serviço autônomos e pequenas empresas
- ICMS: comerciantes e varejistas
- IR: empregados, autônomos (isenções, verbas indenizatórias)
- Dívida ativa / prescrição / decadência: usuários com dívidas fiscais antigas
- Certidões negativas: necessárias para contratos, financiamentos, licitações

---

## RODADA 1 — TEORIA GERAL, CTN, PRINCÍPIOS, OBRIGAÇÃO, RESPONSABILIDADE, CRÉDITO TRIBUTÁRIO

---

### CHUNK 1.1 — Conceito de Tributo e Espécies

**O que é tributo** (art. 3º CTN): prestação pecuniária compulsória, em moeda ou valor expresso em moeda, que não constitua sanção de ato ilícito, instituída em lei e cobrada mediante atividade administrativa plenamente vinculada.

**Tributo ≠ Multa:** tributo decorre de ato lícito; multa decorre de ato ilícito. Multa é fruto do poder sancionador do Estado; tributo, do poder de tributar.

**Espécies tributárias (pentapartite — STF):**
1. **Impostos** — não vinculados a atividade estatal específica; fato gerador é situação do contribuinte
2. **Taxas** — vinculadas ao exercício de poder de polícia ou serviço público específico e divisível
3. **Contribuições de melhoria** — decorrentes de obra pública que valorize imóvel do contribuinte
4. **Empréstimos compulsórios** — calamidade, guerra externa ou investimento público urgente; só por LC federal; devolvidos
5. **Contribuições especiais** — sociais, de intervenção no domínio econômico (CIDE), de interesse de categorias profissionais

**Finalidades dos tributos:**
- Fiscal: arrecadação (IR, ISS, ICMS)
- Extrafiscal: intervenção econômica (II, IE, IPI, IOF, Imposto Seletivo)
- Parafiscal: arrecadação destinada a terceiro fora da Administração Direta (contribuições para INSS, SESI, SENAI)

**Contribuição sindical:** deixou de ser tributo após Reforma Trabalhista (Lei 13.467/2017) — passou a ser facultativa. STF confirmou constitucionalidade (ADI 5794).

---

### Q&A 1.1 — Conceito e Espécies

**P:** Tributo pode ser pago com bens ou trabalho?
**R:** Não. O CTN exige pagamento em moeda. A única exceção é a dação em pagamento em bens imóveis, incluída pelo art. 156, XI do CTN via LC 104/2001. Bens móveis e serviços (in labore) não extinguem o crédito tributário.

**P:** Qual a diferença entre taxa e imposto?
**R:** Imposto não depende de nenhuma atividade estatal específica — incide sobre fato do contribuinte (ex: auferir renda, circular mercadoria). Taxa exige contraprestação estatal: serviço público específico e divisível prestado/disponibilizado, ou exercício do poder de polícia.

**P:** Empréstimo compulsório precisa ser devolvido?
**R:** Sim. É tributo restituível — obrigatoriamente vinculado à despesa que o justificou. Só pode ser instituído por lei complementar federal (competência exclusiva da União).

---

### CHUNK 1.2 — Princípios Constitucionais Tributários

**Legalidade tributária** (art. 150, I CF): tributo só pode ser criado ou majorado por lei. Exceções — podem ter alíquotas alteradas por ato do Executivo (sem lei): II, IE, IPI, IOF, ICMS-combustíveis monofásico e CIDE-combustíveis. *(O Imposto Seletivo NÃO integra essa lista — sua instituição e majoração exigem lei ordinária, não decreto.)*

**Anterioridade anual** (art. 150, III, b CF): lei que cria/majora tributo só produz efeito no exercício financeiro seguinte. **Exceções (cobrança imediata):** II, IE, IPI, IOF, empréstimos compulsórios de emergência e contribuições sociais de seguridade social (art. 195 CF). *(Imposto Seletivo NÃO é exceção à anterioridade anual — respeita o exercício seguinte.)*

**Anterioridade nonagesimal / noventena** (art. 150, III, c CF): mesmo que publicada a lei, o tributo só vale 90 dias depois. **Exceções (não precisa esperar 90 dias):** II, IE, IOF, empréstimos compulsórios de emergência, IR, base de cálculo do IPTU e IPVA e Imposto Seletivo (EC 132/2023 — IS é exceção à noventena, mas NÃO à anterioridade anual).

**Regra prática:** se o tributo está sujeito a AMBAS as anterioridades (anual + noventena), aplica-se a que resultar em prazo maior. IR respeita apenas a anual (pode cobrar no 1º dia do ano seguinte sem esperar 90 dias).

**Súmula Vinculante 50 STF:** norma que altera o prazo de recolhimento de tributo (data de vencimento) não se sujeita à anterioridade — pode entrar em vigor imediatamente. Atenção: a SV 50 alcança apenas o prazo de pagamento, não a criação ou majoração do tributo em si.

**Tema 1.383 STF (março/2025):** a revogação de benefício fiscal equivale a majoração de tributo para fins de anterioridade. Lei que revoga isenção, redução de alíquota, de base de cálculo ou qualquer benefício fiscal deve respeitar a anterioridade anual e a noventena antes de produzir efeitos.

**Irretroatividade** (art. 150, III, a CF): lei tributária não pode alcançar fatos geradores ocorridos antes de sua vigência. Exceção: lei mais benéfica em matéria de infrações pode retroagir (art. 106, II CTN).

**Vedação ao confisco** (art. 150, IV CF): tributo com efeito confiscatório é inconstitucional. Aplica-se também às multas. Não há percentual fixo — avaliação caso a caso pelo STF.

**Imunidade recíproca** (art. 150, VI, a CF): União, Estados, DF e Municípios não podem cobrar impostos uns dos outros. Estende-se a autarquias e fundações públicas. Empresas públicas e sociedades de economia mista que exploram atividade econômica concorrencial NÃO têm imunidade (exceção: ECT — Correios — tem imunidade por prestar serviço público essencial).

**Imunidades tributárias relevantes:**
- Templos de qualquer culto (impostos sobre patrimônio, renda e serviços vinculados às finalidades essenciais)
- Partidos políticos, sindicatos de trabalhadores, entidades educacionais e assistenciais sem fins lucrativos
- Livros, jornais, periódicos e o papel destinado a sua impressão (imunidade cultural — não abrange tinta, equipamento)
- Música nacional (fonogramas e videofonogramas)
- Imunidade musical: produção e reprodução de fonogramas e videofonogramas musicais nacionais

---

### Q&A 1.2 — Princípios

**P:** Uma lei publicada em outubro pode cobrar novo imposto a partir de janeiro?
**R:** Depende do tributo. Para a maioria: não. Precisa respeitar a anterioridade anual (vigência no exercício seguinte) E a noventena (90 dias após publicação). Uma lei de outubro entra em vigor no mínimo em janeiro do ano seguinte, desde que já tenham passado os 90 dias — o que geralmente acontece em outubro/novembro. Se publicada em novembro, os 90 dias só se completam em fevereiro, então mesmo que seja "ano seguinte", não pode cobrar em janeiro.

**P:** Igreja pode ser autuada por IPTU ou ICMS sobre imóvel?
**R:** Imóvel vinculado às finalidades essenciais da igreja tem imunidade de impostos (art. 150, VI, b CF). Se o imóvel for alugado e a renda revertida para atividade religiosa, o STF entende que a imunidade se mantém. Se explorado com finalidade lucrativa sem relação com a atividade religiosa, perde a imunidade.

**P:** Prefeitura pode cobrar IPTU de imóvel da União?
**R:** Não. Imunidade recíproca (art. 150, VI, a CF). A vedação é recíproca entre todos os entes federativos — União, Estados, DF e Municípios.

---

### CHUNK 1.3 — Obrigação Tributária e Responsabilidade

**Fato gerador:** ocorrência no mundo real da hipótese de incidência prevista em lei. Com o fato gerador nasce automaticamente a obrigação tributária. O crédito tributário, porém, só existe após o lançamento.

**Obrigação principal:** pagar tributo ou multa. **Obrigação acessória:** fazer, não fazer ou tolerar (ex: emitir nota fiscal, escriturar livros, suportar fiscalização). Obrigação acessória não depende da principal — persiste mesmo se o tributo for isento.

**Sujeito ativo:** credor (ente com capacidade tributária ativa — geralmente o ente que criou o tributo, mas pode ser delegado). **Sujeito passivo:** devedor — contribuinte (realiza o fato gerador) ou responsável (terceiro que a lei obriga a pagar).

**Responsabilidade tributária por sucessão:**
- Imóvel: adquirente responde pelos tributos devidos até a data da transmissão (art. 130 CTN), salvo se constar certidão negativa ou positiva com efeitos negativos
- Empresa adquirida: quem adquire fundo de comércio ou estabelecimento responde pelos tributos do antecessor. Se o vendedor continuar atividade, ambos respondem por 1 ano (solidária). Se parar, só o adquirente responde
- Fusão/incorporação/cisão: a empresa resultante responde pelos tributos das empresas extintas

**Responsabilidade de sócios/diretores (art. 135 CTN):** sócios e diretores respondem solidariamente pelos créditos tributários resultantes de atos praticados com excesso de poderes ou infração de lei, contrato ou estatuto — o STJ interpreta o art. 135 como responsabilidade solidária, de forma que a Fazenda pode redirecionar a execução ao sócio sem precisar exaurir primeiro o patrimônio da empresa. **Simples inadimplência NÃO gera responsabilidade do sócio.** O redirecionamento exige prova do ato ilícito ou dissolução irregular da empresa.

Súmula 435 STJ: Presume-se dissolvida irregularmente a empresa que deixar de funcionar no seu domicílio fiscal sem comunicação aos órgãos competentes, legitimando o redirecionamento da execução fiscal para o sócio-gerente.

**Tema 962 STJ:** o sócio retirante não responde pela dissolução irregular da sociedade ocorrida após a sua saída — a Súmula 435 STJ só alcança o sócio que estava na administração no momento em que a dissolução irregular ocorreu. Saída regular antes do fechamento irregular afasta o redirecionamento fiscal.

**Responsabilidade subsidiária (art. 134 CTN):** terceiros (tutores, síndico, inventariante, sócios liquidantes etc.) respondem pelos tributos da entidade que administram quando não for possível exigir do devedor principal. Embora o CTN use o termo "solidária", o STJ interpreta o art. 134 como responsabilidade subsidiária — o redirecionamento ao responsável do art. 134 só é cabível após esgotada a cobrança do contribuinte principal. **Distinção essencial:** art. 134 = subsidiária (impossibilidade de cobrar do devedor principal); art. 135 = solidária (ato ilícito ou excesso de poderes do gestor).

**Responsabilidade por infrações (art. 136 CTN):** objetiva — independe de intenção do agente. Exceção: infrações conceituadas como crimes, em que há responsabilidade pessoal do agente (art. 137 CTN).

---

### Q&A 1.3 — Responsabilidade

**P:** Se comprei um imóvel e depois descobri que havia dívida de IPTU, sou responsável?
**R:** Sim, como regra. O adquirente responde pelos tributos incidentes sobre o imóvel até a data da transmissão (art. 130 CTN). A proteção existe se você obteve certidão negativa ou positiva com efeitos negativos na data da compra — nesse caso, a responsabilidade não é sua.

**P:** O sócio de uma empresa pode ser cobrado pessoalmente por dívida fiscal da empresa?
**R:** Só em casos específicos: (1) atos praticados com excesso de poderes ou infração de lei/contrato (art. 135 CTN); (2) dissolução irregular da empresa (Súmula 435 STJ). Simples não pagamento de tributo pela empresa não autoriza cobrar o sócio. A presunção de dissolução irregular se aplica quando a empresa some do endereço fiscal sem aviso.

**P:** Empresa foi comprada — o comprador responde pelas dívidas fiscais antigas?
**R:** Sim, como regra (art. 133 CTN). Se o vendedor continuar outra atividade, ambos respondem solidariamente por 1 ano. Se o vendedor parar completamente, a responsabilidade é integralmente do adquirente. É recomendável exigir certidões negativas antes de fechar negócio.

---

### CHUNK 1.4 — Crédito Tributário, Lançamento, Suspensão e Extinção

**Lançamento:** ato administrativo que torna o crédito tributário líquido e certo. Até o lançamento existe obrigação tributária, mas não crédito exigível. Competência exclusiva da autoridade administrativa.

**Modalidades de lançamento:**
- **De ofício (direto):** Fisco faz tudo sozinho (ex: IPTU, IPVA)
- **Por declaração:** contribuinte declara o fato, Fisco calcula e notifica (menos comum hoje)
- **Por homologação (autolançamento):** contribuinte calcula e paga antecipadamente; Fisco confere e homologa (ex: IR, IPI, ICMS, ISS). É a modalidade mais comum.

**Suspensão do crédito tributário** — MODERECOCOPA (mnemônico):
MOratória, DEpósito integral, REclamações/Recursos administrativos, COncessão de liminar em MS, COncessão de liminar/tutela antecipada em outras ações, PAarcelamento. Suspensão mantém obrigações acessórias.

**Extinção do crédito tributário** — causas principais (art. 156 CTN):
- Pagamento (regra)
- Compensação (tributo a restituir abatido de tributo a pagar — só por lei)
- Transação (concessões mútuas entre Fisco e contribuinte, por lei)
- Remissão (perdão do crédito, por lei)
- Decadência (perda do direito de lançar — 5 anos)
- Prescrição (perda do direito de executar — 5 anos após constituição definitiva)
- Dação em pagamento em bens imóveis (art. 156, XI CTN — só bens imóveis)

**Exclusão do crédito tributário:**
- **Isenção:** lei que dispensa o pagamento de tributo já existente (não se confunde com imunidade — imunidade é constitucional; isenção é legal)
- **Anistia:** perdão de penalidades antes do lançamento

---

### CHUNK 1.5 — Decadência e Prescrição Tributária (CRÍTICO para JUDITH)

**Decadência** = prazo para o Fisco lançar (constituir o crédito). Após, perde o direito de cobrar.

**Regra geral (lançamento de ofício/declaração — art. 173, I CTN):** 5 anos contados do **1º dia do exercício seguinte** àquele em que o lançamento poderia ter sido feito.
- Exemplo: IPTU com fato gerador em 2024 → prazo começa em 01/01/2025 → decai em 01/01/2030.

**Lançamento por homologação (art. 150, §4º CTN):** 5 anos contados do **fato gerador**.
- Se houver declaração + pagamento: prazo = 5 anos do FG
- Se NÃO houver declaração nem pagamento: aplica-se o art. 173, I (5 anos do exercício seguinte) — Súmula 555 STJ
- Se houve declaração mas sem pagamento: o crédito já está constituído pela declaração; não há decadência — corre prescrição

Súmula 436 STJ: A entrega de declaração pelo contribuinte reconhecendo débito fiscal constitui o crédito tributário, dispensada qualquer outra providência por parte do Fisco.

**Prescrição** = prazo para o Fisco ajuizar execução fiscal. Prazo: **5 anos da constituição definitiva do crédito**.

Constituição definitiva ocorre após: (a) escoamento do prazo para impugnação administrativa sem impugnação, ou (b) julgamento definitivo do processo administrativo + prazo para pagamento voluntário.

Súmula 622 STJ: A notificação do auto de infração faz cessar a contagem da decadência; exaurida a instância administrativa e esgotado o prazo de pagamento voluntário, inicia-se o prazo prescricional.

**Interrupção da prescrição (art. 174, § único CTN):**
- Despacho judicial que ordenar citação em execução fiscal
- Protesto judicial ou extrajudicial (LC 208/2024 incluiu extrajudicial)
- Qualquer ato judicial que constitua em mora o devedor
- Reconhecimento do débito pelo devedor (ex: pedido de parcelamento — Súmula 653 STJ)

Atenção: Parcelamento de ofício (imposto pela Fazenda sem anuência do contribuinte) NÃO interrompe a prescrição (STJ, REsp 1641011/PA).

---

### Q&A 1.5 — Decadência e Prescrição

**P:** Fisco pode cobrar dívida de 6 anos atrás?
**R:** Depende. O prazo máximo para o Fisco lançar (constituir o crédito) é 5 anos — se esse prazo passou sem lançamento, houve decadência e o crédito está extinto. Se o crédito foi constituído, o Fisco tem mais 5 anos para ajuizar execução fiscal. Se passou os dois prazos, a dívida está extinta. Verifique: quando foi o fato gerador? quando foi o lançamento? há processo administrativo em curso?

**P:** Recebi uma cobrança de IPTU de 2018 agora em 2026. É válida?
**R:** O IPTU é lançado de ofício. O prazo prescricional começa no dia seguinte ao vencimento. IPTU de 2018 com vencimento em março/2018 teria a prescrição iniciada em abril/2018 e completada em abril/2023. Uma cobrança judicial ajuizada após essa data estaria prescrita. Verifique se houve algum ato interruptivo (parcelamento, protesto, execução fiscal) no período — esses atos reiniciam o prazo.

**P:** Pedi parcelamento de dívida fiscal e foi indeferido. A prescrição continuou correndo?
**R:** Não. O pedido de parcelamento, mesmo que indeferido, interrompe a prescrição porque configura confissão extrajudicial do débito (Súmula 653 STJ). A contagem reinicia do zero a partir do indeferimento.

---

### CHUNK 1.5-PAF — Auto de Infração da Receita Federal: Prazo para Contestar (PAF Federal)
> **Palavras-chave de busca:** auto de infração, contestar, impugnar, impugnação, prazo, Receita Federal, fiscalização federal, PAF, Processo Administrativo Fiscal, defesa administrativa, quantos dias, quanto tempo

**Auto de infração da Receita Federal — prazo para contestar**
Quando a Receita Federal lavra um **auto de infração** (por ex.: IR, IPI, contribuições federais), o processo segue o **Decreto 70.235/1972** (Processo Administrativo Fiscal federal — PAF), não a Lei 9.784/99 (processo administrativo geral). O prazo para apresentar a **impugnação** (defesa administrativa, 1ª instância) é de **20 dias corridos**, contados da data da ciência do auto (Decreto 70.235/72, art. 15, com redação dada pela Lei Complementar 227/2026).

- O dia da ciência não conta; a contagem começa no dia seguinte.
- Se o último dia cair em data sem expediente, prorroga para o 1º dia útil seguinte.
- A impugnação é dirigida à Delegacia da Receita Federal de Julgamento (DRJ).
- Prazo diferente de: (a) Lei 9.784/99 art. 59 — 10 dias para recursos em processos administrativos gerais; (b) autos estaduais e municipais — seguem legislação própria de cada ente.

> **Atenção:** auto de infração estadual (ICMS, IPVA) e municipal (ISS, IPTU) têm prazos próprios definidos por cada Estado/Município — não generalizar o prazo de 20 dias para essas esferas. Orientar o contribuinte a verificar o prazo no próprio auto recebido e buscar advogado tributarista.

---

### CHUNK 1.6 — Denúncia Espontânea

A **denúncia espontânea** (art. 138 CTN) exclui a responsabilidade por infrações e afasta a aplicação de multa. O contribuinte que se antecipa ao Fisco e confessa + paga paga apenas tributo + juros moratórios, sem multa.

**Requisitos cumulativos:**
1. Confissão da infração
2. Pagamento integral do tributo + juros moratórios (parcelamento NÃO serve — Súmula 360 STJ)
3. Espontaneidade: deve ocorrer ANTES de qualquer procedimento fiscal relacionado àquela infração

**Não se aplica denúncia espontânea:**
- Tributos sujeitos a lançamento por homologação regularmente declarados mas pagos em atraso (Súmula 360 STJ) — o contribuinte declarou, o crédito já estava constituído
- Descumprimento de obrigações acessórias (emissão de nota, escrituração)
- Quando já iniciado procedimento fiscalizatório

---

### Q&A 1.6 — Denúncia Espontânea

**P:** Empresa percebeu que não pagou um tributo há 2 anos. Se pagar agora, paga multa?
**R:** Depende do tipo de tributo. Se o tributo é de lançamento por homologação (ICMS, IR, ISS etc.) e a empresa declarou normalmente mas não pagou, a Súmula 360 STJ diz que a denúncia espontânea não se aplica — paga tributo + juros + multa. Mas se nunca declarou nem pagou, pode configurar denúncia espontânea e afastar a multa, desde que nenhum procedimento fiscal tenha sido iniciado. Recomenda-se verificar com contador antes de recolher.

**P:** Empresa quer parcelar dívida atrasada — isso conta como denúncia espontânea e afasta a multa?
**R:** Não. Parcelamento não equivale a pagamento — a Súmula 360 STJ é clara. A denúncia espontânea exige pagamento integral, não parcelamento. A multa continua sendo devida.

---

### CHUNK 1.7 — Dívida Ativa, Certidões e Administração Tributária

**Dívida ativa:** débito tributário não pago após constituição definitiva do crédito, inscrito pela Fazenda Pública. A inscrição confere à dívida presunção de certeza e liquidez (relativa — admite prova em contrário).

**Certidão de Dívida Ativa (CDA):** título executivo extrajudicial — instrumento que lastreia a execução fiscal. Deve conter: nome do devedor, domicílio, valor, fundamento legal, natureza do crédito, data da inscrição, número do processo.

**Certidões tributárias:**
- **Certidão Negativa (CN):** comprova inexistência de débitos. Exigida para vários atos (contratos públicos, financiamentos, transferência de imóveis)
- **Certidão Positiva com Efeitos Negativos (CPEN):** há débito mas está com exigibilidade suspensa (parcelamento, depósito, liminar) ou não vencido. Tem os mesmos efeitos da CN
- **Certidão Positiva:** confirma existência de débito sem suspensão

Prazo para expedição da certidão: 10 dias da data do pedido (art. 205 CTN). Se não expedida no prazo, contribuinte pode obter por mandado de segurança.

**Sanções políticas — vedação:** o Fisco não pode usar meios indiretos de coerção para forçar o pagamento de tributo (ex: cancelar inscrição estadual, apreender mercadorias como meio de pressão, negar alvará). STF sumulou o tema: Súmula 70 e 547 STF.

**Bloqueio administrativo de bens — inconstitucional:** a Fazenda pode averbar a certidão de dívida ativa em cartórios e em cadastros de proteção ao crédito (Serasa/SPC) — isso é válido. Mas **não pode bloquear ou tornar indisponíveis administrativamente os bens ou contas do contribuinte sem ordem judicial**. O bloqueio de bens sem execução fiscal em curso e sem decisão de um juiz foi declarado inconstitucional pelo STF (ADI 5881 e outras, 2020). Se o contribuinte receber notificação de bloqueio administrativo sem processo judicial, pode contestar.

---

## RODADA 2 — IMPOSTOS FEDERAIS

---

### CHUNK 2.1 — Visão Geral dos Impostos Federais

**Impostos de competência da União (art. 153 CF):** II, IE, IR, IPI, ITR, IOF, IGF (não regulamentado), e Imposto Seletivo (EC 132/2023, vigência a partir de 2027).

**Exceções à legalidade e anterioridade (extrafiscais):** II, IE, IPI e IOF podem ter alíquotas alteradas por decreto/ato do Executivo. Não se sujeitam à anterioridade anual. II, IE e IOF também não se sujeitam à noventena.

---

### Q&A 2.1 — Imposto de Importação (II) e Exportação (IE)

**P:** Quando incide o Imposto de Importação?
**R:** Na entrada de produto estrangeiro no território nacional. Fato gerador: desembaraço aduaneiro (para mercadorias estrangeiras) ou arrematação em leilão. Competência exclusiva da União. Finalidade primordial: extrafiscal (proteção da indústria nacional). Não respeita anterioridade nem noventena.

**P:** Quem paga o Imposto de Exportação?
**R:** O exportador. Fato gerador: saída de produto do território nacional. Finalidade extrafiscal (controle de câmbio, política econômica). Não respeita anterioridade nem noventena. Incide raramente — em geral como ferramenta de política econômica em momentos específicos.

---

### CHUNK 2.2 — Imposto de Renda (IR)

**Competência:** União. Fato gerador: aquisição da disponibilidade econômica ou jurídica de renda (produto do capital, trabalho ou ambos) ou proventos de qualquer natureza (acréscimos patrimoniais não qualificados como renda).

**Princípios:** generalidade (todas as pessoas), universalidade (todos os rendimentos), progressividade (alíquotas crescentes por faixa).

**Tabela progressiva mensal do IRPF — 2026 (tabela tradicional, mantida):**
- Até R$ 2.428,80 — isento
- R$ 2.428,81 a R$ 2.826,65 — 7,5%
- R$ 2.826,66 a R$ 3.751,05 — 15%
- R$ 3.751,06 a R$ 4.664,68 — 22,5%
- Acima de R$ 4.664,68 — 27,5%

**Redutor da Lei 15.270/2025 (aplicado junto com a tabela, desde 1º/01/2026):** renda mensal até **R$ 5.000 → imposto zerado** (redução de até R$ 312,89); de R$ 5.000,01 a R$ 7.350 → redução parcial decrescente; acima de R$ 7.350 → sem redução. Na prática: quem ganha até R$ 5.000/mês não paga IR, mesmo estando em faixa tributável da tabela tradicional. O mesmo vale para o 13º. Anual: isenção até R$ 60.000 de rendimentos tributáveis no ano.

**Anterioridade:** sujeito à anterioridade ANUAL (não à noventena). Lei publicada em dezembro vale a partir de 1º de janeiro do ano seguinte.

**Verbas indenizatórias NÃO incidem IR:** férias não gozadas por necessidade do serviço (Súmula 125 STJ), indenização por PDV (Súmula 215 STJ), indenização por danos morais (Súmula 498 STJ), férias proporcionais e adicional (Súmula 386 STJ).

**Verbas que INCIDEM IR:** horas extraordinárias mesmo que em acordo coletivo (Súmula 463 STJ), juros de mora sobre lucros cessantes (regra geral — Tema 878 STJ — exceto sobre verbas alimentares atrasadas).

**Isenção para aposentados com doenças graves** (art. 6º, XIV Lei 7.713/88): neoplasia maligna, cardiopatia grave, Parkinson, hepatopatia grave, nefropatia grave, entre outras. Alzheimer pode configurar "alienação mental" e gerar isenção (STJ). Não precisa de laudo médico oficial — outros meios de prova suficientes (Súmula 598 STJ).

---

### Q&A 2.2 — Imposto de Renda

**P:** Indenização por demissão sem justa causa paga IR?
**R:** Não, na parte indenizatória. A indenização busca recompor um dano — não é acréscimo patrimonial. Verbas de caráter indenizatório são isentas de IR. Verbas de natureza remuneratória (salário atrasado, horas extras, 13º) incidem IR normalmente.

**P:** Aposentado com câncer precisa pagar IR sobre sua aposentadoria?
**R:** Não. A Lei 7.713/88 (art. 6º, XIV) isenta os proventos de aposentadoria de portadores de neoplasia maligna e outras doenças graves listadas. A isenção não exige laudo médico oficial — outros meios de prova são aceitos (Súmula 598 STJ). A doença pode ter sido adquirida após a aposentadoria.

**P:** Empresa recebeu multa do Fisco e quer abater no IR. Pode?
**R:** Não. Multas tributárias não são dedutíveis para fins de IR — não configurem despesa operacional necessária à atividade (art. 41, §1º Lei 8.981/1995).

---

### Q&A 2.3 — IPI, IOF e ITR

**P:** O que é IPI e quem paga?
**R:** Imposto sobre Produtos Industrializados — incide sobre saída de produto industrializado do estabelecimento industrial ou equiparado. Contribuinte: o industrial, o importador, o comerciante de produtos industrializados. Finalidade: fiscal + extrafiscal. Princípio da seletividade (alíquota maior para produtos supérfluos) e não-cumulatividade. Não respeita anterioridade anual — mas respeita a noventena.

**P:** IOF incide sobre o quê?
**R:** Operações financeiras: câmbio, crédito, seguro e operações com títulos/valores mobiliários. Finalidade extrafiscal. Pode ter alíquota alterada por decreto, sem anterioridade. Usado como instrumento de política monetária e cambial.

**P:** Proprietário rural paga IPTU ou ITR?
**R:** ITR — Imposto Territorial Rural, de competência da União. IPTU é municipal, incide sobre imóvel urbano. A distinção é pelo critério da localização e utilização. Pequenas glebas rurais exploradas por agricultor familiar são imunes ao ITR.

---

### CHUNK 2.3 — Imposto Seletivo (IS) — Reforma Tributária

Criado pela EC 132/2023 e regulamentado pela LC 214/2025. **Vigência a partir de 2027.**

**Finalidade:** extrafiscal — desestimular a produção, extração, comercialização ou importação de bens e serviços prejudiciais à saúde ou ao meio ambiente.

**Exemplos de itens sujeitos:** tabaco, bebidas alcoólicas, veículos, embarcações, aeronaves, minérios, produtos com alto teor de carbono.

**Competência:** União (art. 153, VIII CF).

**Imunidades (art. 153 §6° CF, EC 132/2023):** o IS não incide sobre: (1) exportações; (2) operações com energia elétrica; (3) serviços de telecomunicações.

**Anterioridade:** o IS respeita a anterioridade anual (não pode produzir efeito no mesmo exercício financeiro da lei), mas NÃO respeita a anterioridade nonagesimal (noventena) — publicada a lei, não é necessário esperar 90 dias para entrar em vigor (EC 132/2023).

---

## RODADA 3 — TRIBUTOS ESTADUAIS: ICMS, IPVA, ITCMD

---

### CHUNK 3.1 — ICMS: Visão Geral e Transição para IVA

**Competência:** Estados e DF (art. 155, II CF). Incide sobre circulação de mercadorias + serviços de transporte interestadual e intermunicipal + comunicação.

**Finalidade:** predominantemente fiscal.

**Transição para o IVA Dual (EC 132/2023):**
- Até 2028: ICMS cobrado normalmente
- 2029–2032: IBS cobra junto com ICMS, que é reduzido 10% ao ano (chegando a 40% do valor original em 2032)
- A partir de 2033: ICMS extinto — substituído pelo IBS (estadual/municipal) e CBS (federal)

**Contribuinte do ICMS** (LC 87/1996, art. 4º): qualquer pessoa física ou jurídica que realize, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria ou prestação dos serviços de transporte/comunicação. Mesmo sem habitualidade, o importador é contribuinte.

**Não incide ICMS sobre:**
- Água canalizada (serviço público, não mercadoria — STF)
- Alienação de salvados de sinistro por seguradoras (SV 32 STF)
- Transferência de mercadoria entre estabelecimentos do mesmo titular (SV 49 STF)
- Licenciamento e cessão de direito de uso de software (ISS incide — ADI 5659)
- Encargos de transmissão e distribuição de energia elétrica (LC 194/2022)

**Incide ICMS sobre:**
- Energia elétrica (mercadoria)
- Importação de bens, ainda que por pessoa física não comerciante (SV 48 STF — desembaraço aduaneiro)
- Medicamentos de prateleira (ICMS) — medicamentos manipulados sob encomenda (ISS)

---

### Q&A 3.1 — ICMS

**P:** Empresa de software paga ICMS ou ISS?
**R:** ISS. O STF (ADI 5659, 2021) pacificou: sobre software — qualquer tipo, padronizado ou por encomenda, físico ou digital, SaaS (Software as a Service) — incide apenas ISS, nunca ICMS. O ICMS ficou definitivamente afastado de operações com software.

**P:** Comprei mercadoria importada. Tenho que pagar ICMS mesmo não sendo comerciante?
**R:** Sim. Após a EC 33/2001 e a LC 114/2002, o ICMS incide na importação mesmo que o importador não seja contribuinte habitual. O recolhimento ocorre no desembaraço aduaneiro (SV 48 STF). O Estado competente é o do domicílio do destinatário.

**P:** Farmácia de manipulação paga ICMS ou ISS sobre medicamentos feitos sob encomenda?
**R:** ISS — medicamento manipulado sob encomenda é serviço personalizado. Medicamentos de prateleira (industrializados, padronizados) pagam ICMS. Essa distinção foi consolidada pelo STF em 2020 (RE 605552).

**P:** Empresa de transporte rodoviário paga ICMS?
**R:** Sim, sobre serviços de transporte interestadual e intermunicipal. Transporte municipal (intramunicipal) é tributado por ISS.

---

### CHUNK 3.2 — Substituição Tributária no ICMS

A substituição tributária (ST) é o regime em que a responsabilidade pelo pagamento do ICMS é atribuída a um terceiro na cadeia produtiva (geralmente o fabricante/importador), eliminando a necessidade de recolhimento em cada etapa.

**Substituição progressiva (para frente):** o imposto é recolhido antecipadamente pelo substituto (fabricante) sobre operações futuras presumidas. A base de cálculo é o valor presumido de venda ao consumidor final (preço de pauta ou MVA — Margem de Valor Agregado).

**Caso da venda por preço inferior ao presumido:** o STF (RE 593.849, Tema 201) decidiu que é devida a restituição do ICMS-ST pago a maior quando a venda ao consumidor ocorrer por valor inferior à base de cálculo presumida. Esse entendimento vale a partir de 2014 (modulação de efeitos).

---

### Q&A 3.2 — IPVA e ITCMD

**P:** IPVA incide sobre que tipo de veículo?
**R:** Veículos automotores terrestres. O STF fixou (Tema 708) que aeronaves e embarcações não estavam sujeitas ao IPVA (ausência de lei complementar regulamentando), mas a EC 132/2023 e a EC 137/2025 estenderam a competência para aeronaves e embarcações — agora podem ser tributados pelos Estados.

**P:** Quem paga ITCMD e quando?
**R:** ITCMD (Imposto sobre Transmissão Causa Mortis e Doação) é estadual. Incide sobre: (1) herança ou legado recebido por causa mortis; (2) doação de bens ou direitos. Contribuinte: o herdeiro/legatário (causa mortis) ou o donatário (doação). O STF (RE 851.108, Tema 1.174) declarou inconstitucional a cobrança de ITCMD sobre heranças e doações do exterior sem lei complementar federal regulamentando — aguarda regulamentação.

**P:** Há alíquota máxima para ITCMD?
**R:** Sim. A Resolução do Senado Federal nº 9/1992 fixou alíquota máxima de 8% para o ITCMD. A EC 132/2023 tornou obrigatória a progressividade do ITCMD (alíquotas crescentes conforme o valor da herança/doação).

---

## RODADA 4 — TRIBUTOS MUNICIPAIS, ISS, IPTU, ITBI E REFORMA TRIBUTÁRIA (IBS/CBS)

---

### CHUNK 4.1 — ISS (Imposto Sobre Serviços)

**Competência:** Municípios e DF (art. 156, III CF). **Vigência até 2032** — a partir de 2033 é substituído pelo IBS/CBS (Reforma Tributária).

**Fato gerador:** prestação de serviços constantes na lista taxativa da LC 116/2003. A lista é taxativa mas admite interpretação extensiva para abranger serviços conexos (STF, Tema 296).

**Serviço:** oferta habitual de utilidade a outrem, por meios materiais ou imateriais, com intuito de lucro — não limitado às obrigações de fazer do Direito Civil (RE 651.703 STF).

**Alíquotas:**
- Mínima: 2% (art. 8º-A LC 116/2003)
- Máxima: 5% (art. 8º LC 116/2003)
- Municípios NÃO podem conceder isenção ou redução abaixo de 2% — nulidade da lei municipal (salvo subitens 7.02, 7.05 e 16.01)

**Local de recolhimento (regra geral):** estabelecimento prestador. Exceções (local da execução): construção civil, demolição, reparação de vias públicas, guincho intramunicipal, guindaste, içamento (LC 218/2025).

**Exportação de serviços:** não incide ISS sobre exportações para o exterior (art. 2º, I LC 116/2003). Exceção: pesquisa farmacêutica executada no Brasil para empresa estrangeira NÃO é exportação — incide ISS (STJ, REsp 2.075.903/SP).

**Software:** SEMPRE ISS — padronizado, personalizado, SaaS, download, qualquer forma (ADI 5659 STF, 2021).

**Atividade industrial intermediária:** NÃO incide ISS mesmo constando na lista da LC 116/2003, quando configurar etapa intermediária de ciclo produtivo — incide ICMS/IPI (RE 882.461/MG STF, 2025).

---

### Q&A 4.1 — ISS

**P:** Prestador de serviço recolhe ISS no município onde está ou onde o cliente fica?
**R:** Regra geral: no município do estabelecimento do prestador (art. 3º LC 116/2003). Exceções: para construção civil, demolição, serviços de guindaste/içamento e outros previstos nos incisos do art. 3º, o ISS é devido no local da efetiva prestação. O STJ (Temas 354 e 355) consolidou: vale o município onde o serviço é efetivamente realizado, desde que o prestador tenha unidade econômica ou profissional no local.

**P:** A prefeitura onde fica meu cliente exige que eu me cadastre lá antes de emitir nota. Sou obrigado?
**R:** Não. O STF decidiu (RE 1167509/SP, repercussão geral) que é inconstitucional lei municipal que obriga prestador de serviços estabelecido em outro município a se cadastrar, e que impõe ao tomador local a retenção do ISS como punição por esse descumprimento. Você recolhe ISS no município do seu estabelecimento. Se a prefeitura do cliente reter ISS indevidamente sem base legal válida, é possível pedir restituição. Peça ao seu contador para confirmar as exceções previstas em lei (construção civil, por exemplo, sempre foi no local da obra).

**P:** Autônomo que presta serviços paga ISS?
**R:** Sim. O contribuinte do ISS é o prestador do serviço — pessoa física ou jurídica. Autônomos profissionais (médicos, advogados, engenheiros) são contribuintes. Sociedades profissionais simples (sem caráter empresarial) têm benefício de alíquota fixa previsto no art. 9º do DL 406/68 — não revogado pela LC 116/2003 (STJ).

**P:** Empresa de TI que vende software como serviço (SaaS) paga ISS ou ICMS?
**R:** ISS. O STF pacificou em 2021 (ADI 5659 e ADI 1945): qualquer operação com software — SaaS, licença, download, personalizado ou padronizado — incide apenas ISS. O ICMS foi completamente afastado.

---

### CHUNK 4.2 — IPTU

**Competência:** Municípios e DF. Incide sobre propriedade, domínio útil ou posse de imóvel predial ou territorial urbano.

**Fato gerador:** ser proprietário, titular de domínio útil ou possuidor (a qualquer título) em 1º de janeiro de cada ano.

**Contribuinte:** proprietário, titular do domínio útil ou possuidor. Inquilino NÃO é contribuinte do IPTU — mas pode ser responsabilizado por cláusula contratual perante o locador.

**Base de cálculo:** valor venal do imóvel, apurado com base na **Planta Genérica de Valores (PGV)** aprovada pelo Município. Pode ser atualizado por decreto (correção monetária), mas aumento real da base de cálculo exige lei (Súmula 160 STJ).

**Alíquotas progressivas:**
- Progressividade fiscal: em razão do valor do imóvel — permitida após EC 29/2000
- Progressividade extrafiscal: imóvel que não cumpre função social — permitida (art. 182, §4º CF, para imóveis sujeitos a plano diretor)
- Alíquotas diferenciadas por localização e uso do imóvel são permitidas

**Lançamento:** de ofício. Contribuinte é notificado pelo envio do carnê (Súmula 397 STJ). O prazo prescricional começa no dia seguinte ao vencimento da parcela.

**IPTU de imóvel em área de expansão urbana:** incide IPTU se o imóvel integra área urbana definida por lei municipal — mesmo em zona de expansão (Súmula 626 STJ).

**Credor fiduciário:** NÃO é sujeito passivo do IPTU antes da consolidação da propriedade (inadimplência do devedor fiduciante e registro da consolidação no cartório).

---

### Q&A 4.2 — IPTU

**P:** Inquilino tem que pagar IPTU?
**R:** O inquilino NÃO é contribuinte do IPTU — quem deve ao Fisco é o proprietário. Mas o contrato de locação pode transferir a obrigação de pagamento ao inquilino entre as partes. Se o proprietário não pagar, o Fisco cobra do proprietário, não do inquilino. A lei municipal pode definir o locatário como responsável tributário, mas isso é raro.

**P:** Recebi carnê de IPTU de 2019 em 2026. Devo pagar?
**R:** Provavelmente não — verifique se a dívida está prescrita. IPTU de 2019 com vencimento, por exemplo, em março/2019: prescrição começa em abril/2019 e se completa em abril/2024. Se o Município não ajuizou execução fiscal antes disso, a dívida está prescrita. Verifique se houve protesto ou execução fiscal no período — esses atos interrompem a prescrição.

**P:** Prefeitura pode cobrar IPTU progressivo de imóvel abandonado?
**R:** Sim. O art. 182, §4º CF permite progressividade extrafiscal para imóvel que não cumpra função social, mediante lei específica baseada no plano diretor. O processo é escalonado: primeiro notificação para parcelar/edificar/utilizar → depois IPTU progressivo por até 5 anos → depois desapropriação com pagamento em títulos da dívida pública.

---

### CHUNK 4.3 — ITBI

**Competência:** Municípios e DF. Incide sobre transmissão inter vivos, por ato oneroso, de bens imóveis e de direitos reais sobre imóveis (exceto direitos reais de garantia, como hipoteca e alienação fiduciária).

**Fato gerador:** transmissão efetiva da propriedade — ocorre com o **registro em cartório** (não com o contrato de compra e venda). Súmula 430 STJ: inadmissível a condenação ao pagamento de ITBI antes do registro.

**Base de cálculo:** valor venal do bem ou direito transmitido, correspondente ao valor real da transação (valor de mercado individual do negócio). O STF (Tema 1.113) fixou que o Município **não pode** impor como base o valor da Planta Genérica de Valores (PGV) se este for superior ao valor efetivo da transação — o ITBI tem base individual, distinta do IPTU (que usa PGV coletiva). Municípios não podem exigir ITBI antes do registro (STJ).

**Alíquotas:** fixadas por lei municipal. Progressividade: inconstitucional (Súmula 656 STF — EC 29/2000 só autorizou progressividade para IPTU, não ITBI).

**Imunidade:** não incide ITBI na integralização de imóvel ao capital social de empresa (art. 156, §2º, I CF) — mas a imunidade alcança apenas o valor do imóvel correspondente ao capital subscrito; o excedente é tributado (STF, RE 796.376).

**Dissolução de sociedade e retorno ao sócio:** não incide ITBI quando o imóvel retorna ao sócio na dissolução da sociedade, pelo mesmo valor com que foi integralizado.

---

### Q&A 4.3 — ITBI

**P:** Paguei ITBI antes de registrar o imóvel. O registro ainda não aconteceu. Devo pagar?
**R:** O ITBI só é devido após o registro em cartório — esse é o fato gerador (STJ). Se o Município exigiu antecipadamente, é possível questionar. Contudo, na prática, os municípios exigem o pagamento como condição para o registro, e o STJ admite essa exigência no momento do registro (não antes do contrato, mas na lavratura da escritura ou apresentação para registro).

**P:** Vou integralizar um imóvel ao capital da minha empresa. Preciso pagar ITBI?
**R:** Não, até o valor correspondente ao capital subscrito (art. 156, §2º, I CF). Se o imóvel vale R$ 500 mil e você integralizou R$ 400 mil no capital, R$ 400 mil são imunes — apenas os R$ 100 mil excedentes estariam sujeitos ao ITBI (STF, RE 796.376). Além disso, se a empresa tiver atividade imobiliária preponderante (compra/venda/locação de imóveis), perde a imunidade.

---

### CHUNK 4.4 — Reforma Tributária: IBS e CBS (LC 214/2025)

A EC 132/2023 criou o modelo de IVA Dual brasileiro, regulamentado pela LC 214/2025.

**Os dois novos tributos sobre consumo:**
1. **IBS (Imposto sobre Bens e Serviços):** substitui ICMS (estados) e ISS (municípios). Competência: estados e municípios. Gerido pelo Comitê Gestor do IBS.
2. **CBS (Contribuição sobre Bens e Serviços):** substitui PIS, COFINS e PIS/COFINS-Importação. Competência: União.

**Cronograma de transição:**
- 2026: CBS a 0,1% e IBS a 0,05% (período de testes/adaptação)
- 2027–2028: CBS começa a vigorar com alíquotas plenas; PIS/COFINS reduzidos proporcionalmente
- 2029–2032: IBS aumenta gradualmente; ICMS e ISS reduzidos proporcionalmente
- 2033 em diante: ICMS, ISS, PIS e COFINS extintos; IBS e CBS em pleno vigor

**Hipóteses de incidência do IBS e CBS:** qualquer operação onerosa com bens (materiais e imateriais, incluindo direitos) e serviços, realizadas de forma habitual ou em volume que caracterize atividade econômica. Inclui importações por pessoas físicas não comerciantes.

**Princípio da não-cumulatividade:** IBS e CBS são não-cumulativos — geram crédito ao adquirente. Modelo "por fora" (ao contrário do ICMS atual que é "por dentro").

**Cashback (devolução tributária):** LC 214/2025 prevê devolução de parte do IBS/CBS para contribuintes de baixa renda (renda per capita ≤ ½ salário mínimo, domicílio no Brasil, CPF regular).

**Split Payment:** o pagamento do IBS/CBS é feito diretamente ao Fisco pela instituição financeira no momento da transação — o vendedor recebe apenas o valor líquido, sem precisar recolher manualmente.

**Comitê Gestor do IBS:** órgão autônomo criado pela EC 132/2023 para administrar o IBS (arrecadação, distribuição entre estados e municípios, contencioso). Composto por representantes dos estados, DF e municípios.

**Zona Franca de Manaus:** mantém regime diferenciado mesmo após a Reforma — regimes de incentivo regionais são preservados até 2073.

---

### Q&A 4.4 — Reforma Tributária

**P:** O que muda para minha empresa com a Reforma Tributária?
**R:** Principais mudanças práticas: (1) PIS e COFINS serão substituídos pela CBS a partir de 2027; (2) ICMS será substituído gradualmente pelo IBS entre 2029 e 2032; (3) ISS pelo IBS a partir de 2033; (4) o novo sistema é não-cumulativo "por fora" — crédito pleno para empresas do regime normal; (5) o pagamento passa a ser automático via split payment em transações eletrônicas. Para empresas do Simples Nacional: a LC 214/2025 prevê tratamento diferenciado mantendo o recolhimento unificado.

**P:** Simples Nacional vai acabar com a Reforma Tributária?
**R:** Não. O Simples Nacional é regime constitucional (art. 146, III, d CF) e não foi extinto. A LC 214/2025 prevê a coexistência do Simples Nacional com o IBS/CBS durante e após a transição. As regras específicas para optantes do Simples no novo sistema estão sendo regulamentadas.

---

## CHUNK — ITBI: Restituição por Nulidade do Negócio Jurídico

O ITBI pago na compra de um imóvel pode ser **restituído** se o negócio jurídico for declarado nulo.

**Lógica:** o fato gerador do ITBI é a transmissão do imóvel. Se o contrato de compra e venda é declarado nulo, a transmissão juridicamente não ocorreu — o fato gerador não se perfectibilizou. O município deve devolver o valor ao contribuinte.

**Quando isso ocorre:**
- Contrato declarado nulo por simulação, fraude, incapacidade da parte ou vício de forma
- Promessa de compra e venda anulada antes da escritura definitiva (o fato gerador ocorre com o **registro**, não com o compromisso)
- Rescisão do contrato antes da transmissão efetiva da propriedade

**Como pedir a restituição:** ação de repetição de indébito tributário contra o município, dentro do prazo prescricional de **5 anos** (LC 118/2005 c/c CTN art. 168, I), contado da data do pagamento indevido.

**P: Paguei ITBI para comprar um imóvel, mas o contrato foi anulado na Justiça. Perco o imposto?**
R: Não. Se o negócio jurídico foi declarado nulo, o fato gerador do ITBI não se consumou e você tem direito à restituição. Ajuíze ação de repetição de indébito tributário contra o município no prazo de 5 anos contado da data do pagamento.

**Referência:** STJ, EREsp 1.493.162-DF (2020).

---

## COMPLEMENTO — MEI, Autônomo e ME/EPP: Operação Tributária do Dia a Dia

*Adicionado em 04/06/2026 — cobre gaps de cobertura para operação prática de autônomos, MEI, ME e EPP.*

---

### CHUNK C.1 — Nota Fiscal: Obrigações de Emissão

**O que é nota fiscal:** documento fiscal que comprova uma operação de venda de mercadoria ou prestação de serviço. É obrigação acessória tributária — independe de haver tributo a pagar.

**Tipos principais:**

| Tipo | O que é | Quem usa |
|------|---------|----------|
| **NF-e** (Nota Fiscal Eletrônica) | Venda de mercadoria | Comércio, indústria, MEI comércio/indústria |
| **NFS-e** (Nota Fiscal de Serviços Eletrônica) | Prestação de serviço | Autônomo, MEI serviço, ME/EPP serviço |
| **NFC-e** (Nota Fiscal de Consumidor) | Venda no varejo para consumidor final | Comércio varejista |
| **CT-e** | Transporte de cargas | Transportadores |

**MEI e nota fiscal:**
- MEI é **obrigado a emitir nota fiscal** quando vende para pessoa jurídica (CNPJ)
- Para pessoa física: em geral não é obrigado, mas alguns estados e municípios exigem acima de determinado valor
- MEI emite NFS-e pelo sistema do município (gratuito) ou NF-e pela SEFAZ do estado
- MEI que não emite NF quando obrigado: multa mínima de R$ 200 (varia por estado/município)

**Autônomo e nota fiscal:**
- Autônomo que presta serviço para pessoa jurídica deve emitir **NFS-e** — o tomador geralmente exige para retenção na fonte e dedução do custo
- Autônomo sem CNPJ pode emitir NFS-e avulsa (fornecida pela prefeitura) ou usar RPA (Recibo de Pagamento a Autônomo) — o RPA não substitui a NF para todos os fins, mas é aceito por muitos tomadores

**ME/EPP:**
- Obrigados a emitir NF em todas as operações — venda de mercadoria ou prestação de serviço
- Prazo de emissão: no momento da saída da mercadoria ou conclusão do serviço
- Cancelamento de NF-e: até 24 horas após a emissão (SEFAZ); após esse prazo, emite Carta de Correção ou NF de devolução

---

### CHUNK C.2 — Retenção na Fonte: ISS e IRRF para Autônomos e ME

**O que é retenção na fonte:** o tomador do serviço desconta o tributo do valor a pagar ao prestador e recolhe diretamente ao Fisco. O prestador recebe o valor líquido.

#### ISS — Retenção pelo Tomador

Municípios podem obrigar o **tomador** (empresa contratante) a reter o ISS e recolher diretamente à prefeitura, quando:
- O prestador é autônomo ou pessoa física
- O prestador é empresa de fora do município
- A lei municipal determina (o que é muito comum — São Paulo, Rio, a maioria das capitais)

**Impacto para o prestador:** recebe o valor líquido. Na apuração do próprio ISS, o valor retido é compensado — não paga duas vezes.

**Alíquota:** entre 2% e 5% (varia por município e tipo de serviço).

#### IRRF — Imposto de Renda Retido na Fonte

Quando pessoa jurídica paga a **pessoa física** (autônomo, profissional liberal):
- Incide IRRF na tabela progressiva
- O tomador retém e recolhe via DARF (código 0588 — trabalho sem vínculo)
- O autônomo recebe o comprovante de rendimentos (Informe de Rendimentos) em fevereiro do ano seguinte
- Na Declaração de Ajuste Anual do IR: o IRRF retido é compensado

**Retenção IRRF (2026):** aplica-se a tabela progressiva mensal (isento até R$ 2.428,80; 7,5% até R$ 2.826,65; 15% até R$ 3.751,05; 22,5% até R$ 4.664,68; 27,5% acima) **em conjunto com o redutor da Lei 15.270/2025** — pagamento mensal de até R$ 5.000 a pessoa física fica com IRRF zerado; entre R$ 5.000,01 e R$ 7.350, redução parcial. Fonte da rotina de cálculo: Receita Federal.

**INSS retido na fonte sobre autônomo:** além do IRRF, a empresa tomadora retém **11% de INSS** sobre o valor bruto pago ao autônomo (contribuinte individual), **limitado ao teto do salário de contribuição do INSS (R$ 8.475,55 em 2026)** — ou seja, o desconto máximo é de **R$ 932,31/mês** (11% do teto). Sobre o que exceder o teto não há retenção adicional. O teto é também a base máxima usada no cálculo de qualquer benefício do INSS. O autônomo deve confirmar com o tomador se a retenção foi feita corretamente para evitar contribuir em duplicidade.

**Quando pessoa jurídica paga a outra pessoa jurídica (ME/EPP):** em geral não há retenção de IRPJ na fonte (a empresa recolhe seu próprio imposto). Exceção: serviços de limpeza, conservação, segurança, processamento de dados, medicina, odontologia, engenharia, advocacia e outros listados no art. 647 do RIR — nesses casos, há retenção de IRPJ (1,5%), CSLL (1%), PIS (0,65%) e COFINS (3%) = total de 6,15% (retenção das "contribuições federais" ou "retenção do art. 647").

---

### CHUNK C.3 — Carnê-Leão: IR do Autônomo

O **carnê-leão** é o recolhimento mensal obrigatório do Imposto de Renda por autônomos e profissionais liberais que recebem de **pessoas físicas** ou do **exterior** — quando o pagador não faz a retenção na fonte.

**Quem deve pagar:** autônomos que recebem de pessoas físicas (médico, dentista, advogado particular, consultor, terapeuta, professor particular etc.).

**Como funciona:**
1. Todo mês, somar todos os rendimentos recebidos de pessoas físicas
2. Aplicar a tabela progressiva do IR sobre esse total
3. Recolher via DARF (código 0190) até o **último dia útil do mês seguinte** ao recebimento
4. Na Declaração Anual: os valores pagos via carnê-leão são compensados no imposto total apurado

**Deduções permitidas no carnê-leão:**
- Dependentes (valor fixo por dependente)
- INSS pago no período
- Pensão alimentícia judicial
- Despesas de custeio do trabalho: aluguel do consultório, material, funcionários — para profissionais que mantêm escritório/consultório

**Livro-caixa:** autônomos podem deduzir despesas necessárias ao exercício da atividade. Exige escrituração (registro das receitas e despesas). Reduz a base de cálculo do IR.

**Multa por não pagamento do carnê-leão:** 0,33% ao dia, limitado a 20%, mais juros Selic. Não pagar o carnê-leão e tentar acertar só na declaração anual gera multa de atraso.

---

### CHUNK C.4 — CSLL e Parcelamentos Federais

#### CSLL — Contribuição Social sobre Lucro Líquido

**O que é:** contribuição federal que incide sobre o lucro das pessoas jurídicas. Destinada ao financiamento da seguridade social.

**Para ME/EPP no Simples Nacional:** a CSLL está **incluída no DAS** — não há recolhimento separado. **Prazo do DAS:** o DAS do Simples Nacional vence **todo dia 20** do mês seguinte ao período de apuração; sem expediente bancário no dia 20, recolhe-se no dia útil imediatamente posterior (*base interna: Resolução CGSN 140/2018*).

**Para ME/EPP fora do Simples (Lucro Presumido ou Real):**
- Alíquota padrão: **9%** sobre o lucro (base de cálculo ajustada)
- No Lucro Presumido: incide sobre a base presumida (12% da receita para atividades em geral; 32% para serviços)
- Recolhimento: mensal via DARF (código 2484)

#### Parcelamentos de Dívidas Fiscais Federais

**Parcelamento ordinário (Portaria PGFN):** parcelamento padrão de dívidas inscritas em dívida ativa da União. Até 60 meses. Acesso pelo portal REGULARIZE (regularize.pgfn.gov.br).

**Parcelamento do Simples Nacional:** dívidas do DAS podem ser parceladas em até 60 meses pelo portal Simples Nacional. Entrada mínima: 5% da dívida.

**PERT e programas especiais:** periodicamente o governo abre programas de parcelamento com descontos em multas e juros (REFIS, PERT, Litígio Zero etc.). Quando abertos, têm prazo limitado para adesão. JUDITH deve informar sobre programas ativos e encaminhar ao contador para avaliar conveniência.

**Exclusão de parcelamento — exige notificação prévia:** a exclusão do contribuinte de qualquer programa de parcelamento fiscal sem notificação prévia é inconstitucional. O STF decidiu (RE 669196/DF, repercussão geral) que o contribuinte deve ser avisado e ter oportunidade de se regularizar antes de ser excluído. Se foi excluído sem aviso, é possível contestar judicialmente e tentar reinclusão.

**Efeito do parcelamento:**
- Suspende a exigibilidade do crédito tributário (o Fisco não pode executar enquanto o parcelamento estiver ativo)
- Permite obtenção de certidão positiva com efeitos negativos (CPEN)
- Interrompe a prescrição (o pedido de parcelamento equivale a confissão do débito — Súmula 653 STJ)

⚠️ **ANTES de orientar parcelamento de dívida tributária antiga:** a JUDITH DEVE verificar a prescrição (5 anos da constituição definitiva) — pedido de parcelamento equivale a **CONFISSÃO** e interrompe a prescrição (Súmula 653 STJ): parcelar dívida já prescrita ressuscita cobrança morta. Dívida perto de prescrever = validar com contador/advogado antes de aderir.

---

### Q&A — Operação Tributária do Dia a Dia

**P: Sou MEI e prestei serviço para uma empresa. Preciso emitir nota fiscal?**
R: Sim. MEI é obrigado a emitir nota fiscal quando o tomador é pessoa jurídica (CNPJ). Você emite a NFS-e pelo sistema da prefeitura do seu município — é gratuito. Para pessoa física, verifique a legislação do seu município, mas em geral não é obrigatório. Não emitir quando obrigado gera multa.

**P: Sou autônomo e a empresa me pagou R$ 5.000. Descontaram R$ 700 de IR na fonte. O que faço?**
R: O valor retido (IRRF) é um adiantamento do seu IR. Você precisa: (1) solicitar o comprovante de rendimentos à empresa pagadora; (2) incluir esse rendimento na sua Declaração de Ajuste Anual do IR; (3) o IRRF retido é abatido do imposto total apurado — se pagou a mais, recebe restituição; se pagou a menos, paga a diferença. Além disso, se você recebe de pessoas físicas também, deve pagar o carnê-leão mensalmente sobre esses valores.

**P: Recebi de cliente pessoa física todo mês como autônomo. Preciso pagar IR mensalmente?**
R: Sim — é o carnê-leão. Soma todos os rendimentos recebidos de pessoas físicas no mês, aplica a tabela progressiva do IR e paga via DARF até o último dia útil do mês seguinte. Não pagar gera multa de 0,33% ao dia. Você pode deduzir despesas do seu consultório/escritório via livro-caixa, o que reduz a base de cálculo.

**P: Minha empresa (ME) tem dívida com a Receita Federal. O que posso fazer?**
R: Você pode parcelar. Dívidas do DAS (Simples Nacional) são parceladas no portal do Simples em até 60 meses. Dívidas inscritas em dívida ativa da União são parceladas no portal REGULARIZE (regularize.pgfn.gov.br) em até 60 meses. O parcelamento suspende a exigibilidade da dívida — você consegue certidão negativa de débitos enquanto mantiver as parcelas em dia. Fique atento a programas especiais de parcelamento com desconto em multas que o governo abre periodicamente — nesse caso vale consultar um contador para avaliar se compensa aderir.

**P: Recebi uma notificação dizendo que a Fazenda vai bloquear minha conta ou meus bens por dívida de imposto. Isso pode acontecer sem processo judicial?**
R: Não é constitucional. A Fazenda pode: negativar seu nome no Serasa/SPC e averbar a dívida na matrícula do seu imóvel — isso é válido. O que ela **não pode** fazer é bloquear sua conta bancária ou tornar seus bens indisponíveis administrativamente sem ajuizar execução fiscal e sem ordem de um juiz (STF, ADI 5881 e outras, 2020). Se você recebeu notificação de bloqueio administrativo sem que exista processo judicial em curso, procure um advogado — é possível contestar e reverter.

**P: Fui excluído de um parcelamento (REFIS/PERT/Simples) sem receber nenhum aviso antes. Isso está correto?**
R: Não. O STF decidiu (RE 669196, repercussão geral) que a exclusão de programa de parcelamento fiscal sem notificação prévia é inconstitucional. Você tem direito de ser avisado para se regularizar antes de ser excluído. Se foi retirado do programa sem aviso, leve ao seu contador ou advogado — há precedente para contestar judicialmente e pedir reinclusão.

**P: A empresa contratante vai reter ISS do meu pagamento. Isso significa que eu não pago ISS?**
R: Parcialmente. Se o tomador retém e recolhe o ISS ao município, você não precisa pagar aquele valor novamente. Mas verifique: se você já está apurando ISS normalmente pela sua empresa, o valor retido é compensado na apuração. Se for autônomo sem empresa, a retenção já encerra sua obrigação para aquela operação. Peça sempre o comprovante de retenção — você vai precisar para comprovar o recolhimento.

---

*Complemento — 04/06/2026 | Fontes: CTN, LC 116/2003 (ISS), RIR (Decreto 9.580/2018), IN RFB 1.500/2014 (carnê-leão), Lei 7.713/88 (IR pessoa física), LC 123/2006 (Simples Nacional), LC 214/2025, Portaria PGFN, Súmula 653 STJ*

---

## COMPLEMENTO 2 — DIFAL, Substituição Tributária e Visão Geral por Perfil
*Adicionado em 04/06/2026 — revisão de cobertura RAG v1.0*

---

### CHUNK D.1 — O que cada perfil paga de tributos (visão consolidada)

**MEI — regime SIMEI:**
- Paga DAS fixo mensal, composto por INSS (variável, % do salário mínimo) + ICMS/ISS (valores fixos em lei, não ligados ao salário mínimo):
  - Comércio ou Indústria: INSS (5% do salário mínimo) + R$ 1,00 de ICMS
  - Prestação de Serviços: INSS (5% do salário mínimo) + R$ 5,00 de ISS
  - Comércio e Serviços: INSS (5% do salário mínimo) + R$ 1,00 de ICMS + R$ 5,00 de ISS
  - MEI Caminhoneiro: INSS de 12% do salário mínimo + taxas adicionais
- **Isento de:** IRPJ, CSLL, PIS, COFINS, IPI dentro do SIMEI
- Paga separado: IR sobre ganho de capital na venda de bens, IOF, FGTS e INSS do empregado (recolhidos via DAE gerado pelo eSocial, até o dia 20 do mês seguinte)
- *Atenção: a parcela de INSS é reajustada todo ano junto com o salário mínimo — valor em reais sempre calculado a partir do valor vigente, nunca fixo aqui.*

**ME/EPP no Simples Nacional:**
- Paga DAS mensal unificado: alíquota variável por Anexo (I a V da LC 123/2006), calculada sobre a receita bruta acumulada dos últimos 12 meses
- Inclui no DAS: IRPJ, CSLL, PIS, COFINS, ICMS ou ISS e CPP (exceto construção civil, vigilância/limpeza/conservação e advocacia — nesses casos, a CPP é recolhida separadamente via DCTFWeb/DARF)
- Paga separado: FGTS dos funcionários, INSS do funcionário (descontado e repassado via DARF gerado pela DCTFWeb), IOF, II, ITR, IR sobre ganho de capital

**Autônomo sem CNPJ:**
- Presta serviço para empresa (PJ): a empresa retém **11% de INSS** (limitado ao teto do salário de contribuição — R$ 8.475,55 em 2026, desconto máximo de R$ 932,31/mês; não incide sobre o valor que exceder o teto) e IRRF conforme tabela progressiva
- IR mensal: recolhe via carnê-leão se receber de pessoa física — prazo: último dia útil do mês seguinte ao recebimento
- ISS: depende do município — em geral o tomador retém e recolhe diretamente à prefeitura
- **INSS próprio do autônomo:** pode recolher como contribuinte individual a 20% do salário de contribuição (cobre todas as modalidades, incluindo aposentadoria por tempo de contribuição) ou a 11% no plano simplificado (não dá direito à aposentadoria por tempo de contribuição — apenas por idade e demais benefícios)

---

### CHUNK D.2 — DIFAL: o imposto estadual nas compras interestaduais

**O que é DIFAL:** Diferencial de Alíquota do ICMS. Quando uma empresa (ME/EPP) compra produto de fornecedor de outro Estado destinado a uso próprio (ativo imobilizado, material de uso e consumo), o Estado de destino cobra a diferença entre a alíquota interestadual (menor) e a alíquota interna do Estado de destino.

**Base legal:** EC 87/2015 ampliou o DIFAL para incluir operações com não contribuintes habituais do ICMS.

**Para optante do Simples Nacional:** o STF (RE 970821/RS) decidiu que o DIFAL pode ser cobrado de empresa do Simples mesmo que ela não seja contribuinte habitual do ICMS. Na prática: ao comprar de fornecedor de outro Estado para uso próprio, a NF pode destacar o DIFAL ou o Estado pode cobrar separado via GNRE.

**Quando NÃO incide DIFAL:** nas compras destinadas à **revenda** — o DIFAL é para uso próprio, não para mercadoria destinada a revenda (essas têm regra própria ou substituição tributária).

**Como recolher:** via GNRE (Guia Nacional de Recolhimento de Tributos Estaduais) — emitida pelo portal da SEFAZ do Estado de destino, antes ou no momento da entrada da mercadoria. Empresas com grande volume de compras interestaduais podem ter inscrição estadual como substituto e recolhem mensalmente.

---

### Q&A D.2 — DIFAL

**P: Recebi cobrança do Estado de SP dizendo que comprei mercadoria de MG sem pagar DIFAL. O que faço?**
**R:** Se sua empresa é contribuinte de ICMS em SP e comprou mercadoria de outro Estado para uso próprio (não para revenda), deveria ter recolhido o DIFAL na entrada da mercadoria. Verifique se a NF de compra indicava a base de cálculo do DIFAL. O DIFAL é recolhido por GNRE (guia nacional) antes ou no momento da entrada. Se houver dívida, pode parcelar ou regularizar pelo portal da SEFAZ estadual. Consulte um contador.

**P: Comprei equipamento em São Paulo para minha ME em Minas Gerais. Preciso pagar DIFAL?**
**R:** Sim, provavelmente. Se comprou para uso na empresa (ativo imobilizado) e não para revenda, MG pode cobrar o DIFAL sobre a diferença entre a alíquota interestadual (12%) e a alíquota interna de MG para aquele produto. Consulte um contador para verificar se o produto tem substituição tributária (que muda a regra) e qual o valor do DIFAL a recolher.

---

### CHUNK D.3 — Substituição Tributária de ICMS: impacto no varejista ME/EPP

**O que é:** regime em que o fabricante ou importador (substituto) paga antecipadamente o ICMS de toda a cadeia, incluindo a margem de revenda presumida do varejista. A base de cálculo usa o preço de pauta ou o MVA (Margem de Valor Agregado) fixado pelo Estado.

**Produtos comuns com ST:** refrigerantes, cervejas, cigarros, combustíveis, lubrificantes, tintas, cimentos, autopeças, medicamentos, produtos de limpeza, eletrodomésticos (varia por Estado — cada Estado tem lista própria de produtos sujeitos à ST).

**Impacto para ME/EPP varejista no Simples Nacional:**
- O ICMS-ST já vem embutido no preço da nota de compra — o varejista não recolhe ICMS adicional na saída
- No PGDAS (cálculo do DAS), o ICMS é **excluído** para as mercadorias com ST — o DAS é menor
- A alíquota efetiva do DAS cai porque o ICMS já foi pago pelo fabricante

**Direito à restituição (STF, RE 593.849 — Tema 201):** se o varejista vender por preço efetivo *inferior* ao presumido pelo Estado na base de cálculo da ST, tem direito à restituição do ICMS-ST pago a maior. O pedido é feito à Secretaria de Fazenda do Estado de domicílio. Vigência da tese: a partir de 19/10/2016 (modulação do STF).

**Atenção — compra com ST de fornecedor de outro Estado:** pode haver ST interestadual, em que o próprio fornecedor recolhe o ICMS-ST para o Estado de destino. Nesse caso, o varejista não recolhe nada separado — mas deve verificar se o Estado de destino reconhece a ST recolhida pelo fornecedor ou se exige complemento.

---

### Q&A D.3 — Substituição Tributária

**P: Compro produtos com substituição tributária para revender. Tenho que pagar ICMS na venda?**
**R:** Não. O ICMS já foi pago pelo fabricante ou importador sobre o valor presumido de revenda. Na sua venda ao consumidor final, não há novo ICMS a recolher. No cálculo do DAS, o ICMS é excluído para essas mercadorias — seu DAS fica menor. Se você vender por preço menor do que o presumido pelo Estado, pode pedir restituição do ICMS-ST pago a maior.

**P: Vendo bebidas e cigarros. O fornecedor já me entrega a nota com o ICMS-ST destacado. Preciso fazer algo a mais?**
**R:** No Simples Nacional, não há ICMS adicional a recolher na saída. Mas você precisa: (1) informar corretamente no PGDAS que as receitas são de mercadoria com ST, para excluir o ICMS do DAS; (2) guardar as notas de compra com o ICMS-ST destacado — elas são a prova de que o imposto já foi recolhido. Errar na classificação no PGDAS pode gerar pagamento duplicado ou auto de infração.

**P: Posso pedir restituição do ICMS-ST se vendi abaixo do preço presumido?**
**R:** Sim, a partir de outubro de 2016 (decisão do STF). O processo é administrativo junto à Secretaria de Fazenda do seu Estado — cada Estado tem formulário e procedimento próprio. Você precisa comprovar que vendeu efetivamente abaixo da base de cálculo presumida (registros fiscais, NF-es de saída). Consulte um contador especializado em ICMS para verificar se vale a pena pelo volume envolvido.

---

*Complemento 2 — 04/06/2026 | Fontes: EC 87/2015, STF RE 970821/RS (DIFAL Simples), STF RE 593.849 Tema 201 (restituição ICMS-ST), LC 87/1996 (Lei Kandir), LC 123/2006, Resolução CGSN 140/2018*

---

## COMPLEMENTO 3 — Ciclo de Vida do MEI e Exclusão do Simples Nacional
*Adicionado em 05/06/2026 — revisão de cobertura RAG v2.0*

---

### CHUNK E.1 — Baixa e Cancelamento do MEI
> **Perfis atendidos:** MEI

O MEI pode encerrar suas atividades a qualquer momento pela internet, no Portal do Empreendedor (gov.br/mei). O processo é gratuito e instantâneo — mas há condições que podem bloquear ou complicar a baixa.

**O que bloqueia a baixa do MEI:**
- DAS em atraso: débitos pendentes no Simples Nacional impedem a conclusão da baixa regular. O sistema exige a regularização prévia ou o ingresso em parcelamento.
- Funcionário CLT ativo: é necessário encerrar o vínculo empregatício antes da baixa (demissão com pagamento de verbas rescisórias, baixa na CTPS, recolhimento do FGTS).

**O que acontece com os DAS em atraso após a baixa:**
A baixa do MEI não extingue as dívidas tributárias. Os débitos do DAS continuam existindo e podem ser cobrados pela Receita Federal mesmo depois do cancelamento — inclusive com inscrição em dívida ativa, negativação e execução fiscal. A única diferença é que, após a baixa, o CNPJ fica inativo e não gera novos DAS.

**Opções para MEI com dívidas que quer fechar:**
1. Parcelar os DAS em atraso pelo portal do Simples Nacional (até 60 meses) e depois realizar a baixa
2. Solicitar a baixa mesmo com dívidas (o sistema permite em alguns casos) — mas as dívidas persistem e o CPF do titular pode ser vinculado à cobrança
3. Verificar se há débitos prescritos (mais de 5 anos sem lançamento ou sem execução fiscal) — esses podem ser questionados

**Certidão negativa após baixa:** necessária para provar regularidade em financiamentos, contratos públicos etc. Só é obtida se não houver débitos em aberto.

---

### Q&A E.1 — Baixa do MEI

**P: Tenho DAS em atraso. Consigo fechar meu MEI?**
R: Depende do valor e da situação. O portal do Empreendedor pode bloquear a baixa se houver débitos. A alternativa é parcelar os DAS pelo portal do Simples Nacional (até 60 meses, entrada mínima de 5%) para regularizar a situação e então dar a baixa. Se os débitos forem antigos (mais de 5 anos), consulte um contador — pode haver prescrição.

**P: Fechei meu MEI mas ainda recebi cobrança de DAS depois. É legal?**
R: Sim. A baixa encerra as atividades e impede novos DAS, mas os débitos anteriores continuam existindo. A Receita Federal pode cobrar esses valores mesmo após o cancelamento do CNPJ, inclusive por execução fiscal contra o CPF do titular.

**P: Tenho um funcionário no MEI. Posso fechar antes de demiti-lo?**
R: Não é recomendado. A baixa do MEI com vínculo empregatício ativo pode gerar problemas trabalhistas — o funcionário pode alegar rescisão indireta e exigir todas as verbas. O correto é encerrar o contrato de trabalho regularmente (aviso prévio, pagamento das verbas rescisórias, baixa na CTPS e FGTS) antes de dar a baixa no MEI.

---

### CHUNK E.1-B — Alteração de CNAE/Atividade do MEI
> **Perfis atendidos:** MEI

O MEI pode alterar a atividade (CNAE) a qualquer momento, pelo Portal do Empreendedor (gov.br/mei) → "Já sou MEI" → "Atualização Cadastral". O processo é gratuito, on-line, e gera um novo CCMEI automaticamente após a confirmação.

**Limites:** a nova atividade principal e até 15 atividades secundárias precisam estar na lista de ocupações permitidas ao MEI (mesma lista usada na abertura — Portal do Empreendedor). Atividade fora da lista (ex.: profissão regulamentada) não pode ser incluída.

**Atenção municipal:** alterar o CNAE pode mudar o alvará/licença exigidos pela prefeitura (cada atividade tem exigências próprias) — verifique com o município se a alteração exige novo alvará antes de começar a operar na nova atividade.

---

### Q&A E.1-B — Mudança de CNAE

**P: Quero trocar a atividade do meu MEI. Como faço e tem custo?**
R: Gratuito, pelo Portal do Empreendedor (gov.br/mei) → "Já sou MEI" → "Atualização Cadastral" → login gov.br. Escolha a nova atividade principal (e secundárias, até 15) dentro da lista permitida ao MEI. Um novo CCMEI é emitido na hora.

**P: Troquei o CNAE do MEI. Preciso fazer mais alguma coisa?**
R: Verifique com a prefeitura se a nova atividade exige alvará ou licença diferente da que você já tinha — cada atividade tem exigências próprias, e isso varia por município.

---

### CHUNK E.2 — Estouro do Limite de Faturamento do MEI
> **Perfis atendidos:** MEI

O MEI tem limite de faturamento anual de **R$ 81.000** (R$ 6.750/mês em média). Ultrapassar esse limite tem consequências tributárias imediatas e obriga o reenquadramento.

**O que acontece quando o MEI ultrapassa R$ 81.000/ano:**

- **Estouro de até 20% (até R$ 97.200):** o MEI permanece no SIMEI durante o ano do estouro e continua pagando o DAS normalmente. No ano seguinte (via DASN, entregue em janeiro), calcula e paga o **DAS Complementar** sobre o valor que excedeu R$ 81.000 — aplicando as mesmas alíquotas do Simples Nacional ao excedente. A exclusão do SIMEI tem efeito a partir de **1º de janeiro do ano seguinte**.
- **Estouro acima de 20% (acima de R$ 97.200):** exclusão retroativa a **1º de janeiro do ano corrente** (art. 18-A, §15 da LC 123/2006). O MEI é tratado como ME desde o início do ano — deve recalcular todos os tributos como ME no Simples Nacional para o ano inteiro, com diferença a pagar acrescida de juros e multa. Não retroage apenas ao mês do estouro: retroage ao ano inteiro.

**Reenquadramento obrigatório:**
O MEI deve solicitar o reenquadramento como ME no portal do Simples Nacional. A transição exige: inscrição estadual (para comércio/indústria), adequação do sistema de emissão de notas fiscais, início de apuração do DAS pelo Anexo correto da LC 123/2006.

**Como monitorar o faturamento:**
Acompanhe mensalmente. Se perceber que vai ultrapassar o limite no ano, planeje com antecedência: conversar com um contador para entender o impacto tributário antes de fechar novos contratos ou vendas.

---

### Q&A E.2 — Estouro do Limite MEI

**P: Faturei R$ 90.000 este ano como MEI. O que acontece?**
R: Estouro de até 20% (R$ 81.000 × 1,2 = R$ 97.200). Você continua MEI durante o ano e paga o DAS normalmente até dezembro. Em janeiro do ano seguinte, ao entregar a DASN, o sistema calcula o **DAS Complementar** sobre os R$ 9.000 que excederam o limite — aplicando as alíquotas do Simples Nacional ao excedente. A partir de 1º de janeiro do ano seguinte, você já não é mais MEI e entra como ME no Simples Nacional. Cuide do reenquadramento com um contador antes de chegar nessa data.

**P: Faturei R$ 120.000 este ano como MEI. É diferente?**
R: Sim — estouro acima de 20%. A exclusão do SIMEI retroage a **1º de janeiro do ano corrente inteiro** — não apenas ao mês em que o excesso ocorreu. Você é tratado como ME para o ano todo e deve recalcular todos os tributos como Simples Nacional desde janeiro, pagando a diferença com juros e multa. Procure um contador imediatamente — quanto antes regularizar, menor o custo.

**P: Como sei que vou ultrapassar o limite antes do fim do ano?**
R: Divida R$ 81.000 pelo número de meses que faltam no ano. Se a média mensal prevista superar esse valor, você vai extrapolar. Monitore mensalmente. Se perceber o risco em julho, por exemplo, ainda dá tempo de planejar com o contador e evitar o estouro acima de 20% (o mais prejudicial).

---

### CHUNK E.3 — Exclusão do Simples Nacional
> **Perfis atendidos:** ME / EPP

A exclusão do Simples Nacional pode ser de ofício (pela Receita Federal) ou por comunicação do próprio contribuinte. Saber reconhecer os motivos e as consequências é essencial para ME e EPP.

**Causas de exclusão de ofício (principais):**
- Faturamento que ultrapasse R$ 4,8M/ano (limite EPP)
- Débitos tributários não parcelados e não regularizados
- Exercício de atividade vedada ao Simples (lista negativa da LC 123/2006 — ex.: bancos, factoring, certas sociedades de advogados)
- Irregularidade cadastral grave
- Ausência de inscrição estadual ou municipal quando obrigatória

**Efeitos da exclusão:**
- A exclusão de ofício produz efeitos a partir do primeiro dia do ano seguinte, salvo em casos graves (fraude, irregularidade cadastral) — nestes, retroage ao início do ano ou da irregularidade
- A empresa passa a ser tributada pelo Lucro Presumido (regra geral) ou Lucro Real, com obrigações acessórias mais densas (SPED, DCTF, EFD)
- O DAS é substituído por recolhimentos separados de IRPJ, CSLL, PIS, COFINS, ICMS ou ISS e CPP

**O que fazer ao receber notificação de exclusão:**
1. Verificar o motivo na notificação (disponível no portal do Simples Nacional)
2. Se o motivo for débito: regularizar (pagamento ou parcelamento) dentro do prazo indicado para cancelar a exclusão
3. Se o motivo for atividade vedada ou irregularidade: avaliar com contador se há como corrigir ou se a exclusão é definitiva
4. STF/STJ: exclusão sem notificação prévia é inconstitucional — se não foi notificado, é possível contestar

**Reingresso no Simples Nacional:**
Após regularização, a empresa pode solicitar novo ingresso no Simples em janeiro do ano seguinte (prazo: até 31 de janeiro). A solicitação é feita pelo portal do Simples Nacional.

---

### Q&A E.3 — Exclusão do Simples Nacional

**P: Recebi aviso de que minha empresa será excluída do Simples. Tenho prazo para regularizar?**
R: Sim. A notificação de exclusão por débito geralmente dá prazo para regularização (pagamento ou parcelamento) antes da exclusão se efetivar. Acesse o portal do Simples Nacional, verifique o motivo e regularize dentro do prazo indicado. Se regularizar a tempo, a exclusão é cancelada automaticamente. Não ignore a notificação — exclusão do Simples significa aumento significativo de carga tributária.

**P: Fui excluído do Simples sem receber nenhum aviso. Isso é válido?**
R: Não. O STF (RE 669196) decidiu que a exclusão sem notificação prévia é inconstitucional. Você tem direito de ser comunicado e ter oportunidade de regularizar. Se foi excluído sem aviso, leve ao seu contador ou advogado — há precedente para contestar judicialmente e pedir reinclusão com efeito retroativo.

**P: Minha empresa foi excluída do Simples. Como fico tributado agora?**
R: Regra geral: Lucro Presumido, com tributação separada de IRPJ (15% + 10% sobre o que exceder R$ 20.000/mês), CSLL (9%), PIS (0,65%), COFINS (3%), ICMS ou ISS conforme o Estado/Município. A carga tributária aumenta significativamente e surgem novas obrigações acessórias (SPED, DCTF). Consulte um contador imediatamente para fazer a transição de forma correta e avaliar se Lucro Presumido ou Lucro Real é mais vantajoso para o seu caso.

---

### CHUNK E.4 — Encerramento de ME/EPP (Distrato, Baixa e Responsabilização dos Sócios)
> **Perfis atendidos:** ME / EPP

Encerrar uma ME ou EPP é mais formal do que dar baixa num MEI: existe sociedade (ou sócio único, no caso da SLU), contrato social e responsabilidade patrimonial em jogo. O processo segue uma sequência obrigatória — distrato social (ou ata de dissolução, na SLU) → registro na Junta Comercial → baixa do CNPJ na Receita Federal — hoje integrada pela Redesim em um único fluxo digital. Pular etapas, fechar com funcionários ainda contratados ou deixar dívidas sem equacionar não impede o registro da baixa, mas pode transferir a cobrança e a responsabilidade para o CPF dos sócios.

**Passo a passo (visão geral):**
1. **Decisão e distrato social**: os sócios formalizam a dissolução por escrito, definem o liquidante (responsável por apurar ativos, pagar passivos e partilhar o saldo) e o destino dos livros contábeis (Código Civil, arts. 1.033 a 1.038 e 1.102 e ss.). Na SLU, o titular único assina sozinho um instrumento equivalente.
2. **Registro na Junta Comercial**: o distrato deve ser levado a registro em até 30 dias da assinatura — os efeitos retroagem a essa data. Custo de registro: varia por estado — consulte a Junta Comercial local.
3. **Baixa do CNPJ via Redesim**: solicitação integrada (evento "pedido de baixa por encerramento de liquidação voluntária") perante Junta Comercial e Receita Federal, dispensando trâmites separados em cada órgão.
4. **Baixas acessórias**: inscrição estadual, inscrição municipal e alvarás também precisam ser encerrados — geralmente arrastados pela integração da Redesim, mas vale confirmar com o contador.

**O que bloqueia ou complica o encerramento:**
- **Funcionários com vínculo ativo**: a baixa não é tecnicamente impedida por isso, mas fechar com contratos em aberto cria risco trabalhista alto (ver abaixo).
- **Dívidas tributárias, previdenciárias ou municipais em aberto**: desde a integração do Sistema Nacional de Baixa Integrada, a certidão negativa de débitos deixou de ser pré-requisito para registrar a baixa — é possível encerrar mesmo com pendências. Isso resolve o trâmite registral, mas não resolve a dívida (ver próximo bloco).
- **Pendências em outros órgãos** (alvará vencido, inscrição municipal irregular, licenças específicas do ramo): podem não impedir o registro da baixa em si, mas geram cobranças e autuações que continuam ativas mesmo após o fechamento.
- **Prazo realista**: varia por estado e situação — sem pendências, o processo costuma ser relativamente rápido; com pendências fiscais, contábeis ou documentais, pode se estender consideravelmente. Confirme na Junta Comercial do seu estado.

### Fechar ME/EPP COM dívidas — o que sobra para os sócios (diferença essencial vs. MEI)

**O que acontece com dívidas e obrigações que sobram — e a diferença essencial em relação ao MEI:**
A baixa do registro **não extingue obrigações** — nem tributárias, nem trabalhistas, nem civis (LC 123/2006, art. 9º, §§ 4º e 5º). A diferença para o MEI está em **quem responde** depois:
- **Responsabilidade tributária**: por força do art. 135 do CTN, o sócio-gerente ou administrador pode responder solidariamente pelos tributos resultantes de atos com excesso de poderes ou infração de lei — independentemente de qualquer processo de "desconsideração". Pelo art. 134, VII, do CTN, sócios liquidantes respondem subsidiariamente quando impossível cobrar da empresa (o STJ interpreta o art. 134 como subsidiária, a despeito do texto legal dizer "solidária"). O STJ já decidiu que a baixa do registro não impede a execução fiscal contra o sócio.
- **Responsabilidade trabalhista**: dívidas de verbas rescisórias, FGTS e encargos não pagos podem ser cobradas da sociedade e, em ações na Justiça do Trabalho, alcançar o patrimônio dos sócios — esse ramo da Justiça tende a aplicar a responsabilização de forma mais ampla do que a esfera cível.
- **Responsabilidade civil/empresarial (desconsideração da personalidade jurídica)**: aqui a régua é mais alta do que costuma circular no senso comum. Em maio de 2026, o STJ fixou — em julgamento de recursos repetitivos (Tema 1.210) — que **o simples encerramento irregular da empresa, isoladamente, não autoriza a desconsideração da personalidade jurídica**: é preciso provar abuso concreto, caracterizado por desvio de finalidade ou confusão patrimonial entre sócio e empresa (Código Civil, art. 50). Ou seja: encerrar errado é arriscado, mas não significa, por si só, que o sócio "vai responder com o patrimônio pessoal" — o que muda o tom de qualquer alerta nesse sentido (a tese foi fixada após anos de divergência: a ministra Nancy Andrighi, inclusive, defendeu posição mais rigorosa, vencida por maioria). **Atenção:** essa tese se aplica à esfera civil/empresarial (CC, art. 50). Outros ramos têm régua própria — tributário (CTN, arts. 134 e 135), relações de consumo (CDC) e responsabilidade ambiental seguem regras específicas que independem do Tema 1.210.

Em resumo: regularizar o quanto possível antes de fechar reduz a exposição pessoal — mas mesmo o fechamento "perfeito" não apaga dívidas que já existiam, elas só deixam de gerar novos encargos.

### Encerramento: filial × empresa toda · voluntário × inatividade × falência · certidões negativas

**Filial vs. empresa toda:**
Encerrar uma filial é um procedimento próprio (baixa de inscrição de estabelecimento secundário, com prazo de até o 5º dia útil do segundo mês após o evento) e não encerra a matriz nem as demais unidades. Na baixa da filial, a análise de pendências fiscais é feita em nome da matriz — ou seja, dívidas da matriz podem travar a baixa de uma filial regular, e vice-versa.

**Encerramento voluntário x dissolução por inatividade x recuperação judicial/falência — até onde vai a JUDITH:**
- **Encerramento voluntário** (o cenário mais comum para ME/EPP): fluxo descrito acima — JUDITH orienta normalmente.
- **Dissolução por inatividade / "empresa fechou, mas ninguém deu baixa"**: no começo o impacto parece pequeno — mas o tempo trabalha contra o sócio. Nos primeiros meses, acumulam-se multas por obrigações não entregues e declarações em atraso. Com 1 a 2 anos, dívidas tributárias crescem com juros e multa; o CNPJ pode ser suspenso, gerando restrições no CPF dos sócios. Depois de 3 anos, o risco de enquadramento como encerramento irregular aumenta de forma relevante: cobranças continuam rodando, a exposição em disputas judiciais cresce e a possibilidade de execução fiscal contra os sócios se torna real. JUDITH deve deixar claro esse processo de escalada e recomendar regularizar a baixa o quanto antes — não existe "deixar quieto" sem custo.
- **Recuperação judicial / falência**: quando as dívidas são maiores do que o patrimônio da empresa consegue pagar, o caminho não é mais "fechar a empresa" — é outro processo, com rito judicial específico. **Recuperação judicial** é quando a empresa ainda tem atividade e pede proteção ao juiz para reorganizar as dívidas e continuar funcionando: os credores negociam dentro de um plano aprovado pela Justiça. **Falência** é quando a recuperação não é viável: a empresa encerra as atividades, os bens são liquidados e o valor arrecadado é distribuído aos credores em ordem legal. Esses caminhos seguem a Lei 11.101/2005 e exigem estratégia jurídica, prazos processuais e negociação com credores — o que vai além do que a JUDITH pode orientar. Por isso, nesse cenário, a JUDITH explica a diferença ao usuário e encaminha obrigatoriamente para advogado especializado em recuperação de empresas, com apoio de contador.

**Certidões negativas no processo de encerramento:**
Mesmo não sendo mais pré-requisito para registrar a baixa, certidões negativas (federal, estadual, municipal, FGTS, trabalhista) seguem sendo necessárias para: encerrar contratos com cláusulas de regularidade fiscal, quitar financiamentos, transferir bens em nome da empresa, e provar a terceiros que a sociedade fechou "limpa". Vale levantar essas certidões durante o processo — não depois.

---

### Q&A E.4 — Encerramento de ME/EPP

**P: Como funciona, na prática, o passo a passo para fechar minha ME/LTDA?**
R: Primeiro, os sócios assinam o distrato social (definindo quem cuida da liquidação e o que acontece com ativos e passivos). Esse documento vai a registro na Junta Comercial em até 30 dias da assinatura — o custo varia por estado, então confirme direto na Junta Comercial local. Em seguida, a baixa do CNPJ é feita de forma integrada pela Redesim junto à Receita Federal. Os prazos variam por estado e pela situação da empresa: sem pendências, costuma ser relativamente rápido; com pendências fiscais ou documentais, pode se estender consideravelmente. Confirme prazos e custos exatos com a Junta Comercial do seu estado ou com um contador.

**P: Tenho dívidas de Simples Nacional/ICMS/ISS em aberto. Consigo fechar mesmo assim?**
R: Sim — hoje você consegue registrar a baixa mesmo com débitos em aberto, porque a certidão negativa deixou de ser exigência prévia para o registro. Mas isso resolve só o trâmite: a dívida continua existindo e pode ser cobrada de você e dos demais sócios depois do fechamento, com possibilidade de execução fiscal contra o CPF de cada um. Se o valor permitir, costuma valer mais a pena negociar ou parcelar antes de fechar — isso reduz a chance de a cobrança "seguir" os sócios individualmente. Para dívidas maiores, vale conversar com um contador sobre o impacto de cada caminho antes de decidir.

**P: Tenho funcionários registrados. Posso demiti-los na hora de fechar a empresa, ou preciso fazer isso antes?**
R: Faça antes — e com todas as formalidades. A rescisão precisa ocorrer com pagamento das verbas rescisórias em até 10 dias corridos do fim do contrato, recolhimento do FGTS, baixa na carteira de trabalho digital e entrega da documentação (TRCT, guias, chave de liberação do FGTS). Fechar a empresa com vínculos ainda ativos — ou rescindir de forma incompleta — é uma das formas mais diretas de gerar passivo trabalhista: o ex-funcionário pode acionar a Justiça do Trabalho, e esse é um dos ramos onde a responsabilização pessoal dos sócios tende a ser aplicada com menos resistência. Recomende sempre apoio de contador ou profissional de departamento pessoal para essa etapa.

**P: Se eu fechar a empresa, posso ser responsabilizado pessoalmente pelas dívidas que sobrarem?**
R: Depende do tipo de dívida — não existe uma resposta única. Em dívidas tributárias, a lei já prevê a possibilidade de o sócio-administrador responder pessoalmente (art. 134, VII, do CTN), e o STJ confirmou que a baixa do registro não impede a cobrança contra o sócio. Em dívidas trabalhistas, a Justiça do Trabalho também tende a alcançar o patrimônio pessoal com relativa facilidade quando a empresa não tem mais bens. Já no campo civil/empresarial — contratos, fornecedores, etc. — a régua é mais alta: o STJ decidiu, em maio de 2026 (Tema 1.210 — REsp 1.873.187/SP e REsp 1.873.811/SP), que só o fato de ter encerrado "errado" não é suficiente para o juiz desconsiderar a personalidade jurídica e ir atrás do patrimônio pessoal — é preciso provar abuso concreto (desvio de finalidade ou mistura entre as contas da empresa e as suas). Resumindo: encerrar do jeito certo não é só formalidade — reduz exposição real, principalmente nas frentes tributária e trabalhista, mesmo que não elimine dívidas existentes.

---

*Complemento 3 — 05/06/2026 (atualizado 08/06/2026 com CHUNK E.4; revisado 09/06/2026) | Fontes: LC 123/2006 (arts. 9º §§4º-5º, 28-32), CTN (arts. 134 VII e 135), CC (arts. 1.033-1.038, 1.102 e ss.), STJ Tema 1.210 (desconsideração — REsp 1.873.187/SP e REsp 1.873.811/SP, 07/05/2026), STJ Tema 962 (sócio retirante), Lei 11.101/2005, Resolução CGSN 140/2018, STF RE 669196, Portal do Empreendedor (baixa MEI), IN RFB 2.110/2022*
