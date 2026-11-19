// Stills of the canvas scene for review (docs/design/qa/canvas/<stage>/), with the HTML overlay.
//   node e2e/scene.stills.mjs <outDir> <place>@<HH:MM>[@<weather>] … [--dpr=2]
import fs from 'node:fs'
import path from 'node:path'
import { caseName, CLIP, launch, loadScene, openPage, root, sceneUrl, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const dpr = Number(args.find((a) => a.startsWith('--dpr='))?.slice(6) ?? 2)
const [outDir, ...moments] = args.filter((a) => !a.startsWith('--'))
if (!outDir || !moments.length) {
  console.log('usage: node e2e/scene.stills.mjs <outDir> <place>@<HH:MM>[@<weather>] … [--dpr=2]')
  process.exit(2)
}
const out = path.resolve(root, outDir)
fs.mkdirSync(out, { recursive: true })
const server = await startServer()
const browser = await launch()
try {
  for (const moment of moments) {
    const [place, hour, weather = ''] = moment.split('@')
    const c = { place, at: `2026-11-17T${hour}`, weather, dpr }
    const { context, page } = await openPage(browser, server.url, dpr)
    await loadScene(page, sceneUrl(server.url, { ...c, overlay: true }))
    const file = path.join(out, `${caseName({ ...c, dpr: 1 })}.png`)
    fs.writeFileSync(file, await page.screenshot({ clip: CLIP }))
    console.log('saved', path.relative(root, file))
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
