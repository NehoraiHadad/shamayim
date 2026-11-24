import { buildingMasks } from './buildingMasks.mjs'
import { CLIP, launch, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'
const V = [{}, { least: 0 }, { least: .5 }, { least: 1.5 }, { least: 2 }, { least: 3 },
  { salt: -1 }, ...[1, 2, 3, 4, 5].map(salt => ({ salt })), ...[1, 2, 3].map(salt => ({ salt, least: 2 })), { least: 0, salt: 1 }, { least: 0, salt: 2 }]
const cases = ['haifa-0620', 'haifa-1630', 'haifa-1200-overcast', 'tiberias-1200', 'haifa-1200', 'jerusalem-1200', 'tel-aviv-1200', 'rosh-pina-1200', 'jerusalem-0620']
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
      alts.push(`ALT ${JSON.stringify(v)} ${name} front ${m.front.toFixed(3)} roof ${m.roof.toFixed(3)} alt ${JSON.stringify(m.alt)} walls ${JSON.stringify(m.walls)} ground ${m.ground.toFixed(4)}`)
      row.push(`${name} s${m.spread.toFixed(4)} n${m.pairs} rf${(m.roof / m.front).toFixed(3)} hp${m.highpass.toFixed(4)} pk${m.peak.toFixed(3)} at${m.peakAt?.join('.')}`)
    } catch (e) { row.push(`${name} ERR ${e.message.slice(0, 80)}`) } finally { await context.close() }
  }
  console.log('SWEEP', JSON.stringify(v), '|', row.join(' | '))
  for (const a of alts) console.log(a)
  await server.close()
}
await browser.close()
