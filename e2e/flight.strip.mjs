// A scrub strip of the sky's life (docs/design/qa/canvas/flight/): one harness page scrubbed minute by minute
// (`__scene.scrub`, the app's own path), each frame cropped and laid in a grid with its time, into one PNG.
//   node e2e/flight.strip.mjs <out.png> <place>@<HH:MM>[@<weather>] [step=3] [frames=12] [--cols=4] [--top=120] [--dpr=1]
//     [--left=0] [--width=375] [--bottom=428]
// `--top` crops the sky above that y (scene px) away: the strip shows where the life meets the land; `--left`, `--width`
// and `--bottom` crop a window of the scene (a far approach, drawn larger with `--dpr`). The forecast comes
// from the fixture (`harness.mjs`): nothing reaches Open-Meteo.
import fs from 'node:fs'
import path from 'node:path'
import { CLIP, launch, loadScene, openPage, root, sceneUrl, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const opt = (name, fallback) => Number(args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback)
const [out, moment, step = '3', frames = '12'] = args.filter((a) => !a.startsWith('--'))
if (!out || !moment) {
  console.log('usage: node e2e/flight.strip.mjs <out.png> <place>@<HH:MM>[@<weather>] [step] [frames] [--cols=4] [--top=120] [--dpr=1]')
  process.exit(2)
}
const dpr = opt('dpr', 1), cols = opt('cols', 4), top = opt('top', 120)
const left = opt('left', 0), width = opt('width', CLIP.width - left), bottom = opt('bottom', CLIP.height)
const [place, hour, weather = ''] = moment.split('@')
const day = '2026-11-17'
const pad = (n) => String(n).padStart(2, '0')
const startMin = Number(hour.slice(0, 2)) * 60 + Number(hour.slice(3, 5))
const times = Array.from({ length: Number(frames) }, (_, i) => {
  const m = startMin + i * Number(step)
  return `${day}T${pad(Math.floor(m / 60))}:${pad(m % 60)}`
})
const server = await startServer()
const browser = await launch()
try {
  const { context, page } = await openPage(browser, server.url, dpr)
  await loadScene(page, sceneUrl(server.url, { place, at: times[0], weather }))
  const shots = []
  for (const at of times) {
    await page.evaluate((t) => window.__scene.scrub(t), at)
    await page.evaluate(() => window.__scene.settled())
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    shots.push((await page.screenshot({ clip: { x: left, y: top, width, height: bottom - top } })).toString('base64'))
  }
  const png = await page.evaluate(async ({ shots, times, cols, label }) => {
    const images = await Promise.all(shots.map((s) => new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.src = `data:image/png;base64,${s}`
    })))
    const w = images[0].width, h = images[0].height, gap = 4
    const rows = Math.ceil(images.length / cols)
    const canvas = document.createElement('canvas')
    canvas.width = cols * w + (cols - 1) * gap
    canvas.height = rows * h + (rows - 1) * gap + 22
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#222'
    ctx.font = '14px sans-serif'
    ctx.fillText(label, 6, 16)
    images.forEach((img, i) => {
      const x = (i % cols) * (w + gap), y = 22 + Math.floor(i / cols) * (h + gap)
      ctx.drawImage(img, x, y)
      ctx.fillStyle = 'rgb(255 255 255 / 0.75)'
      ctx.fillRect(x + 4, y + 4, 46, 18)
      ctx.fillStyle = '#111'
      ctx.font = '13px sans-serif'
      ctx.fillText(times[i].slice(11), x + 8, y + 18)
    })
    return canvas.toDataURL('image/png').split(',')[1]
  }, { shots, times, cols, label: `${place} ${day} ${times[0].slice(11)}–${times.at(-1).slice(11)}, every ${step} min${weather ? ` (${weather})` : ''}` })
  fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true })
  fs.writeFileSync(path.resolve(root, out), Buffer.from(png, 'base64'))
  console.log(`written ${out} (${times.length} frames, ${step} min apart)`)
  await context.close()
} finally {
  await browser.close()
  await server.close()
}
