// Final Stage 6 before/after stills (origin/main vs HEAD), seasonal fallback contact sheets, and an offline
// observed satellite fallback -> refined pair at 375 px.
//   node e2e/land.final.mjs --before-root=<origin/main worktree> | --after-only | --sheets-only | --observed-only
// Offline only: uses recorded panoramas, local WorldCover/landmark/city data, forecast and S2/GIBS fixtures.
import fs from 'node:fs/promises'
import path from 'node:path'
import { CLIP, launch, loadScene, openPage, root, sceneUrl } from './harness.mjs'
import { captureObservedPair } from './landObservedStill.mjs'

const OUT = path.join(root, 'docs/design/qa/canvas/land/final')
const PLACES = [
  { id: 'rosh-pina', label: 'Galilee · Rosh Pina' },
  { id: 'zikhron-yaakov', label: 'Coast · Zikhron Yaakov' },
  { id: 'nahalal', label: 'Jezreel · Nahalal' },
  { id: 'shadmot-mehola', label: 'Jordan · Shadmot Mehola' },
  { id: 'jerusalem', label: 'Jerusalem' },
  { id: 'ramon-crater', label: 'Negev · Ramon Crater' },
  { id: 'kalya', label: 'Dead Sea · Kalya' },
]
const SEASONS = [
  { id: 'winter', title: 'Winter — Feb 15, 12:00 (sunny · seasonal climatology + WorldCover fallback)', at: '2026-02-15T12:00', weather: 'sunny' },
  { id: 'spring', title: 'Late spring — May 15, 12:00 (sunny · seasonal climatology + WorldCover fallback)', at: '2026-05-15T12:00', weather: 'sunny' },
  { id: 'summer', title: 'Late summer — Aug 15, 12:00 (sunny · seasonal climatology + WorldCover fallback)', at: '2026-08-15T12:00', weather: 'sunny' },
]
const WINDY = [
  { id: 'rosh-pina', label: 'Galilee · Rosh Pina (Feb 15)', at: '2026-02-15T12:00', weather: 'gale', phase: '0.8' },
  { id: 'nahalal', label: 'Jezreel · Nahalal (Feb 15)', at: '2026-02-15T12:00', weather: 'gale', phase: '0.8' },
  { id: 'ramon-crater', label: 'Negev · Ramon Crater (Aug 15)', at: '2026-08-15T12:00', weather: 'gale', phase: '0.8' },
]
// Contact sheets crop the upper empty sky (y=200..428: 100 px horizon/sky + full 128 px land band).
const SHEET_CROP_Y = 200

async function startVite(appRoot) {
  const { createServer } = await import('vite')
  const server = await createServer({ root: appRoot, logLevel: 'error', server: { host: '127.0.0.1', port: 0, strictPort: false } })
  await server.listen()
  return { url: server.resolvedUrls.local[0].replace(/\/$/, ''), close: () => server.close() }
}

async function captureSet(browser, baseUrl, subdir) {
  const dir = path.join(OUT, subdir)
  await fs.mkdir(dir, { recursive: true })
  const { context, page } = await openPage(browser, baseUrl, 1)
  try {
    for (const s of SEASONS) {
      for (const p of PLACES) {
        await loadScene(page, sceneUrl(baseUrl, { place: p.id, at: s.at, weather: s.weather, overlay: true }))
        const png = await page.screenshot({ clip: CLIP, animations: 'disabled' })
        await fs.writeFile(path.join(dir, `${s.id}-${p.id}.png`), png)
      }
      console.log(`captured ${subdir} ${s.id} (${PLACES.length})`)
    }
    for (const w of WINDY) {
      await loadScene(page, sceneUrl(baseUrl, { place: w.id, at: w.at, weather: w.weather, phase: w.phase, overlay: true }))
      const png = await page.screenshot({ clip: CLIP, animations: 'disabled' })
      await fs.writeFile(path.join(dir, `windy-${w.id}.png`), png)
    }
    console.log(`captured ${subdir} windy (${WINDY.length})`)
  } finally { await context.close() }
}

async function buildSheet(page, outFile, title, columns) {
  const tiles = await Promise.all(columns.map(async ({ label, file }) => ({
    label,
    before: (await fs.readFile(path.join(OUT, 'before', file))).toString('base64'),
    after: (await fs.readFile(path.join(OUT, 'after', file))).toString('base64'),
  })))
  const png = await page.evaluate(async ({ title, tiles, cropY }) => {
    const load = (b64) => new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = `data:image/png;base64,${b64}`
    })
    const pairs = await Promise.all(tiles.map(async (t) => ({
      label: t.label, before: await load(t.before), after: await load(t.after),
    })))
    const w = pairs[0].before.width, h = pairs[0].before.height - cropY
    const gap = 8, head = 54, colHead = 20, rowTag = 26
    const canvas = document.createElement('canvas')
    canvas.width = rowTag + pairs.length * (w + gap) + gap
    canvas.height = head + colHead + 2 * h + 3 * gap
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f2efe8'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1f2328'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(title, rowTag + gap, 24)
    ctx.font = '13px sans-serif'
    ctx.fillStyle = '#57606a'
    ctx.fillText('top row: before (origin/main)   ·   bottom row: after (land-living, fallback climatology + WorldCover)   ·   375 px wide', rowTag + gap, 44)
    const rowY = [head + colHead + gap, head + colHead + h + 2 * gap]
    for (const [ri, tag] of ['BEFORE', 'AFTER'].entries()) {
      ctx.save()
      ctx.translate(17, rowY[ri] + h / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillStyle = ri === 0 ? '#6e7781' : '#1a5d2e'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(tag, 0, 0)
      ctx.restore()
    }
    pairs.forEach((p, i) => {
      const x = rowTag + gap + i * (w + gap)
      ctx.fillStyle = '#24292f'
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText(p.label, x + 2, head + colHead - 3)
      ctx.drawImage(p.before, 0, cropY, w, h, x, rowY[0], w, h)
      ctx.drawImage(p.after, 0, cropY, w, h, x, rowY[1], w, h)
    })
    return canvas.toDataURL('image/png').split(',')[1]
  }, { title, tiles, cropY: SHEET_CROP_Y })
  await fs.writeFile(path.join(OUT, outFile), Buffer.from(png, 'base64'))
  console.log(`wrote ${path.relative(root, path.join(OUT, outFile))}`)
}

const args = process.argv.slice(2)
const beforeRoot = args.find((a) => a.startsWith('--before-root='))?.slice('--before-root='.length)
const afterOnly = args.includes('--after-only')
const sheetsOnly = args.includes('--sheets-only')
const observedOnly = args.includes('--observed-only')
if (!beforeRoot && !afterOnly && !sheetsOnly && !observedOnly) {
  console.error('usage: node e2e/land.final.mjs --before-root=<origin/main worktree> | --after-only | --sheets-only | --observed-only')
  process.exit(2)
}

const headServer = !sheetsOnly ? await startVite(root) : null
const beforeServer = !afterOnly && !sheetsOnly && !observedOnly && beforeRoot ? await startVite(beforeRoot) : null
const browser = await launch()
try {
  if (beforeServer) await captureSet(browser, beforeServer.url, 'before')
  if (headServer && !observedOnly) await captureSet(browser, headServer.url, 'after')
  if (headServer) await captureObservedPair(browser, headServer.url, OUT)
  if (!observedOnly) {
    const page = await browser.newPage()
    try {
      await page.setContent('<!doctype html><meta charset="utf-8">')
      for (const s of SEASONS) {
        await buildSheet(page, `sheet-${s.id}.png`, s.title, PLACES.map((p) => ({ label: p.label, file: `${s.id}-${p.id}.png` })))
      }
      await buildSheet(page, 'sheet-windy.png', 'Windy day — westerly near gale 50 km/h, gusts 75 km/h (Beaufort 7, phase 0.8 s)',
        WINDY.map((w) => ({ label: w.label, file: `windy-${w.id}.png` })))
    } finally { await page.close() }
  }
} finally {
  await browser.close()
  if (beforeServer) await beforeServer.close()
  if (headServer) await headServer.close()
}
