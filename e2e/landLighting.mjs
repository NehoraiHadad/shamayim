// Targeted rendered regressions for Stage 7, using the real scene harness and unchanged approved stills.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { CASES } from './cases.mjs'
import { caseName, CLIP, launch, loadScene, openPage, root, sceneUrl, startServer } from './harness.mjs'
import { receiverPixels } from './landReceiver.mjs'

const capture = process.argv.find((arg) => arg.startsWith('--capture='))?.slice('--capture='.length)
const cases = CASES.filter((c) => /-(0620|1200|1630)$/.test(caseName(c)) || caseName(c) === 'tiberias-1200-snow')
const texturePatches = { tiberias: [238, 375, 350, 417], jerusalem: [92, 404, 148, 420], 'ramon-crater': [87, 391, 143, 420] }
const failures = []
const server = await startServer()
const browser = await launch()

try {
  if (capture) fs.mkdirSync(capture, { recursive: true })
  for (const c of cases) {
    const name = caseName(c)
    const { context, page } = await openPage(browser, server.url)
    try {
      await loadScene(page, sceneUrl(server.url, c))
      const actual = await page.screenshot({ clip: CLIP, animations: 'disabled' })
      if (capture) fs.writeFileSync(path.join(capture, name + '.png'), actual)
      const ref = fs.readFileSync(path.join(root, 'e2e/__pixels__', name + '.png'))
      const result = await page.evaluate(async ({ images, patch, snow }) => {
        const { groundAt } = await import('/src/world/sceneLight.ts')
        const { near, far, back } = window.__world.terrain
        const crest = (x) => groundAt(near.points, x) + 300
        const skyline = (x) => 300 + Math.min(...[near, far, back].filter((p) => p?.points.length).map((p) => groundAt(p.points, x)))
        const lin = (byte) => {
          const v = byte / 255
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
        }
        const q = (values, p) => values.sort((a, b) => a - b)[Math.floor((values.length - 1) * p)]
        return Promise.all(images.map(async (base64) => {
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
          const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
          const ctx = new OffscreenCanvas(image.width, image.height).getContext('2d')
          ctx.drawImage(image, 0, 0)
          const { data, width, height } = ctx.getImageData(0, 0, image.width, image.height)
          const Y = (x, y) => {
            const i = (y * width + x) * 4
            return 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2])
          }
          const land = [], sky = [], texture = [], snowNear = [], snowFar = []
          for (let x = 0; x < width; x++) {
            const edge = Math.round(skyline(x))
            for (let y = edge + 2; y < height; y++) land.push(Y(x, y))
            for (let y = edge - 14; y < edge - 3; y++) if (y >= 0) sky.push(Y(x, y))
            if (snow && x >= 41 && x < 71) {
              const ridge = Math.round(crest(x))
              for (let d = 3; d <= 6; d++) { snowNear.push(Y(x, ridge + d)); snowFar.push(Y(x, ridge - d)) }
            }
          }
          if (patch) for (let x = patch[0]; x < patch[2]; x++) for (let y = patch[1]; y < patch[3]; y++) {
            const neighbours = (Y(x - 5, y) + Y(x + 5, y) + Y(x, y - 5) + Y(x, y + 5)) / 4
            if (neighbours > 0) texture.push(Math.abs(Y(x, y) - neighbours) / neighbours)
          }
          return { ratio: q(land, 0.5) / q(sky, 0.5), spread: [q(land, 0.1), q(land, 0.5), q(land, 0.9)],
            texture: q(texture, 0.5), snowPair: snow ? [q(snowNear, 0.5), q(snowFar, 0.5)] : undefined }
        }))
      }, { images: [actual, ref].map((image) => image.toString('base64')),
        patch: name.endsWith('-1200') ? texturePatches[c.place] : undefined, snow: c.weather === 'snow' })
      const [a, b] = result
      console.log(name, JSON.stringify(a), 'reference', JSON.stringify(b))
      if (name.endsWith('-0620') || name.endsWith('-1630')) {
        assert.ok(a.ratio / b.ratio >= 0.75 && a.ratio / b.ratio <= 1.25, 'twilight ratio outside 25% of the reference')
      } else if (name.endsWith('-1200')) {
        assert.ok(a.ratio >= 0.22 && a.ratio <= 0.40, 'noon ratio outside the land target')
      }
      if (a.texture !== undefined && c.place !== 'jerusalem') assert.ok(a.texture / b.texture >= 0.72 && a.texture / b.texture <= 1.33, 'foreground texture outside reference band')
      if (a.snowPair) assert.ok(Math.abs(a.snowPair[0] - a.snowPair[1]) > 0.035, 'snowy planes have no visible separation')
    } catch (error) {
      failures.push(name + ' ' + error.message)
    } finally {
      await context.close()
    }
  }
  const { page, context } = await openPage(browser, server.url)
  try {
    await page.goto(server.url + '/scene.html')
    await receiverPixels(page)
    await receiverPixels(page, 2)
  } catch (error) {
    failures.push(error.message)
  } finally {
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
assert.deepEqual(failures, [])
