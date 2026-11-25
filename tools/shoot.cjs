// Uso: node tools/shoot.cjs <url-query> <salida.png> [dpr]
const { chromium } = require('playwright');
(async () => {
  const [, , query, out, dpr] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: Number(dpr || 1) });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:5173/' + query);
  await p.waitForFunction(() => window.__done === true || document.querySelector('#__err'), null, { timeout: 60000 }).catch(() => {});
  await p.screenshot({ path: out });
  if (errs.length) console.log('ERRORS:', errs.join('\n'));
  await b.close();
})();
