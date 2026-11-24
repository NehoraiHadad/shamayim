import { buildingMasks } from './buildingMasks.mjs'
import { CLIP, launch, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'
const F = [.15, 1 / 6, .175, .1875].map(f => Math.round(f * 1e4) / 1e4)
const V = [
  ...F.flatMap(f => [2, 3, 4].map(decor => ({ f, decor }))),
  ...F.flatMap(f => [{ scale: .75 }, { scale: .9 }, { end: .75 }, { pitch: 1.25 }, { cap: 'px' }].map(o => ({ f, decor: 1, ...o }))),
  { f: .1667, decor: 1 }, { f: .1875, decor: 1 },
  ...F.flatMap(f => [2, 3].map(decor => ({ f, decor, cap: 'both' })))]
const cases = ['haifa-0620', 'haifa-1630', 'haifa-1200-overcast', 'tiberias-1200', 'haifa-1200', 'jerusalem-1200', 'tel-aviv-1200']
const browser = await launch()
for (const v of V) {
  process.env.VITE_TUNE = JSON.stringify(v)
  const server = await startServer()
  const row = [], alts = []
  for (const name of cases) {
    const [, place, time, weather] = /^(.+)-(\d{4})(?:-(overcast))?$/.exec(name)
    const { context, page } = await openPage(browser, server.url, 1)
    try {
      await loadScene(page, sceneUrl(server.url, { place, at: `2026-11-17T${time.slice(0, 2)}:${time.slice(2)}`, weather }))
      const png = await page.screenshot({ clip: CLIP, animations: 'disabled' })
      const m = await page.evaluate(buildingMasks, png.toString('base64'))
      row.push(`${name} s${m.spread.toFixed(4)} n${m.pairs} rf${(m.roof / m.front).toFixed(3)} hp${m.highpass.toFixed(4)} pk${m.peak.toFixed(3)} at${m.peakAt?.join('.')}`)
    } catch (e) { row.push(`${name} ERR ${e.message.slice(0, 80)}`) } finally { await context.close() }
  }
  console.log('SWEEP', JSON.stringify(v), '|', row.join(' | '))
  for (const a of alts) console.log(a)
  await server.close()
}
await browser.close()
