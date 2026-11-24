// Each style's sky base against the default one of the same desc: every 1 px row's mean colour, as the browser lays it,
// at rest and glided. A base that is a shade off must be found.
import assert from 'node:assert/strict'
import { CLIP, launch, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'

const MOMENTS = [['haifa', '2026-11-17T12:00'], ['haifa', '2026-11-17T16:30'], ['jerusalem', '2026-11-17T21:00']]
const DPR = 2, GLIDE = 37.5
const server = await startServer()
const browser = await launch()

/** In the page: the default base of the moment's sky, one a shade off and each style's, all as the styles' model makes the desc. */
async function basesOf(clip) {
  const [{ sceneModel }, { STYLES }, { skyBackground }] = await Promise.all(
    ['/src/scene/model/index.ts', '/src/scene/paint/styles.ts', '/src/scene/paint/shared/sky/skyBackground.ts'].map((file) => import(file)))
  const box = { width: clip.width, skyHeight: clip.height, landTop: 300, landHeight: 128, dpr: devicePixelRatio }
  return Object.entries(STYLES).map(([id, style]) => {
    const desc = sceneModel(window.__world, box, null, undefined, style.light).layers.find((layer) => layer.kind === 'sky')
    const plain = skyBackground(desc)
    return { id, plain, own: (style.skyBase ?? skyBackground)(desc), off: `linear-gradient(rgb(255 255 255 / 0.06) 0 100%), ${plain}` }
  })
}

const lay = ([image, clip, glide]) => {
  const sheet = document.getElementById('base') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'base' }))
  sheet.style.cssText = `position: fixed; left: 0; top: 0; width: ${clip.width}px; height: ${clip.height}px; z-index: 99999; background: #000 no-repeat 0 ${glide}px`
  sheet.style.backgroundImage = image
  return sheet.style.backgroundImage !== ''
}

async function shoot(page, image, glide) {
  assert.ok(await page.evaluate(lay, [image, CLIP, glide]), `not a background image: ${image}`)
  return (await page.screenshot({ clip: CLIP, animations: 'disabled' })).toString('base64')
}

/** In the page: the worst row of the first shot against the second. */
async function compare(shots) {
  const { ROW_DE, worstRow } = await import('/src/test/skyBaseRows.ts')
  const rasters = await Promise.all(shots.map(async (base64) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
    const ctx = new OffscreenCanvas(image.width, image.height).getContext('2d')
    ctx.drawImage(image, 0, 0)
    return ctx.getImageData(0, 0, image.width, image.height)
  }))
  return { limit: ROW_DE, ...worstRow(...rasters) }
}

try {
  for (const [place, at] of MOMENTS) {
    const { context, page } = await openPage(browser, server.url, DPR)
    await loadScene(page, sceneUrl(server.url, { place, at }))
    for (const { id, plain, own, off } of await page.evaluate(basesOf, CLIP)) {
      for (const glide of [0, GLIDE]) {
        const against = await shoot(page, plain, glide)
        const { limit, y, dE } = await page.evaluate(compare, [await shoot(page, own, glide), against])
        console.log(`${place} ${at} ${id} glide ${glide}: worst row ${y}, dE ${dE.toFixed(4)}`)
        assert.ok(dE <= limit, `${place} ${at} ${id}: row ${y} of the base stands ${dE.toFixed(4)} from the default's`)
        const wrong = await page.evaluate(compare, [await shoot(page, off, glide), against])
        assert.ok(wrong.dE > wrong.limit, 'a base a shade off is found')
      }
    }
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
