// Stills of the canvas scene and built app for review (docs/design/qa/canvas/<stage>/).
//   node e2e/scene.stills.mjs <outDir> <moment>[#<style>] … [--dpr=2]    (a moment: `moments.mjs`)
// (`#drawn`: painted in the drawn hand, `-drawn` in the file's name; a style the scene does not have is refused.)
// (`#app` / `#app-drawn`: full-page built app from dist/, optionally with @clear or @rainbow.)
// (`land`: loading | offline | arrive, C8: the land not known yet, or its reveal begun at phase 0.)
// (A full date picks another day: the moon in another phase. The fixture's forecast is rolled to it.)
import fs from 'node:fs'
import path from 'node:path'
import { shootAppStill } from './appStills.mjs'
import { CLIP, launch, loadScene, openPage, root, sceneUrl, startPreview, startServer } from './harness.mjs'
import { momentName, parseMoment } from './moments.mjs'
import { assertStyle } from './sceneHand.mjs'

/** Bottom band includes the neighbours and home roofs in the 428 px still; taller marks extend it upward. */
const NEIGHBOUR_BAND_PX = 53
const args = process.argv.slice(2)
const dpr = Number(args.find((a) => a.startsWith('--dpr='))?.slice(6) ?? 2)
// Explicit labelled flat 100 m fixture for a gazetteer place without a recorded panorama: --flat=lat,lon,name.
const flat = args.find(a => a.startsWith('--flat='))?.slice(7).split(',')
const [outDir, ...texts] = args.filter((a) => !a.startsWith('--'))
if (!outDir || !texts.length) {
  console.log('usage: node e2e/scene.stills.mjs <outDir> <moment>[#drawn|#app|#app-drawn] … [--dpr=2]')
  process.exit(2)
}
const moments = texts.map(parseMoment)
const isApp = ({ style }) => style === 'app' || style === 'app-drawn'
const needsApp = moments.some(isApp)
if (needsApp && !fs.existsSync(path.join(root, 'dist/index.html'))) {
  throw new Error('App stills require dist/index.html. Run npx vite build before capturing them.')
}
const out = path.resolve(root, outDir)
fs.mkdirSync(out, { recursive: true })
let server, preview, browser
try {
  if (moments.some(moment => !isApp(moment))) server = await startServer()
  if (needsApp) preview = await startPreview()
  browser = await launch()
  for (const moment of moments) {
    if (isApp(moment)) {
      await shootAppStill(browser, preview.url, out, moment, dpr)
      continue
    }
    const { place } = moment
    const { context, page } = await openPage(browser, server.url, dpr)
    const url = new URL(sceneUrl(server.url, { ...moment }))
    if (flat) for (const [key, value] of Object.entries({ terrain: 'flat', lat: flat[0], lon: flat[1], name:
      flat[2] ?? place })) url.searchParams.set(key, value)
    await loadScene(page, url.href)
    if (moment.style) await assertStyle(page, moment.style)
    if (flat) await page.evaluate(name => {
      const label = document.createElement('div')
      label.textContent = `${name} · Offline flat 100 m · no recorded panorama`
      label.style.cssText = ("position:absolute;top:8px;left:8px;padding:4px " +
    "6px;background:#fff;color:#222;font:11px sans-serif;z-index:100")
      document.body.append(label)
    }, flat[2] ?? place)
    const file = path.join(out, `${momentName(moment, flat ? '-flat100m' : '')}.png`)
    fs.writeFileSync(file, await page.screenshot({ clip: CLIP }))
    if (args.includes('--describe')) {
      const description = await page.evaluate(async () => {
        const { sceneModel } = await import('/src/scene/model/index.ts')
        const { hashId } = await import('/src/data/landmarks/hash.ts')
        const { SCENE_W } = await import('/src/world/sceneBox.ts')
        const world = window.__world
        const model = sceneModel(world, { width: innerWidth, skyHeight: 428, landTop: 300, landHeight: 128, dpr:
          devicePixelRatio })
        const items = model.layers.find(layer => layer.kind === 'outside')?.items ?? []
        const roofs = items.filter(item => item.kind === 'box' && !item.beyond || item.kind === 'tower'
          && !world.place3.beyond.some(tower => tower.seed === item.seed))
        const left = Math.min(...roofs.map(item => item.x - item.w / 2)), right = Math.max(...roofs.map(item =>
          item.x + item.w / 2))
        const drawn = [...items.flatMap(item => item.kind === 'mark' ? [item.glyph] : []),
          ...(model.layers.find(layer => layer.kind === 'marks')?.glyphs ?? [])]
        const glyphs = drawn.map(glyph => {
          const source = [...world.marks, ...world.seatPool].find(mark => hashId(mark.id) === glyph.seed)
          if (!source) throw new Error(`Unmatched drawn glyph ${glyph.kind}:${glyph.seed}`)
          return { id: source.id, kind: glyph.kind, famous: glyph.famous,
            baseMode: glyph.baseMode, ridgeKind: glyph.ridgeKind, x: glyph.x, width: glyph.w,
            height: glyph.h * glyph.scale,
            nonOwn: Boolean(source.seatBlockId || source.sightKm !== undefined),
            gapPx: Math.max(left - glyph.x - glyph.w / 2, glyph.x - glyph.w / 2 - right),
            slidePx: glyph.x - source.x * innerWidth / SCENE_W, base: glyph.base, trueHeightPx: glyph.trueHeightPx,
            factor: glyph.factor, contrast: glyph.contrast, hazeKm: glyph.hazeKm, trueDistanceKm: glyph.trueDistanceKm,
            town: glyph.town, supportId: glyph.supportId }
        })
        return { place: world.place, terrain: new URLSearchParams(location.search).get('terrain') ?? 'recorded', home: { left,
          right }, glyphs }
      })
      fs.writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify(description, null, 2) + '\n')
      if (args.includes('--crop4x')) {
        // Crop the whole neighbour band, including home roofs for gap context. Magnify existing DPR pixels 4x.
        const tops = description.glyphs.filter(g => g.nonOwn).map(g => 300 + g.base - g.height - 8)
        const y = Math.max(300, Math.floor(Math.min(CLIP.height - NEIGHBOUR_BAND_PX, ...tops)))
        const crop = await page.screenshot({ clip: { x: 0, y, width: CLIP.width, height: CLIP.height - y } })
        const png = await page.evaluate(async base64 => {
          const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
          const canvas = document.createElement('canvas')
          canvas.width = image.width * 4; canvas.height = image.height * 4
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
          return canvas.toDataURL('image/png').split(',')[1]
        }, crop.toString('base64'))
        fs.writeFileSync(file.replace(/\.png$/, '-crop4x.png'), Buffer.from(png, 'base64'))
      }
    }
    console.log('saved', path.relative(root, file))
    await context.close()
  }
} finally {
  try { await browser?.close() } finally {
    await Promise.all([server?.close(), preview?.close()])
  }
}
