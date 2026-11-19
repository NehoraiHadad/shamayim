const { chromium } = require('playwright');
const places = {
 sdm:{id:'shadmot-mehola',nameHe:'שדמות מחולה',regionHe:'בקעת הירדן',lat:32.348,lon:35.535,timezone:'Asia/Jerusalem'},
};
const target = process.argv[2] || '16:05';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  for (const [k,pl] of Object.entries(places)) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'he-IL' });
    await ctx.addInitScript(`localStorage.setItem('shamayim:place:v1', ${JSON.stringify(JSON.stringify(pl))})`);
    const p = await ctx.newPage();
    await p.goto('https://sky.nehoraihadad.com/', { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(8000);
    const s = await p.locator('[role=slider][aria-label="שעה בעמק"]').boundingBox();
    const y = s.y + s.height/2; let x = s.x + s.width - 8;
    const now = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Jerusalem'}));
    const [th,tm] = target.split(':').map(Number);
    let mins = th*60+tm - (now.getHours()*60+now.getMinutes()); if (mins<0) mins+=1440;
    const px = mins/4;
    await p.mouse.move(x,y); await p.mouse.down();
    const steps = Math.ceil(px/1.5);
    for (let i=1;i<=steps;i++){ await p.mouse.move(x - px*i/steps, y); await p.waitForTimeout(16); }
    await p.waitForTimeout(1500);
    const v = await p.locator('[role=slider][aria-label="שעה בעמק"]').getAttribute('aria-valuetext');
    console.log(k, 'moved', mins, 'min ->', v);
    await p.screenshot({ path: `${k}-scrub-${target.replace(':','')}.png` });
    await p.mouse.up();
    await ctx.close();
  }
  await b.close();
})();
