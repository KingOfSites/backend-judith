// Controles de escopo da auditoria com o fornecedor REAL configurado. Não roda no `npm test`.
// Cada caso tem uma resposta "bad" (tem de ser reprovada) e uma "good" (tem de ser aprovada).
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(process.env.JUDITH_TEST_DIST || path.join(__dirname, '../dist')) + path.sep;
const replace = (id, exports) => { require.cache[require.resolve(id)] = { id: require.resolve(id), filename: require.resolve(id), loaded: true, exports }; };
replace(base + 'config/env.js', { env: {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  JUDITH_MODEL_HAIKU: process.env.JUDITH_MODEL_HAIKU || 'gemini-3.8-flash', JUDITH_MODEL_SONNET: 'gpt-4.1', JUDITH_MODEL_FALLBACK: process.env.JUDITH_MODEL_FALLBACK ?? 'gpt-4.1-mini',
} });
const { verifySupport, validateSupport } = require(base + 'knowledge/support.js');

(async () => {
  const linhas = [];
  let certos = 0, total = 0, vazou = 0, bloqueouBoa = 0, indisponivel = 0;
  for (const arquivo of ['utility-scope-regression.json', 'utility-pending-scope-regression.json']) {
    const casos = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', arquivo), 'utf8'));
    for (const c of casos) {
      for (const tipo of ['bad', 'good']) {
        if (typeof c[tipo] !== 'string') continue;
        total++;
        const esperado = tipo === 'good';
        let obtido, erro = '';
        const t = Date.now();
        try { obtido = (await verifySupport(c.question, [], c[tipo], c.chunks)).supported; }
        catch (e) { obtido = null; erro = e.code || e.message; indisponivel++; }
        const ok = obtido === esperado;
        if (ok) certos++;
        else if (obtido === true && !esperado) vazou++;
        else if (obtido === false && esperado) bloqueouBoa++;
        linhas.push(`${ok ? 'OK    ' : 'DIVERGE'} ${String(Date.now() - t).padStart(5)}ms ${arquivo.replace('-scope-regression.json', '')} ${c.id} [${tipo}] esperado=${esperado} obtido=${obtido} ${erro}`);
      }
    }
  }
  // Barreira do "direito ao esquecimento": o voto do modelo não basta.
  const fonte = 'O titular pode pedir a eliminação dos dados pessoais tratados com consentimento, ressalvadas as hipóteses legais de conservação.';
  const resposta = 'O titular pode pedir a eliminação dos dados tratados com consentimento; a lei chama isso de direito ao esquecimento.';
  const chunk = { id: 'barrier-fixture', content: fonte };
  const real = await verifySupport('Pela LGPD, um cliente pode pedir a eliminação de dados?', [], resposta, [chunk]).catch(e => ({ supported: null, erro: e.code }));
  const forcado = { units: [{ index: 0, supported: true, conversational: false, evidence: [{ chunkId: chunk.id, quote: fonte }] }] };

  console.log(linhas.join('\n'));
  console.log(`\nmodelo auditor: ${process.env.JUDITH_MODEL_HAIKU || 'gemini-3.8-flash'}`);
  console.log(`controles: ${certos} de ${total} conforme o esperado`);
  console.log(`  respostas ruins que PASSARAM (grave): ${vazou}`);
  console.log(`  respostas boas bloqueadas (conservador): ${bloqueouBoa}`);
  console.log(`  auditor indisponível: ${indisponivel}`);
  console.log(`barreira do esquecimento: real=${real.supported} | voto forçado bloqueado=${!validateSupport(resposta, [chunk], forcado)}`);
  process.exit(vazou || real.supported === true ? 1 : 0);
})();
