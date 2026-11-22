import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { hashId } from '../../data/landmarks/hash'
import { RANGES } from '../../world/field/cells'
import { densityGrid } from '../../world/field/density'
import { genusOf } from '../../world/field/genus'
import { groundRangeAt } from '../../world/field/project'
import { makeWorldBuilder } from '../../world/world'
import { OVERCAST_HORIZON } from './cloudSheet'
import { sheetTexture, textureCorrection } from './cloudSheetTexture'
import { cloudLayersOf } from './cloudLayers'
import { skyGeom } from './sky'
import { scaleLight } from './tone'

const ids = ['jerusalem', 'haifa']
const at = '2026-11-17T11:30'
const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
let places: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter(place => ids.includes(place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const quantile = (values: number[], p: number) =>
  values.slice().sort((a, b) => a - b)[Math.max(0, Math.ceil(p * values.length) - 1)]

it.each(ids)('shows the recorded %s sheet', id => {
  const broken = id === 'jerusalem'
  const world = makeWorldBuilder()({
    ...worldInput(places.get(id)!, at, at),
    forcedLayers: broken ? { low: 0.6, mid: 0, high: 0 } : null,
    forced: broken
      ? { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2 }
      : { cloudCover: 100, thickCloud: 100, precipitation: 0, weatherCode: 3 },
  })
  const geom = skyGeom(world, box)
  const layers = cloudLayersOf(world, box, geom)
  const sheets = layers.filter(layer => layer.kind === 'cloudSheet')
  for (const { layer, densityGrid, heightKm } of world.cloudField!.snapshot) {
    if (!layer) continue
    const sheet = sheets.find(item => item.lattice === layer.lattice)
    const alpha = sheet?.alpha ?? [0]
    const depths = (sheet?.ys ?? [0, geom.horizon / 2, geom.horizon]).flatMap(y => {
      const range = groundRangeAt(heightKm, geom.domeAltitudeAt(y))
      return (sheet?.xs ?? [0, box.width / 2, box.width]).map(x => {
        const az = geom.azimuthAt(x) * Math.PI / 180
        return densityGrid.tauAt(range * Math.sin(az), range * Math.cos(az))
      })
    })
    console.info(id, layer.lattice, {
      cover: layer.cover, genus: sheet?.genus ?? genusOf(layer.lattice, layer.form, 0.5),
      alphaMean: alpha.reduce((a, b) => a + b, 0) / alpha.length,
      alphaP90: quantile(alpha, 0.9), alphaMax: quantile(alpha, 1),
      tau: [0, 0.1, 0.5, 0.9, 1].map(p => quantile(depths, p)),
    })
  }
  if (broken) {
    const sheet = sheets.find(sheet => sheet.lattice === 'low')!
    expect(sheet.genus).toBe('sc')
    expect(quantile(sheet.alpha, 0.9)).toBeGreaterThan(0.6)
    const field = world.cloudField!.field
    const layer = field.layers.find(item => item.lattice === 'low')!
    const size = 32
    const depths: number[] = [], texture: number[] = []
    const sample = sheetTexture(genusOf('low', layer.form, 0.5), layer, hashId(`${id}:sheet:low`))(0)
    // Sample an equal-area 40 km square in tiles inside the exact raster core.
    const span = RANGES.low[0]
    for (let j = -2; j < 2; j++) for (let i = -2; i < 2; i++) {
      const grid = densityGrid(field, 'low', (i + 0.5) * span, (j + 0.5) * span, span)
      for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
        const x = span * (i + (col + 0.5) / size)
        const y = span * (j + (row + 0.5) / size)
        const depth = grid.tauAt(x, y)
        depths.push(depth)
        texture.push(depth > layer.floorTau ? sample(x, y) : 1)
      }
    }
    const corrected = textureCorrection(texture, depths, Array<number>(depths.length / size).fill(1), size,
      depths.map(depth => Number(depth > layer.floorTau)))
    const coverage = depths.filter((depth, index) => depth * corrected(index) > layer.floorTau + 0.05).length / depths.length
    console.info({ coverage, target: layer.cover })
    expect(Math.abs(coverage - layer.cover)).toBeLessThanOrEqual(0.05)
  } else {
    const deck = sheets.find(sheet => sheet.lattice === 'mid')!
    const rows = deck.ys.filter(y => y < geom.horizon / 2)
    const upper = deck.tone.slice(0, rows.length * deck.xs.length)
    const spread = quantile(upper, 0.9) - quantile(upper, 0.1)
    const channel = deck.body.indexOf(Math.max(...deck.body))
    const body = deck.body[channel], shade = deck.shade[channel]
    const opaqueTone = rows.map(y => {
      const mu = Math.sin(geom.domeAltitudeAt(y) * Math.PI / 180)
      const target = scaleLight(deck.body, OVERCAST_HORIZON + (1 - OVERCAST_HORIZON) * mu)[channel]
      return 0.5 + 0.5 * (body - target) / (body - shade)
    })
    const opaqueSpread = quantile(opaqueTone, 0.9) - quantile(opaqueTone, 0.1)
    console.info({ upperToneSpread: spread, upperP10: quantile(upper, 0.1), upperP90: quantile(upper, 0.9),
      opaqueSpread, rowMedian: rows.map((_, row) =>
        quantile(deck.tone.slice(row * deck.xs.length, (row + 1) * deck.xs.length), 0.5)) })
    // The opaque As deck follows the CIE overcast source ramp, encoded in
    // the painter's sRGB interpolation. Its sampled upper spread is 0.116.
    expect(spread).toBeGreaterThanOrEqual(0.115)
    expect(spread).toBeCloseTo(opaqueSpread, 3)
    expect(layers.every(layer => layer.kind === 'cloudSheet' || layer.kind === 'cloudCells')).toBe(true)
  }
}, 30_000)
