import assert from 'node:assert/strict'
import { buildingCompatibility } from './buildingCompatibility.mjs'
import { buildingColorChecks } from './buildingColorChecks.mjs'
import { buildingMasks } from './buildingMasks.mjs'
import { buildingShadowChecks } from './buildingShadowChecks.mjs'
import { CLIP, launch, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'

const cases = ['tiberias-1200', 'haifa-1200', 'jerusalem-1200', 'tel-aviv-1200', 'rosh-pina-1200',
  ...['tiberias', 'jerusalem', 'tel-aviv', 'rosh-pina'].flatMap(place => [`${place}-0620`, `${place}-1630`]),
  'haifa-1200-overcast', 'haifa-1630', 'haifa-0620', 'haifa-1710', 'haifa-1734', 'haifa-1735', 'jerusalem-2100',
  'jerusalem-1200-broken']
// Pre-stage-7 native stills measured at the same footprint and rounded to four decimals.
const preStage7FineRms = { tiberias: .0208, haifa: .0260, jerusalem: .0300, 'tel-aviv': .0267, 'rosh-pina': .0268 }
const server = await startServer()
const browser = await launch()
const failures = []
const band = (v, lo, hi, name) => assert.ok(v >= lo && v <= hi, `${name} ${v?.toFixed(3)} outside [${lo}, ${hi}]`)
const rasterBand = ([min, max], lo, hi, label) => assert.ok(max >= lo && min <= hi,
  `${label} [${min.toFixed(3)}, ${max.toFixed(3)}] misses [${lo}, ${hi}] with 4 sRGB levels of tolerance`)
let canopy = false, water = false

try {
  for (const name of cases) {
    const [, place, time, weather] = /^(.+)-(\d{4})(?:-(overcast|broken))?$/.exec(name)
    const at = `2026-11-17T${time.slice(0, 2)}:${time.slice(2)}`
    const { context, page } = await openPage(browser, server.url, 1)
    try {
      await loadScene(page, sceneUrl(server.url, { place, at, weather }))
      if (weather === 'broken') {
        const s = await page.evaluate(buildingShadowChecks)
        console.log(name, JSON.stringify(s))
        assert.ok(s.blobs.length >= 2 && s.broad.length === 2, 'exercise both foreshortened CI shadows')
        for (const b of s.blobs) {
          assert.ok(b.lobes >= .08, `cell ${b.id} needs a varied outline`)
          band(b.areaRatio, .95, 1.05, 'per-cell removed beam area')
        }
        for (const b of s.broad) {
          band(b.edgePx, 4.2, 8, 'vertical 10–90% transmission width in CSS px')
          band(b.stampArea / b.area, .95, 1.05, 'raster stamp beam area')
          assert.ok(b.samples >= 40 && b.diffuseView > 0 && b.diffuseView < 1, 'sample real shade and diffuse view')
          band(b.shadowY, .35, .60, 'shadow / sun')
          band(b.cool, 1, 1.65, 'shadow / sun B/R')
        }
        assert.ok(s.endpointStep <= 1e-5, 'a blob grazing the receiver must not step its endpoint')
        assert.ok(s.singleStep <= 1e-6, 'the last trace of a shadow must carry vanishing diffuse light')
        assert.ok(s.movingEndpoint > 0 && s.movingStep <= 1e-6, 'a moving blob must carry its diffuse endpoint into the next minute')
        assert.ok(s.movingGrazingStep <= 1e-6, 'a moving blob must fade in at the edge of the receiver sweep')
        continue
      }
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
      const colors = await page.evaluate(buildingColorChecks)
      console.log(`${name} colors`, JSON.stringify(colors))
      assert.ok(m.n.bare >= 100 && m.n.front >= 150 && m.pairs >= 50, 'need visible ground and contacting facades')
      if (time === '1200' && !weather) {
        for (const pane of colors.glass) band(pane.ratio, 1, 1.8, 'glass / corresponding shaded wall')
        assert.ok(colors.wallBR > 0 && colors.groundBR > 0, 'measure wall and sky-only ground colors')
        // Jerusalem and Rosh Pina have cooler plaster than their own ground samples.
        band(colors.wallBR / colors.groundBR, .95, place === 'tel-aviv' ? 1.05 : 1.16, 'wall / sky-only ground B/R')
        band(m.front, .67, .94, 'shaded wall/ground')
        assert.ok(m.n.roof >= 80, 'flat caps should resolve including beside clay roofs')
        band(m.roof, .86, 1.50, 'flat roof/ground')
        band(m.roof / m.front, 1.18, 1.65, 'flat roof/front')
        band(m.sun, .78, 1.12, 'sunward return/ground')
        band(m.spread, .11, .24, 'all-neighbour spread')
        assert.ok(m.peak <= 1.15, `built pixel at ${m.peakAt} exceeds 1.15 of frame horizon Y`)
        assert.ok(m.highpass <= 1.34 * preStage7FineRms[place], '1 px high-pass RMS exceeds the relief limit')
        if (place === 'rosh-pina') {
          assert.ok(m.n.tile >= 100, 'clay planes should resolve')
          band(m.tile, .64, .85, 'clay roof/ground')
          const maxRed = Math.min(m.horizonRed, Math.floor(.97 * m.horizonRed) + 4)
          assert.ok(Math.round(m.tileRed * m.horizonRed) <= maxRed, `tile red exceeds ${maxRed} with raster tolerance`)
        }
      }
      if (weather === 'overcast') {
        band(m.roof / m.front, .97, 1.15, 'overcast cap/facade')
        assert.ok(Math.abs(m.sun - m.side) < .08, 'overcast returns should have similar radiance')
        assert.ok(m.n.cooling >= 4 && m.n.chimney >= 4, 'both industrial silhouettes need samples')
        band(m.chimney, .16, .64, 'chimney/horizon')
        band(m.cooling, .28, .60, 'cooling tower/horizon')
      }
      if (time !== '1200') {
        rasterBand(m.frontYRange, .6, 1.3, 'twilight wall/ground Y')
        rasterBand(m.frontBRRange, .8, 1.25, 'twilight wall/ground B/R')
        if (place === 'haifa' || place === 'tel-aviv') assert.ok(colors.glass.length > 0, 'measure twilight panes')
        for (const pane of colors.glass) {
          band(pane.frontRatio, .75, 1.001, 'twilight glass / corresponding front wall')
          assert.ok(pane.redMinusBlue < .025, 'no red panes in the twilight skyline')
        }
      }
      if (place === 'haifa') {
        assert.ok(m.n.dome >= 14, 'gilded curved surface should resolve')
        band(m.chroma, time === '1200' ? .09 : .045, .20, 'gold chroma')
        if (time !== '1200') {
          band(m.dome, 2.1, 3.1, 'gold/ground')
          band(m.spread, .10, .24, 'twilight neighbour spread')
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

assert.ok(canopy && water, 'same-run comparisons must exercise canopy and water')
assert.deepEqual(failures, [])
