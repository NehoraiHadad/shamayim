// test: CDP virtual time stepping on the live app (deterministic frame capture)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.85, locale: 'he-IL' });
  const p = await ctx.newPage();
  await p.goto('https://sky.nehoraihadad.com/', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(3000);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  const step = (ms) => new Promise((res) => { cdp.once('Emulation.virtualTimeBudgetExpired', res); cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms }); });
  const t0 = Date.now();
  for (let i = 0; i < 300; i++) {
    await step(1000/30);
    const n = await p.evaluate(() => document.querySelector('[data-life]')?.innerHTML.length ?? -1);
    if (i % 30 === 0) { await p.screenshot({ path: `vt-${i}.jpg`, quality: 85, clip: { x: 0, y: 0, width: 390, height: 470 } }); console.log(i, 'life', n, ((Date.now()-t0)/1000).toFixed(1)+'s'); }
  }
  await b.close();
})();
