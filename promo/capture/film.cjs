// Captures the film's footage from the live app, frame by frame, on CDP virtual time (so every frame is exactly
// 1/30 s of the app's own clock, whatever the machine's speed). The scrub is a real pointer drag on the valley.
// Usage: node capture/film.cjs            (writes promo/assets/film/<seq>/t###.jpg (top) and b###.jpg (bottom))
// Top = CSS y 0..470 (place, number, line, strip, valley, clothesline top), every frame.
// Bottom = CSS y 470..844 (clothesline, wear line, week), every 4th frame (it barely changes).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'assets', 'film');
const DSF = 1.85, SPLIT = 470, FPS = 30;
const SDM = { id: 'shadmot-mehola', nameHe: 'שדמות מחולה', regionHe: 'בקעת הירדן', lat: 32.348, lon: 35.535, timezone: 'Asia/Jerusalem' };
const RANGE = {
  tlv: { id: 'tlv', nameHe: 'תל אביב-יפו', regionHe: 'גוש דן', lat: 32.0809, lon: 34.7806, timezone: 'Asia/Jerusalem' },
  hfa: { id: 'hfa', nameHe: 'חיפה', regionHe: 'כרמל', lat: 32.813, lon: 34.9993, timezone: 'Asia/Jerusalem' },
  jlm: { id: 'jlm', nameHe: 'ירושלים', regionHe: 'ירושלים', lat: 31.769, lon: 35.2163, timezone: 'Asia/Jerusalem' },
  mzr: { id: 'mzr', nameHe: 'מצפה רמון', regionHe: 'הר הנגב', lat: 30.6098, lon: 34.8017, timezone: 'Asia/Jerusalem' },
};
const only = process.argv[2]; // optional: capture one sequence

const open = async (b, place) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DSF, locale: 'he-IL' });
  await ctx.addInitScript(`localStorage.setItem('shamayim:place:v1', ${JSON.stringify(JSON.stringify(place))})`);
  const p = await ctx.newPage();
  await p.goto('https://sky.nehoraihadad.com/', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(2500); // fonts, terrain, the intro's first moments in real time
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  const step = (ms) => new Promise((res) => { cdp.once('Emulation.virtualTimeBudgetExpired', res); cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms }); });
  // pointer input waits for a rendered frame, so it must go out WITH a budget of virtual time
  const act = (fn) => Promise.all([fn(), step(1000 / 30)]);
  // raw CDP pointer events (Playwright's mouse waits for a frame that paused virtual time never paints)
  const mouse = (type, x, y) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  return { ctx, p, step, act, mouse };
};
const dirOf = (seq) => { const d = path.join(OUT, seq); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); return d; };
const shoot = async (p, d, i, bottom) => {
  const n = String(i).padStart(3, '0');
  await p.screenshot({ path: path.join(d, `t${n}.jpg`), type: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: 390, height: SPLIT } });
  if (bottom) await p.screenshot({ path: path.join(d, `b${n}.jpg`), type: 'jpeg', quality: 82, clip: { x: 0, y: SPLIT, width: 390, height: 844 - SPLIT } });
};
const ease = (u) => u * u * (3 - 2 * u);
const nowMin = () => { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })); return d.getHours() * 60 + d.getMinutes(); };

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const log = {};

  // 1. LIVE: Shadmot at rest, the crane V crossing (the app's own event; it starts 5-9 s after load, ~21 s across)
  if (only === 'live-alone') {
    const { ctx, p, step } = await open(b, SDM), d = dirOf('live');
    let waited = 0;
    while (waited < 20000) { await step(100); waited += 100; if (await p.evaluate(() => !!document.querySelector('[data-life-event]'))) break; }
    for (let k = 0; k < 75; k++) await step(100); // 7.5 s into the pass: the V is over the valley
    for (let i = 0; i < 80; i++) { await shoot(p, d, i, i % 4 === 0); await step(1000 / FPS); }
    log.live = { frames: 80, eventAfterMs: waited };
    await ctx.close();
  }

  // 2. DRAG: Shadmot, one held drag from now through the evening and night, then on to tomorrow's sunrise
  if (!only || only === 'drag') {
    const { ctx, p, step, act, mouse } = await open(b, SDM);
    // LIVE first, in the same page: the crane V crossing at rest, so the drag continues the very same sky
    if (process.env.WITH_LIVE) { const d = dirOf('live'); let waited = 0;
      while (waited < 20000) { await step(100); waited += 100; if (await p.evaluate(() => !!document.querySelector('[data-life-event]'))) break; }
      for (let k = 0; k < 60; k++) await step(100);
      for (let i = 0; i < 80; i++) { await shoot(p, d, i, i % 4 === 0); await step(1000 / FPS); }
      log.live = { frames: 80, eventAfterMs: waited }; }
    const box = await p.locator('[role=slider][aria-label="שעה בעמק"]').boundingBox();
    const y = box.y + box.height / 2, x0 = box.x + box.width - 6, now = nowMin(); log.now = now; log.x0 = x0; log.clock = {};
    const xAt = (clock) => { let m = clock - now; if (m < 0) m += 1440; return x0 - m / 4; }; // 4 min per px, RTL: left = later
    await act(() => mouse('mouseMoved', x0, y)); await act(() => mouse('mousePressed', x0, y));
    // the clock as keys, each [frame, minutes since midnight today]; >1440 is tomorrow
    const seqs = [
      { seq: 'day', keys: [[0, now], [16, now + 12], [110, 15 * 60 + 50], [190, 16 * 60 + 45], [240, 17 * 60 + 30]] },
      { seq: 'night', keys: [[0, 17 * 60 + 30], [80, 21 * 60 + 40]] },
      { seq: 'dawn', keys: [[0, 1440 + 5 * 60 + 55], [40, 1440 + 6 * 60 + 40], [60, 1440 + 6 * 60 + 52]] },
    ];
    for (const { seq, keys } of seqs) {
      const d = dirOf(seq), last = keys[keys.length - 1][0]; log.clock[seq] = [];
      // jump (uncaptured) to the sequence's first moment in small moves, so the app follows the pointer
      const from = xAt(keys[0][1] % 1440), cur = (await p.evaluate(() => 0)) || 0; void cur;
      await act(() => mouse('mouseMoved', from, y)); for (let k = 0; k < 20; k++) await step(1000 / FPS);
      for (let f = 0; f <= last; f++) {
        let j = 0; while (j < keys.length - 2 && f > keys[j + 1][0]) j++;
        const [fa, ca] = keys[j], [fb, cb] = keys[j + 1], u = ease(Math.min(1, (f - fa) / (fb - fa)));
        const clock = ca + (cb - ca) * u;
        await act(() => mouse('mouseMoved', xAt(clock % 1440), y)); log.clock[seq].push(Math.round(clock * 10) / 10);
        await shoot(p, d, f, f % 4 === 0);
      }
      log[seq] = { frames: last + 1, readout: await p.locator('[role=slider][aria-label="שעה בעמק"]').getAttribute('aria-valuetext') };
    }
    await act(() => mouse('mouseReleased', xAt(0), y));
    await ctx.close();
  }

  // 3. RANGE: four other places, each at rest, now
  if (!only || only === 'range') {
    for (const [k, place] of Object.entries(RANGE)) {
      const { ctx, p, step } = await open(b, place), d = dirOf(`range-${k}`);
      for (let i = 0; i < 30; i++) await step(100); // past the intro
      for (let i = 0; i < 20; i++) { await shoot(p, d, i, i % 4 === 0); await step(1000 / FPS); }
      log[`range-${k}`] = { frames: 20 };
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(__dirname, `log-${only || 'all'}.json`), JSON.stringify({ capturedAt: new Date().toISOString(), ...log }));
  console.log('ok', Object.keys(log).join(' '));
  await b.close();
})();
