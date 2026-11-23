import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildingCompatibility } from './buildingCompatibility.mjs'
import { buildingMasks } from './buildingMasks.mjs'
import { CLIP, launch, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'

const { signatures } = JSON.parse(fs.readFileSync(new URL('./buildingCompatibility.json', import.meta.url)))
const cases = Object.keys(signatures).concat('haifa-0620')
const server = await startServer()
const browser = await launch()
const failures = []
const band = (v, lo, hi, name) => assert.ok(v >= lo && v <= hi, `${name} ${v?.toFixed(3)} outside [${lo}, ${hi}]`)

try {
  for (const name of cases) {
    const [, place, time, weather] = /^(.+)-(\d{4})(?:-(overcast))?$/.exec(name)
    const at = `2026-11-17T${time.slice(0, 2)}:${time.slice(2)}`
    const { context, page } = await openPage(browser, server.url, 1)
    try {
      await loadScene(page, sceneUrl(server.url, { place, at, weather }))
      if (signatures[name]) assert.deepEqual(await page.evaluate(buildingCompatibility), signatures[name], 'receiver or emissive pass changed')
      if (time === '2100') continue
      const png = await page.screenshot({ clip: CLIP, animations: 'disabled' })
      const m = await page.evaluate(buildingMasks, png.toString('base64'))
      console.log(name, JSON.stringify(m))
      assert.ok(m.n.bare >= 40 && m.n.front >= 20, 'mask needs visible dry ground and facade coverage')
      if (time === '1200' && !weather) {
        band(m.front, .67, .95, 'shaded wall/ground')
        if (place === 'rosh-pina') {
          assert.ok(m.n.tile >= 30, 'clay planes should resolve')
          band(m.tile, .60, 1.3, 'clay roof/ground')
        } else {
          assert.ok(m.n.roof >= 15, 'flat roofs should resolve')
          band(m.roof, 1.2, 1.9, 'flat roof/ground')
          band(m.sun, .85, 1.30, 'sunward return/ground')
        }
        assert.ok(m.pairs >= 10, 'need adjacent visible blocks')
        band(m.spread, .11, .4, 'neighbour spread')
      }
      if (weather === 'overcast') {
        assert.ok(m.n.roof >= 15, 'flat roofs should resolve')
        band(m.roof / m.front, 1.01, 1.38, 'overcast cap/facade')
        assert.ok(Math.abs(m.sun - m.side) < .13, 'overcast returns should have similar radiance')
      }
      if (place === 'haifa') {
        assert.ok(m.n.dome >= 8, 'gilded curved surface should resolve')
        band(m.chroma, time === '1200' ? .070 : .030, .35, 'gold chroma')
        if (time !== '1200') {
          band(m.dome, 1.65, 3.5, 'gold/ground')
          band(m.spread, .10, .4, 'twilight neighbour spread')
        }
      }
    } catch (error) {
      failures.push(`${name} ${error.message}`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
  await server.close()
}

assert.deepEqual(failures, [])
