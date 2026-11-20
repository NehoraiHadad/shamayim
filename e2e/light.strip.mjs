// A strip of the scene's light in time (docs/design/qa/canvas/light/): the harness at a run of minutes, each frame
// cropped (the houses close up) and laid in a grid with its time, for the living light's before / after review.
//   node e2e/light.strip.mjs <out.png> <place> <YYYY-MM-DDTHH:MM> <frames> <minutes apart> [weather]
//     [--clip=x,y,w,h] [--dpr=3] [--cols=4] [--wear=garments] [--phase=s]
// `--wear` takes the clothesline (`scene.html?wear=`) instead of the valley. Every frame is its own page (a fresh world at
// that minute, as the app builds it); the forecast comes from the fixture (`harness.mjs`): nothing reaches Open-Meteo.
import fs from 'node:fs'
import path from 'node:path'
import { launch, loadScene, openPage, root, sceneUrl, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const flag = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback
const [out, place, start, frames = '8', step = '5', weather = ''] = args.filter((a) => !a.startsWith('--'))
if (!out || !place || !start) {
  console.log('usage: node e2e/light.strip.mjs <out.png> <place> <YYYY-MM-DDTHH:MM> <frames> <minutes> [weather] [--clip=x,y,w,h] [--dpr=3] [--cols=4] [--wear=…]')
  process.exit(2)
}
const dpr = Number(flag('dpr', 3)), cols = Number(flag('cols', 4)), wear = flag('wear', ''), phase = flag('phase', '0')
const clip = (() => {
  const [x, y, width, height] = flag('clip', wear ? '0,0,375,150' : '0,0,375,428').split(',').map(Number)
  return { x, y, width, height }
})()

/** A minute `m` after `start` (local wall-clock, no zone: the fixture's day). */
function minuteAfter(at, m) {
  const [d, t] = at.split('T')
  const [h, min] = t.split(':').map(Number)
  const total = h * 60 + min + m
  return `${d}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const server = await startServer()
const browser = await launch()
try {
  const shots = []
  for (let i = 0; i < Number(frames); i++) {
    const at = minuteAfter(start, i * Number(step))
    const { context, page } = await openPage(browser, server.url, dpr)
    await loadScene(page, sceneUrl(server.url, { place, at, weather, wear, phase }))
    await page.evaluate(() => window.__scene?.settled?.())
    shots.push({ at: at.slice(11), png: (await page.screenshot({ clip })).toString('base64') })
    await context.close()
  }
  const { context, page } = await openPage(browser, server.url, 1)
  await page.goto(`${server.url}/scene.html?place=${place}`)
  const png = await page.evaluate(async ({ shots, cols, title }) => {
    const images = await Promise.all(shots.map((s) => new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.src = `data:image/png;base64,${s.png}`
    })))
    const w = images[0].width, h = images[0].height, gap = 6, head = Math.round(h / 8) + 10
    const rows = Math.ceil(images.length / cols)
    const canvas = document.createElement('canvas')
    canvas.width = cols * w + (cols + 1) * gap
    canvas.height = head + rows * (h + gap) + gap
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f4f1ea'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#333'
    ctx.font = `${Math.round(head * 0.55)}px sans-serif`
    ctx.fillText(title, gap, head * 0.7)
    images.forEach((img, i) => {
      const x = gap + (i % cols) * (w + gap), y = head + Math.floor(i / cols) * (h + gap)
      ctx.drawImage(img, x, y)
      const label = shots[i].at
      ctx.font = `${Math.round(h / 9)}px sans-serif`
      const tw = ctx.measureText(label).width
      ctx.fillStyle = 'rgb(255 255 255 / 0.75)'
      ctx.fillRect(x + 4, y + 4, tw + 10, Math.round(h / 9) + 8)
      ctx.fillStyle = '#222'
      ctx.fillText(label, x + 9, y + 4 + Math.round(h / 9))
    })
    return canvas.toDataURL('image/png').split(',')[1]
  }, { shots, cols, title: `${place} ${start.slice(0, 10)} · every ${step} min${weather ? ` · ${weather}` : ''}${wear ? ` · ${wear}` : ''}` })
  fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true })
  fs.writeFileSync(path.resolve(root, out), Buffer.from(png, 'base64'))
  console.log(`written ${out} (${frames} frames, ${step} min apart)`)
  await context.close()
} finally {
  await browser.close()
  await server.close()
}
