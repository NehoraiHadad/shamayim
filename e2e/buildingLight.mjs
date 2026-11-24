import { buildingMasks } from './buildingMasks.mjs'
import { CLIP, launch, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'
const V = [{}, ...[.15, .2, .3, .35, .4, .5].map(f => ({ f })), ...[.5, .75, 1.5, 2].map(end => ({ end })),
  ...[.75, .9, 1.1, 1.25].map(scale => ({ scale })), ...[.5, .75, 1.25, 1.5, 2].map(pitch => ({ pitch })),
  ...['tall', 'far'].map(order => ({ order })), { tower: 0 }, { cap: 'px' }, { cap: 'both' }, { cap: 'px', tower: 0 },
  { decor: 1 }, { decor: 1, f: .2 }, { decor: 1, f: .3 }, { decor: 1, f: .5 }, { decor: 1, end: 1.5 }, { decor: 1, end: .75 },
  { decor: 1, scale: .9 }, { decor: 1, scale: 1.1 }, { decor: 1, cap: 'both' }, { decor: 1, pitch: 1.25 }, { decor: 1, pitch: .75 }]
const cases = ['haifa-0620', 'haifa-1630', 'haifa-1200-overcast', 'tiberias-1200', 'haifa-1200', 'jerusalem-1200', 'tel-aviv-1200']
const browser = await launch()
for (const v of V) {
  process.env.VITE_TUNE = JSON.stringify(v)
  const server = await startServer()
  const row = []
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
  await server.close()
}
await browser.close()
