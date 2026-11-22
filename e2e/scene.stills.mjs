// Stills of the canvas scene for review (docs/design/qa/canvas/<stage>/), with the HTML overlay.
//   node e2e/scene.stills.mjs <outDir> <place>@<HH:MM | YYYY-MM-DDTHH:MM>
//     [@<weather>[@<phase s | flash>[@<land>[@<hide ids,…>]]]] … [--dpr=2]
// (`land`: loading | offline | arrive, C8: the land not known yet, or its reveal begun at phase 0.)
// (A full date picks another day: the moon in another phase. The fixture's forecast is rolled to it.)
import fs from 'node:fs'
import path from 'node:path'
import { caseName, CLIP, launch, loadScene, openPage, root, sceneUrl, startServer } from './harness.mjs'

/** Bottom band includes the neighbours and home roofs in the 428 px still; taller marks extend it upward. */
const NEIGHBOUR_BAND_PX = 53
const args = process.argv.slice(2)
const dpr = Number(args.find((a) => a.startsWith('--dpr='))?.slice(6) ?? 2)
// Explicit labelled flat 100 m fixture for a gazetteer place without a recorded panorama: --flat=lat,lon,name.
const flat = args.find(a => a.startsWith('--flat='))?.slice(7).split(',')
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
    const [place, hour, weather = '', phase = '0', land = '', hide = ''] = moment.split('@')
    const c = { place, at: hour.includes('T') ? hour : `2026-11-17T${hour}`, weather, dpr }
    const { context, page } = await openPage(browser, server.url, dpr)
    const url = new URL(sceneUrl(server.url, { ...c, overlay: true, phase, land, hide }))
    if (flat) for (const [key, value] of Object.entries({ terrain: 'flat', lat: flat[0], lon: flat[1], name:
      flat[2] ?? place })) url.searchParams.set(key, value)
    await loadScene(page, url.href)
    if (flat) await page.evaluate(name => {
      const label = document.createElement('div')
      label.textContent = `${name} · Offline flat 100 m · no recorded panorama`
      label.style.cssText = ("position:absolute;top:8px;left:8px;padding:4px " +
    "6px;background:#fff;color:#222;font:11px sans-serif;z-index:100")
      document.body.append(label)
    }, flat[2] ?? place)
    const day = hour.includes('T') ? `${hour.slice(5, 10).replace('-', '')}-` : ''
    const name = (`${day}${caseName({ ...c, dpr: 1, land, phase })}` +
    `${phase !== '0' && !land ? `-${phase}` : ''}${hide ? `-no-${hide.replace(/,/g, '+')}` : ''}` +
    `${flat ? '-flat100m' : ''}.png`)
    const file = path.join(out, name.replace(/[<>:"/\\|?*]/g, '-'))
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
          return { id: source.id, kind: glyph.kind, x: glyph.x, width: glyph.w, height: glyph.h * glyph.scale,
            nonOwn: Boolean(source.seatBlockId || source.sightKm !== undefined),
            gapPx: Math.max(left - glyph.x - glyph.w / 2, glyph.x - glyph.w / 2 - right),
            slidePx: glyph.x - source.x * innerWidth / SCENE_W, base: glyph.base, trueHeightPx: glyph.trueHeightPx,
            factor: glyph.factor, hazeKm: glyph.hazeKm, trueDistanceKm: glyph.trueDistanceKm, town: glyph.town, supportId:
              glyph.supportId }
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
  await browser.close()
  await server.close()
}
