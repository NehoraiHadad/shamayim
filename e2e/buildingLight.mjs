import assert from 'node:assert/strict'
import { buildingCompatibility } from './buildingCompatibility.mjs'
import { buildingMasks } from './buildingMasks.mjs'
import { CLIP, launch, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'

const cases = ['tiberias-1200', 'haifa-1200', 'jerusalem-1200', 'tel-aviv-1200', 'rosh-pina-1200',
  'haifa-1200-overcast', 'haifa-1630', 'haifa-0620', 'haifa-1710', 'haifa-1734', 'haifa-1735', 'jerusalem-2100']
// Pre-stage-7 native stills measured at the same footprint and rounded to four decimals.
const preStage7FineRms = { tiberias: .0208, haifa: .0260, jerusalem: .0300, 'tel-aviv': .0267, 'rosh-pina': .0268 }
const server = await startServer()
const browser = await launch()
const failures = []
const band = (v, lo, hi, name) => assert.ok(v >= lo && v <= hi, `${name} ${v?.toFixed(3)} outside [${lo}, ${hi}]`)
let canopy = false, water = false

try {
  for (const name of cases) {
    const [, place, time, weather] = /^(.+)-(\d{4})(?:-(overcast))?$/.exec(name)
    const at = `2026-11-17T${time.slice(0, 2)}:${time.slice(2)}`
    const { context, page } = await openPage(browser, server.url, 1)
    try {
      await loadScene(page, sceneUrl(server.url, { place, at, weather }))
      const passes = await page.evaluate(buildingCompatibility)
      assert.ok(passes.background, 'land, canopy or water changed with architecture')
      assert.ok(passes.lampPass && passes.changedArchitecture, 'swapped facade must change architecture while preserving its emissions')
      canopy ||= passes.hasCanopy
      water ||= passes.hasWater
      if (time >= '1710') assert.ok(passes.lampPixels > 0, 'lamp pass needs visible samples')
      if (time >= '1700') continue
      const png = await page.screenshot({ clip: CLIP, animations: 'disabled' })
      const m = await page.evaluate(buildingMasks, png.toString('base64'))
      console.log(name, JSON.stringify(m))
      assert.ok(m.n.bare >= 100 && m.n.front >= 150 && m.pairs >= 50, 'need visible ground and contacting facades')
      if (time === '1200' && !weather) {
        band(m.front, .67, .94, 'shaded wall/ground')
        assert.ok(m.n.roof >= 80, 'flat caps should resolve including beside clay roofs')
        band(m.roof, .86, 1.50, 'flat roof/ground')
        band(m.roof / m.front, 1.18, 1.65, 'flat roof/front')
        band(m.sun, .78, 1.12, 'sunward return/ground')
        band(m.spread, .11, .22, 'all-neighbour spread')
        const peak = place === 'tel-aviv' ? 1.10 : .95
        assert.ok(m.peak <= peak, `built pixel at ${m.peakAt} exceeds ${peak} of frame horizon Y`)
        assert.ok(m.highpass <= 1.28 * preStage7FineRms[place], '1 px high-pass RMS exceeds the round-3 still limit')
        if (place === 'rosh-pina') {
          assert.ok(m.n.tile >= 100, 'clay planes should resolve')
          band(m.tile, .64, .85, 'clay roof/ground')
          assert.ok(m.tileRed <= .95, 'tile red exceeds 95% of horizon red')
        }
      }
      if (weather === 'overcast') {
        band(m.roof / m.front, .97, 1.15, 'overcast cap/facade')
        assert.ok(Math.abs(m.sun - m.side) < .08, 'overcast returns should have similar radiance')
        assert.ok(m.n.cooling >= 4 && m.n.chimney >= 4, 'both industrial silhouettes need samples')
        band(m.chimney, .16, .64, 'chimney/horizon')
        band(m.cooling, .28, .60, 'cooling tower/horizon')
      }
      if (place === 'haifa') {
        assert.ok(m.n.dome >= 14, 'gilded curved surface should resolve')
        band(m.chroma, time === '1200' ? .09 : .054, .20, 'gold chroma')
        if (time !== '1200') {
          band(m.dome, 2.1, 3.1, 'gold/ground')
          band(m.spread, .12, .22, 'twilight neighbour spread')
        }
        if (time === '0620') band(m.frontHorizon, .135, .175, 'dawn front/horizon')
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

assert.ok(canopy && water, 'same-run comparisons must exercise canopy and water')
assert.deepEqual(failures, [])
