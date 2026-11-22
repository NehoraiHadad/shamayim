import { expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import haifaPanorama from '../../test/fixtures/scene/haifa.panorama.json'
import jerusalemPanorama from '../../test/fixtures/scene/jerusalem.panorama.json'
import shadmotPanorama from '../../test/fixtures/scene/shadmot-mehola.panorama.json'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { genusOf } from '../../world/field/genus'
import { makeWorldBuilder } from '../../world/world'
import { rainBankDescs } from './clouds'
import { gridFor, sheetAlphaAt } from './cloudSheetGrid'
import { sceneModel } from './index'
import { skyGeom, skyStops, stopAt } from './sky'
import type { LayerOf, RGB } from './types'
import { mix } from '../paint/hand'
import { cloudSheetOf, OVERCAST_HORIZON } from './cloudSheet'
import { scaleLight } from './tone'
import { inView } from './weather'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const at = '2026-11-17T11:30'
/** Rows a seam must persist over: about one degree of dome near the horizon. */
const SEAM = 6
const elevations = { haifa: haifaPanorama.groundM, jerusalem: jerusalemPanorama.groundM, 'shadmot-mehola': shadmotPanorama.groundM }
const band = (ys: number[], y: number) => {
  const row = ys.findIndex(value => value > y) - 1
  return row < 0 ? ys.length - 2 : row
}

function sample(xs: number[], ys: number[], x: number, y: number, texel: (i: number) => number) {
  const column = x * (xs.length - 1) / xs.at(-1)!
  const col = Math.min(xs.length - 2, Math.floor(column))
  const row = band(ys, y)
  const hit = row * xs.length + col
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  return lerp(lerp(texel(hit), texel(hit + 1), column - col),
    lerp(texel(hit + xs.length), texel(hit + xs.length + 1), column - col), (y - ys[row]) / (ys[row + 1] - ys[row]))
}

const luminance = (rgb: RGB) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
const byte = (value: number) => Math.round(255 * value) / 255

function paint(sheet: LayerOf<'cloudSheet'>, x: number, y: number, behind: number) {
  const { xs, ys, alpha, tone, body, shade, lit } = sheet
  const opacity = sample(xs, ys, x, y, i => byte(alpha[i]))
  const cloud = sample(xs, ys, x, y, i => {
    const t = tone[i]
    const rgb = t < 0.5 ? mix(lit, body, t * 2) : mix(body, shade, t * 2 - 1)
    return byte(alpha[i]) * luminance([byte(rgb[0]), byte(rgb[1]), byte(rgb[2])])
  })
  return cloud + (1 - opacity) * behind
}

const linear = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

function checkBroken(sheet: LayerOf<'cloudSheet'>, top: number, bottom: number, checkAspect: boolean) {
  const width = box.width
  const rows = Array.from({ length: bottom - top + 1 }, (_, row) =>
    Array.from({ length: width }, (_, x) => sheetAlphaAt(sheet, x, top + row)))
  const deviations = rows.map(row => {
    const mean = row.reduce((sum, alpha) => sum + alpha, 0) / width
    return Math.sqrt(row.reduce((sum, alpha) => sum + (alpha - mean) ** 2, 0) / width)
  })
  const deviation = Math.min(...deviations)
  console.info({ deviation })
  expect.soft(deviation).toBeGreaterThanOrEqual(0.08)
  if (!checkAspect) return
  const pixels = rows.flat().map(alpha => alpha > 0.5)
  const aspects: number[] = []
  for (let i = 0; i < pixels.length; i++) {
    if (!pixels[i]) continue
    pixels[i] = false
    const queue = [i]
    let left = width, right = 0, upper = rows.length, lower = 0
    for (const index of queue) {
      const x = index % width, y = Math.floor(index / width)
      left = Math.min(left, x)
      right = Math.max(right, x)
      upper = Math.min(upper, y)
      lower = Math.max(lower, y)
      for (const next of [x ? index - 1 : -1, x + 1 < width ? index + 1 : -1, index - width, index + width]) {
        if (!pixels[next]) continue
        pixels[next] = false
        queue.push(next)
      }
    }
    aspects.push((right - left + 1) / (lower - upper + 1))
  }
  aspects.sort((a, b) => a - b)
  const median = (aspects[Math.floor((aspects.length - 1) / 2)] + aspects[Math.floor(aspects.length / 2)]) / 2
  console.info({ components: aspects.length, median })
  expect.soft(median).toBeGreaterThanOrEqual(1.5)
}

it('projects the Jerusalem broken deck on ground-plane rays', async () => {
  stubPublicFetch()
  try {
    const places = await loadPlaces(SCENE_PLACES.filter(p => ['jerusalem', 'haifa', 'shadmot-mehola'].includes(p.id)))
    const build = makeWorldBuilder()
    const input = (place: keyof typeof elevations) => {
      const source = worldInput(places.get(place)!, at)
      return { ...source, forecast: { ...source.forecast, elevation: elevations[place] } }
    }
    const world = build({ ...input('jerusalem'),
      forced: { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2 },
      forcedLayers: { low: 0.6, mid: 0, high: 0 } })
    const sheet = sceneModel(world, box).layers.find(l => l.kind === 'cloudSheet' && l.lattice === 'low')
    expect(sheet).toBeDefined()
    if (!sheet || sheet.kind !== 'cloudSheet') return
    const snapshot = world.cloudField!.snapshot.find(s => s.layer?.lattice === 'low')!
    const layer = snapshot.layer!
    const grid = gridFor(world.place.id, layer, skyGeom(world, box), snapshot.heightKm, genusOf('low', layer.form, 0.5))
    const geom = skyGeom(world, box)
    const sorted = (values: number[]) => values.sort((a, b) => a - b)
    const radii = sorted(snapshot.cells.filter(cell => cell.genus === 'sc').map(cell => cell.r))
    const depths = sorted(snapshot.cells.filter(cell => cell.genus === 'sc').map(cell => cell.tau0))
    console.info('Jerusalem', { g: layer.g, base: layer.baseKm, depth: layer.meanVKm, wind: layer.vel,
      projection: [20, 45, 50, 89].map(a => (geom.dome(a - 0.1) - geom.dome(a + 0.1)) / 0.2),
      radii: [0.1, 0.5, 0.9].map(q => radii[Math.floor(q * radii.length)]),
      tauMedian: depths[Math.floor(depths.length / 2)],
      rangeAtFive: grid.ranges[60], resolvedRange: snapshot.densityGrid.rayRange })
    checkBroken(sheet, Math.ceil(geom.dome(20)), Math.floor(geom.dome(5)), true)
    const showers = build({ ...input('haifa'),
      forced: { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25,
        windGusts: 45, windDirection: 250, humidity: 80 } })
    const raining = showers.clouds.find(l => l.rains)
    const rainGeom = skyGeom(showers, box)
    const banks = raining ? rainBankDescs(showers, box, rainGeom, raining) : []
    expect(banks).toHaveLength(6)
    const seen = banks.filter(({ drawn }) => inView(rainGeom, box, drawn))
    console.info('Haifa rain in view', seen.map(({ bank }) => ({ azimuth: bank.azimuth, altitude: bank.altitude, km: bank.distanceKm })))
    const layers = sceneModel(showers, box).layers
    const shafts = layers.findIndex(l => l.id === 'shafts')
    const rainDeck = layers.findIndex(l => l.id === 'cloudSheet.mid')
    expect.soft(rainDeck).toBeGreaterThanOrEqual(0)
    expect.soft(shafts).toBeGreaterThan(rainDeck)
    expect.soft(layers.findIndex(l => l.id === 'fall.far')).toBeGreaterThan(rainDeck)
    expect.soft(layers.some(l => l.id === 'edge')).toBe(false)
    const overcast = build({ ...input('haifa'),
      forced: { cloudCover: 100, thickCloud: 100, precipitation: 0, weatherCode: 3 } })
    const shadmot = build({ ...input('shadmot-mehola'),
      forced: { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2 },
      forcedLayers: { low: 0.6, mid: 0, high: 0 } })
    for (const fixture of [world, shadmot, overcast, showers]) {
      const geom = skyGeom(fixture, box)
      const sheets = sceneModel(fixture, box).layers.filter(l => l.kind === 'cloudSheet')
      if (fixture === shadmot) {
        const low = sheets.find(sheet => sheet.lattice === 'low')!
        checkBroken(low, Math.ceil(geom.dome(20)), Math.floor(geom.dome(5)), false)
      }
      const stops = skyStops(fixture, box)
      const screen = Array.from({ length: Math.floor(geom.horizon) + 1 }, (_, y) =>
        Array.from({ length: box.width }, (_, x) =>
          sheets.reduce((behind, sheet) => paint(sheet, x, y, behind), luminance(stopAt(stops, y / box.skyHeight)))))
      let jump = 0, jumpRow = 0, rowJump = 0
      const rows: number[] = []
      for (let y = Math.ceil(geom.dome(10)) + 1; y < screen.length; y++) {
        let sum = 0
        for (let x = 0; x < box.width; x++) {
          const delta = screen[y][x] - screen[y - 1][x]
          sum += delta
          if (Math.abs(delta) > jump) {
            jump = Math.abs(delta)
            jumpRow = y
          }
        }
        rows.push(sum / box.width)
      }
      // A seam persists: compare the mean of the SEAM rows above each row with the SEAM rows below it.
      const levels = rows.map((_, i) => rows.slice(0, i + 1).reduce((a, b) => a + b, 0))
      const mean = (from: number) => levels.slice(from, from + SEAM).reduce((a, b) => a + b, 0) / SEAM
      for (let i = SEAM; i + SEAM <= levels.length; i++) rowJump = Math.max(rowJump, Math.abs(mean(i) - mean(i - SEAM)))
      console.info(fixture.place.id, fixture === showers ? 'showers' : '', { jump, rowJump,
        jumpAltitude: geom.domeAltitudeAt(jumpRow), ranges: fixture.cloudField?.snapshot.map(s => s.densityGrid.rayRange) })
      // A seam is a lasting step in the row mean. Resolved cell edges and rows of elements near the horizon are real
      // short steps, so the per-pixel bound applies only to the closed overcast, which has no edges.
      expect.soft(rowJump, fixture.place.id).toBeLessThanOrEqual(0.03)
      if (fixture === overcast) expect.soft(jump).toBeLessThanOrEqual(0.03)
      if (fixture === overcast) {
        for (const sheet of sheets) {
          const snap = fixture.cloudField!.snapshot.find(s => s.layer?.lattice === sheet.lattice)!
          const layer = snap.layer!
          const { tau } = gridFor(fixture.place.id, layer, geom, snap.heightKm, genusOf(layer.lattice, layer.form, 0.5))
          const opaque = sheet.alpha.filter((_, i) => tau[i] >= 10)
          console.info(sheet.lattice, { thick: opaque.length, minAlpha: Math.min(...opaque) })
          if (sheet.lattice === 'mid') expect.soft(opaque.length).toBeGreaterThan(0)
          if (opaque.length) expect.soft(Math.min(...opaque)).toBeGreaterThanOrEqual(0.97)
        }
        const snap = fixture.cloudField!.snapshot.find(s => s.layer?.lattice === 'mid')!
        const body = [0.73, 0.73, 0.73] as const
        const closed = cloudSheetOf(fixture, geom, {
          ...snap, layer: { ...snap.layer!, cover: 1 },
          densityGrid: { ...snap.densityGrid, tauAt: () => 10, expectedTauAt: () => 10 },
        }, { body, shade: scaleLight(body, OVERCAST_HORIZON), lit: body, light: 0, closed: 1 })!
        const ratio = linear(paint(closed, box.width / 2, geom.dome(90), 0))
          / linear(paint(closed, box.width / 2, geom.dome(5), 0))
        console.info({ ratio })
        expect.soft(ratio).toBeGreaterThanOrEqual(2.5)
        expect.soft(ratio).toBeLessThanOrEqual(3.5)
      }
    }
  } finally {
    vi.unstubAllGlobals()
  }
}, 30_000)
