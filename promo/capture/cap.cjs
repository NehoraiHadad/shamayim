const { chromium } = require('playwright');
const places = {
 hfa:{id:'hfa',nameHe:'חיפה',regionHe:'כרמל',lat:32.813,lon:34.9993,timezone:'Asia/Jerusalem'},
 tlv:{id:'tlv',nameHe:'תל אביב-יפו',regionHe:'גוש דן',lat:32.0809,lon:34.7806,timezone:'Asia/Jerusalem'},
 jlm:{id:'jlm',nameHe:'ירושלים',regionHe:'ירושלים',lat:31.769,lon:35.2163,timezone:'Asia/Jerusalem'},
};
const at = process.argv[2] || '2026-11-19T16:05:00+02:00';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  for (const [k,pl] of Object.entries(places)) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'he-IL' });
    await ctx.addInitScript(`localStorage.setItem('shamayim:place:v1', ${JSON.stringify(JSON.stringify(pl))});
      (() => { const R = Date, off = R.parse(${JSON.stringify(at)}) - R.now();
      class S extends R { constructor(...a) { super(...(a.length ? a : [R.now() + off])) } static now() { return R.now() + off } }
      window.Date = S })()`);
    const p = await ctx.newPage();
    await p.goto('https://sky.nehoraihadad.com/', { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(10000);
    const tag = at.slice(11,16).replace(':','');
    await p.screenshot({ path: `${k}-${tag}.png` });
    await ctx.close();
  }
  await b.close();
})();
