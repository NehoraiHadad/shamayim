import { buildingMasks } from './buildingMasks.mjs'
import { CLIP, launch, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'
const V = [
  ...[0, .05, .1, .125, .15, .175].flatMap(f => [0, 1].flatMap(decor => ['m', 'both'].map(cap => ({ f, decor, cap })))),
  ...[.5, .75, 1, 1.25].flatMap(ss => [0, 1].map(decor => ({ ss, decor }))),
  ...[2, 4].flatMap(rise => [0, 1].flatMap(decor => [.25, .5].map(f => ({ rise, decor, f })))),
  ...[.1, .15].flatMap(f => [.75, 1.5].map(pitch => ({ f, pitch, decor: 1 })))]
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
      row.push(`${name} s${m.spread.toFixed(4)} n${m.pairs} rf${(m.roof / m.front).toFixed(3)} hp${m.highpass.toFixed(4)} pk${m.peak.toFixed(3)}`)
    } catch (e) { row.push(`${name} ERR ${e.message.slice(0, 80)}`) } finally { await context.close() }
  }
  console.log('SWEEP', JSON.stringify(v), '|', row.join(' | '))
  for (const a of alts) console.log(a)
  await server.close()
}
await browser.close()
