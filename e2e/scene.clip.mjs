// A short clip of the land's arrival (C8) for review: the mist with the line forming, then the land coming in.
//   node e2e/scene.clip.mjs <out.mp4> <place>@<HH:MM>[@<weather>] [--fps=20] [--loading=3.5] [--arrive=2.4] [--dpr=2]
// Each part is a harness page (`land=loading`, then `land=arrive`) laid at every frame's phase (`__scene.lay`, nothing
// repainted), screenshot and encoded with ffmpeg. Both parts run on one clock, as the app's scene clock does: the arrival's
// page has its reveal at the phase the loading part ends (`from`), and is laid from there.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { CLIP, launch, loadScene, openPage, root, sceneUrl, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => Number(args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback)
const [outFile, moment] = args.filter((a) => !a.startsWith('--'))
if (!outFile || !moment) {
  console.log('usage: node e2e/scene.clip.mjs <out.mp4> <place>@<HH:MM>[@<weather>] [--fps=20] [--loading=3.5] [--arrive=2.4]')
  process.exit(2)
}
const fps = arg('fps', 20), loading = arg('loading', 3.5), arrive = arg('arrive', 2.4), dpr = arg('dpr', 2)
const [place, hour, weather = ''] = moment.split('@')
const at = hour.includes('T') ? hour : `2026-11-17T${hour}`
const out = path.resolve(root, outFile)
// The frames beside the clip while it is made, removed after.
const frames = `${out}.frames`
fs.mkdirSync(frames, { recursive: true })
const server = await startServer()
const browser = await launch()
let n = 0
try {
  for (const [land, seconds, from] of [['loading', loading, 0], ['arrive', arrive, loading]]) {
    const { context, page } = await openPage(browser, server.url, dpr)
    await loadScene(page, `${sceneUrl(server.url, { place, at, weather, land, overlay: true })}&from=${from}`)
    await page.evaluate(() => window.__scene.settled())
    const count = Math.round(seconds * fps)
    for (let i = 0; i < count; i++) {
      await page.evaluate((phase) => window.__scene.lay(phase), from + i / fps)
      fs.writeFileSync(path.join(frames, `f${String(n++).padStart(4, '0')}.png`), await page.screenshot({ clip: CLIP }))
    }
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, 'f%04d.png'),
  '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '24', out])
fs.rmSync(frames, { recursive: true, force: true })
console.log('saved', path.relative(root, out), `(${n} frames, ${(n / fps).toFixed(1)} s)`)
