// V2b prototype stills: today, (a) cells, (b) footprints, at noon, real style.
//   node scripts/v2b/stills.mjs <outDir> <place> …
// Writes <place>-<mode>@<dpr>x.png and <place>-<mode>.json (what was drawn and where).
import fs from 'node:fs'
import path from 'node:path'
import { CLIP, launch, loadScene, openPage, sceneUrl, startServer } from '../../e2e/harness.mjs'

const [outDir, ...places] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const server = await startServer()
const browser = await launch()
try {
  for (const place of places) for (const mode of ['today', 'a', 'b']) for (const dpr of [2, 1]) {
    const { context, page } = await openPage(browser, server.url, dpr)
    const url = new URL(sceneUrl(server.url, { place, at: '2026-11-17T12:00', style: 'real', overlay: true }))
    if (mode !== 'today') url.searchParams.set('proto', mode)
    await loadScene(page, url.href)
    const name = path.join(outDir, `${place}-${mode}`)
    fs.writeFileSync(`${name}@${dpr}x.png`, await page.screenshot({ clip: CLIP }))
    if (dpr === 2) {
      const report = await page.evaluate(() => window.__v2b ?? { mode: 'today', dot: window.__world.place3.dot,
        houses: window.__world.place3.skyline.boxes.map(b => [b.dx, b.dy, b.x, b.foot, b.w, b.foot - b.top]) })
      fs.writeFileSync(`${name}.json`, JSON.stringify(report))
      const { houses, groups, ...rest } = report
      console.log(place, mode, houses.length, groups?.length, JSON.stringify(rest))
    }
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
