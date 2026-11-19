const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale:'he-IL', recordVideo: { dir: 'lifevid', size: { width: 390, height: 844 } } });
  const p = await ctx.newPage();
  await p.goto('https://sky.nehoraihadad.com/', { waitUntil: 'networkidle', timeout: 90000 });
  const t0 = Date.now();
  for (let i = 0; i < 45; i++) {
    const n = await p.evaluate(() => { const l = document.querySelector('[data-life]'); return l ? l.innerHTML.length : -1; });
    if (n > 0) console.log('life at', ((Date.now()-t0)/1000).toFixed(1), 's, html', n, await p.evaluate(() => document.querySelector('[data-life]').innerHTML.slice(0,200)));
    await p.waitForTimeout(1000);
  }
  await ctx.close(); await b.close();
})();
