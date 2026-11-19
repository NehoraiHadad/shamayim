// Frame times of a turning-view drag (docs/design/TURN-VIEW-PLAN.md §5).
// Usage: npm run build && npx vite preview --port 5174 & then
//   PORT=5174 RATE=4 node scripts/turn-perf.cjs ['<Place JSON>']   (IDLE=1: no drag, the baseline)
// The forecast is the recorded fixture; CPU throttled RATE× (default 4).
const { chromium } = require('playwright')
const fs = require('fs')
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const fixture = fs.readFileSync('src/test/fixtures/forecast-multi-2026-11-17.json')
  await page.route(/\/v1\/forecast/, r => r.fulfill({ status: 200, contentType: 'application/json', body: fixture }))
  await page.route(/air-quality|rainviewer|eumetsat/, r => r.fulfill({ status: 503, body: '{}' }))
  if (process.argv[2]) await page.addInitScript(p => localStorage.setItem('shamayim:place:v1', p), process.argv[2])
  await page.goto(`http://localhost:${process.env.PORT || 5174}/?view=turn`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(14000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.RATE || 4) })
  await page.evaluate(() => {
    window.__f = []; let last = performance.now()
    const tick = (t) => { window.__f.push(t - last); last = t; if (window.__f.length < 400) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
  if (process.env.IDLE) await page.waitForTimeout(2500)
  else {
    const c = await page.locator('[aria-label="כיוון המבט"]').boundingBox()
    await page.mouse.move(c.x + 300, c.y + 12); await page.mouse.down()
    for (let i = 0; i < 60; i++) { await page.mouse.move(c.x + 300 - i * 4, c.y + 12); await page.waitForTimeout(16) }
    await page.mouse.up()
  }
  await page.waitForTimeout(300)
  const f = await page.evaluate(() => window.__f.slice(5))
  const s = [...f].sort((a, b) => a - b), q = (p) => s[Math.floor(s.length * p)].toFixed(1)
  console.log(`frames ${f.length}  p50 ${q(.5)} ms  p90 ${q(.9)} ms  max ${s.at(-1).toFixed(1)} ms`)
  await browser.close()
})()
