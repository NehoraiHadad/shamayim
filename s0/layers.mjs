// node --experimental-strip-types s0/layers.mjs <tree> [moment …]: ms of each layer's first paint on the main thread (dpr 2.75,
// CPU ×4), today's painters against the prototype's laid over the same tree, three loads each in turn; and the tiles' first use.
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [tree, ...extra] = process.argv.slice(2)
const of = (file) => import(pathToFileURL(path.join(tree, file)).href)
const { launch, loadScene, openPage, sceneUrl, startServer } = await of('e2e/harness.mjs')
const { parseMoment, momentName } = await of('e2e/moments.mjs')
const { STILL_SET } = await of('e2e/stillSet.mjs')
const HERE = 'docs/design/prototypes/real', RATE = 4, ROUNDS = 3
const median = (list) => [...list].sort((a, b) => a - b)[list.length >> 1]

const server = await startServer(tree, { server: { fs: { strict: false } } })
const browser = await launch()

async function throttled() {
  const { context, page } = await openPage(browser, server.url, 2.75)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE })
  return { context, page }
}

async function layersOf(moment, only) {
  const { context, page } = await throttled()
  const url = new URL(sceneUrl(server.url, { ...moment, paint: 'main' }))
  url.pathname = `/${HERE}/index.html`
  if (only) url.searchParams.set('only', only)
  try {
    await loadScene(page, url.href, 180000)
    return await page.evaluate(() => Object.fromEntries(Object.entries(window.__sceneStats.layers).map(([id, l]) => [id, l.lastMs])))
  } finally {
    await context.close()
  }
}

async function tiles() {
  const runs = []
  for (let i = 0; i < 5; i++) {
    const { context, page } = await throttled()
    await page.goto(`${server.url}/scene.html?place=haifa&at=2026-11-17T12:00&paint=main`)
    await page.waitForFunction(() => window.__sceneReady || window.__sceneError, null, { timeout: 180000 })
    runs.push(await page.evaluate(async (here) => {
      const noise = await import(`${here}/cloudNoise.ts`)
      const domes = await import('/src/scene/paint/real/domeTile.ts'), fine = await import('/src/scene/paint/shared/base/detailTile.ts')
      const time = (fn) => { const t = performance.now(); fn(); return performance.now() - t }
      return { 'concept puff': time(noise.puffTile), 'concept swell': time(noise.swellTile), 'concept wisp': time(noise.wispTile),
        'today domes (one seed)': time(() => domes.domeTile(987654)), 'today detail (one seed)': time(() => fine.detailTile(987654)) }
    }, `/${HERE}`))
    await context.close()
  }
  console.log('\n## Tiles, first use (ms, ×4)\n\n| tile | median | runs |\n|---|---|---|')
  for (const key of Object.keys(runs[0])) console.log(`| ${key} | ${median(runs.map((r) => r[key])).toFixed(0)} | ${runs.map((r) => r[key].toFixed(0)).join(' ')} |`)
}

try {
  await layersOf(parseMoment('haifa@12:00'), 'none')
  await layersOf(parseMoment('haifa@12:00'))
  console.log(`## Layers (ms, last paint of a first load, ×${RATE}, dpr 2.75, main thread; median of ${ROUNDS})\n`)
  console.log('| moment | layer | today | prototype | ratio |\n|---|---|---|---|---|')
  for (const text of [...STILL_SET, ...extra]) {
    const moment = parseMoment(text), today = [], concept = []
    try {
      for (let i = 0; i < ROUNDS; i++) {
        const turns = [[today, 'none'], [concept, undefined]]
        for (const [list, only] of i % 2 ? turns.reverse() : turns) list.push(await layersOf(moment, only))
      }
    } catch (err) {
      console.log(`| ${momentName(moment)} | ERROR ${String(err.message).split('\n')[0]} | | | |`)
      continue
    }
    for (const id of Object.keys(today[0])) {
      const a = median(today.map((r) => r[id] ?? 0)), b = median(concept.map((r) => r[id] ?? 0))
      if (Math.max(a, b) >= 1 || /smoke/.test(id)) console.log(`| ${momentName(moment)} | ${id} | ${a.toFixed(0)} | ${b.toFixed(0)} | ${a ? (b / a).toFixed(2) : '-'} |`)
    }
  }
  await tiles()
} finally {
  await browser.close()
  await server.close()
}
