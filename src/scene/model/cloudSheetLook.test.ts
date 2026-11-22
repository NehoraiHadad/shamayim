import { expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import haifaPanorama from '../../test/fixtures/scene/haifa.panorama.json'
import jerusalemPanorama from '../../test/fixtures/scene/jerusalem.panorama.json'
import shadmotPanorama from '../../test/fixtures/scene/shadmot-mehola.panorama.json'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { genusOf } from '../../world/field/genus'
import { makeWorldBuilder } from '../../world/world'
import { rainBankDescs } from './clouds'
import { gridFor } from './cloudSheetGrid'
import { sceneModel } from './index'
import { skyGeom, skyStops, stopAt } from './sky'
import type { LayerOf, RGB } from './types'
import { mixRgb } from './tone'
import { inView } from './weather'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const at = '2026-11-17T11:30'
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
    const rgb = t < 0.5 ? mixRgb(lit, body, t * 2) : mixRgb(body, shade, t * 2 - 1)
    return byte(alpha[i]) * luminance([byte(rgb[0]), byte(rgb[1]), byte(rgb[2])])
  })
  return cloud + (1 - opacity) * behind
}

function correlationLength(pixels: number[][], horizontal: boolean) {
  const width = pixels[0].length, height = pixels.length
  const mean = pixels.flat().reduce((a, b) => a + b, 0) / (width * height)
  const max = horizontal ? width : height
  for (let lag = 1; lag < max; lag++) {
    let cross = 0, a2 = 0, b2 = 0
    for (let y = 0; y < height - (horizontal ? 0 : lag); y++) {
      for (let x = 0; x < width - (horizontal ? lag : 0); x++) {
        const a = pixels[y][x] - mean, b = pixels[y + (horizontal ? 0 : lag)][x + (horizontal ? lag : 0)] - mean
        cross += a * b
        a2 += a * a
        b2 += b * b
      }
    }
    if (cross <= Math.exp(-1) * Math.sqrt(a2 * b2)) return lag
  }
  return max
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
    const { xs, ys, ranges, east, north, altitudes, texture, tau, detail, path } = grid
    const map = (values: number[], scale: number) => ys.map((_, row) => xs.map((_, col) => {
      const value = values[row * xs.length + col]
      return '0.:-=+*#%@'[Math.min(9, Math.floor(value * scale))] ?? '?'
    }).join('')).join('\n')
    if (process.env.SHEET_DUMP) {
      console.log('tau\n' + map(tau, 1), '\ntexture\n' + map(texture, 4), '\nalpha\n' + map(sheet.alpha, 10))
      console.log(ys.map((y, row) => [y, altitudes[row], ranges[row] * east[24], ranges[row] * north[24],
        detail[row * xs.length + 24], path[row]].map(n => n?.toFixed(3)).join(' ')).join('\n'))
    }
    const geom = skyGeom(world, box)
    const first = Math.ceil(geom.dome(30))
    const pixels = Array.from({ length: Math.floor(geom.horizon) - first + 1 }, (_, row) =>
      Array.from({ length: box.width }, (_, x) => sample(xs, ys, x, first + row, i => texture[i])))
    const horizontal = correlationLength(pixels, true), vertical = correlationLength(pixels, false)
    console.info({ horizontal, vertical })
    expect.soft(horizontal).toBeGreaterThan(vertical)
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
      const stops = skyStops(fixture, box)
      const screen = Array.from({ length: Math.floor(geom.horizon) + 1 }, (_, y) =>
        Array.from({ length: box.width }, (_, x) =>
          sheets.reduce((behind, sheet) => paint(sheet, x, y, behind), luminance(stopAt(stops, y / box.skyHeight)))))
      let jump = 0
      for (let y = Math.ceil(geom.dome(10)) + 1; y < screen.length; y++)
        for (let x = 0; x < box.width; x++) jump = Math.max(jump, Math.abs(screen[y][x] - screen[y - 1][x]))
      console.info(fixture.place.id, fixture === showers ? 'showers' : '', { jump })
      expect.soft(jump).toBeLessThanOrEqual(0.03)
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
        const upper = screen.slice(0, Math.floor(geom.horizon / 2)).flat().sort((a, b) => a - b)
        const spread = upper[Math.floor(0.9 * upper.length)] - upper[Math.floor(0.1 * upper.length)]
        console.info({ spread })
        expect.soft(spread).toBeGreaterThanOrEqual(0.06)
      }
    }
  } finally {
    vi.unstubAllGlobals()
  }
}, 30_000)
