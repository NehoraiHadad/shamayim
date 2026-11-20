// A strip of the clothesline swaying (docs/design/qa/canvas/wear/): the wear card's line in the scene harness
// (`scene.html?wear=`) laid at a run of phases, with motion, each frame cropped and stacked into one PNG.
//   node e2e/wear.strip.mjs <out.png> [weather=gale] [garments=sweater,jacket,umbrella] [frames=10] [step=0.3] [--dpr=2]
// The forecast comes from the fixture (`harness.mjs`): nothing reaches Open-Meteo.
import fs from 'node:fs'
import path from 'node:path'
import { launch, loadScene, openPage, root, sceneUrl, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const dpr = Number(args.find((a) => a.startsWith('--dpr='))?.slice(6) ?? 2)
const [out, weather = 'gale', wear = 'sweater,jacket,umbrella', frames = '10', step = '0.3'] = args.filter((a) => !a.startsWith('--'))
if (!out) {
  console.log('usage: node e2e/wear.strip.mjs <out.png> [weather] [garments] [frames] [step] [--dpr=2]')
  process.exit(2)
}
const server = await startServer()
const browser = await launch()
try {
  const { context, page } = await openPage(browser, server.url, dpr)
  await loadScene(page, sceneUrl(server.url, { place: 'jerusalem', at: '2026-11-17T12:00', weather, wear }))
  const shots = []
  for (let i = 0; i < Number(frames); i++) {
    const phase = i * Number(step)
    await page.evaluate((p) => window.__scene.lay(p), phase)
    shots.push((await page.screenshot({ clip: { x: 0, y: 0, width: 375, height: 140 } })).toString('base64'))
  }
  // Stacked in the page itself (no image library): each frame drawn under the one before, its phase beside it.
  const png = await page.evaluate(async ({ shots, step }) => {
    const images = await Promise.all(shots.map((s) => new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.src = `data:image/png;base64,${s}`
    })))
    const w = images[0].width, h = images[0].height
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h * images.length
    const ctx = canvas.getContext('2d')
    images.forEach((img, i) => {
      ctx.drawImage(img, 0, i * h)
      ctx.fillStyle = 'rgb(0 0 0 / 0.55)'
      ctx.font = `${Math.round(h / 9)}px sans-serif`
      ctx.fillText(`${(i * step).toFixed(1)} s`, 8, i * h + h / 7)
    })
    return canvas.toDataURL('image/png').split(',')[1]
  }, { shots, step: Number(step) })
  fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true })
  fs.writeFileSync(path.resolve(root, out), Buffer.from(png, 'base64'))
  console.log(`written ${out} (${frames} frames, ${step} s apart)`)
  await context.close()
} finally {
  await browser.close()
  await server.close()
}
