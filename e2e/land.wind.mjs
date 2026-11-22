// Offline Stage 5 stills and a targeted wind frame budget at 375 CSS px.
//   node e2e/land.wind.mjs [--perf]
import fs from 'node:fs/promises'
import path from 'node:path'
import { CLIP, launch, loadScene, openPage, root, sceneUrl, startServer } from './harness.mjs'
import { installNearPalmFixture } from './landWindPalm.mjs'

const samples = [
  { place: 'rosh-pina', at: '2026-02-15T12:00', subject: 'Galilee woodland' },
  { place: 'nahalal', at: '2026-02-15T12:00', subject: 'Jezreel orchards and fields' },
  { place: 'kalya', at: '2026-02-15T12:00', subject: 'Jordan Rift date palms' },
  { place: 'ramon-crater', at: '2026-08-15T12:00', subject: 'Negev bare ground' },
]
const out = path.join(root, 'docs/design/qa/canvas/land/stage5')
const framePhases = [0, 0.4, 0.8, 1.2]
const perf = process.argv.includes('--perf')

async function stills(browser, base) {
  await fs.mkdir(out, { recursive: true })
  const { page, context } = await openPage(browser, base, 2)
  try {
    for (const sample of samples) {
      for (const weather of ['land-calm', 'land-wind']) {
        const state = weather === 'land-calm' ? 'calm' : 'windy'
        await loadScene(page, sceneUrl(base, { ...sample, weather }))
        const shot = await page.screenshot({ clip: CLIP, animations: 'disabled' })
        await fs.writeFile(path.join(out, `${sample.place}-${state}.png`), shot)
        if (sample.place === 'kalya') {
          await installNearPalmFixture(page)
          const near = await page.screenshot({ clip: CLIP, animations: 'disabled' })
          await fs.writeFile(path.join(out, `kalya-near-palm-fixture-${state}.png`), near)
          if (state === 'windy') await palmStrip(page)
        }
        console.log(`${sample.subject}, ${state}`)
      }
    }
  } finally { await context.close() }
}

async function palmStrip(page) {
  const frames = []
  // Inspect the palm bases and frond joins at 2× the DPR-2 screenshot scale.
  const clip = { x: 98, y: 406, width: 52, height: 22 }
  for (const phase of framePhases) {
    await page.evaluate((t) => window.__scene.lay(t), phase)
    frames.push((await page.screenshot({ clip, animations: 'disabled' })).toString('base64'))
  }
  const png = await page.evaluate(async ({ frames, phases }) => {
    const images = await Promise.all(frames.map(async (bytes) => {
      const img = new Image()
      img.src = `data:image/png;base64,${bytes}`
      await img.decode()
      return img
    }))
    const strip = document.createElement('canvas')
    const w = images[0].width * 2, h = images[0].height * 2, labelH = 30
    strip.width = images.length * w
    strip.height = h + labelH
    const ctx = strip.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#f0eadd'
    ctx.fillRect(0, 0, strip.width, strip.height)
    ctx.fillStyle = '#272721'
    ctx.font = '18px sans-serif'
    images.forEach((img, i) => {
      ctx.fillText(`${phases[i].toFixed(1)} s`, i * w + 10, 21)
      ctx.drawImage(img, i * w, labelH, w, h)
    })
    return strip.toDataURL().split(',')[1]
  }, { frames, phases: framePhases })
  await fs.writeFile(path.join(out, 'kalya-sway-strip.png'), Buffer.from(png, 'base64'))
}

async function frameBudget(browser, base) {
  const rate = 4, dpr = 2.75
  for (const sample of [samples[0], samples[2], samples[3]]) {
    const { page, context } = await openPage(browser, base, dpr, { motion: true })
    try {
      const cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate })
      await loadScene(page, sceneUrl(base, { ...sample, weather: 'land-wind' }), 180000)
      const before = await page.evaluate(() => {
        const stats = window.__sceneStats
        stats.steps['anim.land'] = []; stats.steps['anim.sky'] = []
        return {
          painted: Object.fromEntries(Object.entries(stats.layers).map(([id, layer]) => [id, layer.paints])),
          memory: Object.values(stats.memory).reduce((a, b) => a + b, 0) / 2 ** 20,
        }
      })
      await page.waitForTimeout(10000)
      const result = await page.evaluate(({ painted }) => {
        const { layers, steps } = window.__sceneStats
        const summary = (samples = []) => {
          const sorted = samples.toSorted((a, b) => a - b)
          return { n: sorted.length, p50: sorted[Math.ceil(sorted.length * 0.5) - 1], p95: sorted[Math.ceil(sorted.length * 0.95) - 1] }
        }
        return { land: summary(steps['anim.land']), sky: summary(steps['anim.sky']),
          repainted: Object.keys(layers).filter((id) => painted[id] !== layers[id].paints) }
      }, before)
      const { land, sky, repainted } = result
      const p95 = land.p95 + sky.p95
      const expected = sample.place === 'ramon-crater' ? 'landDust.near' : 'canopy.near'
      const ok = p95 <= 4 && !repainted.length && Object.hasOwn(before.painted, expected)
      console.log(`${sample.place}: ${JSON.stringify(result)}, sum p95=${p95.toFixed(2)} ms, ${before.memory.toFixed(1)} MB ${ok ? 'PASS' : 'FAIL'}`)
      if (!ok) process.exitCode = 1
    } finally { await context.close() }
  }
}

const server = await startServer()
const browser = await launch()
try {
  await (perf ? frameBudget : stills)(browser, server.url)
} finally {
  await browser.close()
  await server.close()
}
