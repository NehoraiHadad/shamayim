import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { albedoAtGround } from '../../world/foregroundAlbedo'
import { buildWorld } from '../../world/world'
import type { RGB } from '../../world/types'
import { blendForeground, prepareForeground } from '../paint/shared/land/foregroundMaterial'
import { preparePlaneTexels, samplePlaneTexel, shadeTexelSrgb } from '../paint/shared/land/planeTexel'
import { TEXEL } from './planeBands'
import { planeLayer } from './planes'
import { labOf } from './tone'
import type { LayerOf, SceneBox } from './types'

const IDS = ['haifa', 'jerusalem', 'tel-aviv', 'beit-shean', 'shadmot-mehola']
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const NOON = '2026-11-17T12:00'
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter(place => IDS.includes(place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

function band(layer: LayerOf<'plane'>, useForeground: boolean) {
  const t = preparePlaneTexels(layer.outline, layer.bounds, layer.surfaceTone, layer.light.litField,
    layer.grain.seed, 0, useForeground ? layer.foreground : undefined)
  // The still's 48-pixel foreground band is 24 reference pixels at DPR 2.
  return Array.from({ length: 24 / TEXEL }, (_, r) => {
    const y = BOX.landHeight - (24 / TEXEL - r - 0.5) * TEXEL
    return Array.from({ length: t.wPx }, (_, c) => {
      const x = layer.bounds.x + (c + 0.5) * TEXEL
      return shadeTexelSrgb(t, samplePlaneTexel(t, c, x, y))
    })
  })
}

function edgeSteps(row: RGB[]) {
  const lab = row.map(labOf)
  return lab.slice(1).map(({ l, a, b }, i) => Math.hypot(l - lab[i].l, a - lab[i].a, b - lab[i].b))
}

function correlation(a: number[], b: number[]) {
  const energy = (xs: number[]) => xs.reduce((sum, x) => sum + x * x, 0)
  const norm = Math.sqrt(energy(a) * energy(b))
  return norm ? a.reduce((sum, x, i) => sum + x * b[i], 0) / norm : 0
}

function cieLab(rgb: RGB) {
  const lin = rgb.map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
  // sRGB to CIE XYZ with the D65 reference white, then CIE 1976 Lab.
  const xyz = [[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]]
  const white = [0.95047, 1, 1.08883]
  const d = 6 / 29
  const [x, y, z] = xyz.map((row, i) => {
    const t = row.reduce((sum, v, c) => sum + v * lin[c], 0) / white[i]
    return t > d ** 3 ? Math.cbrt(t) : t / (3 * d ** 2) + 4 / 29
  })
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

function meanLab(rows: RGB[][]) {
  const values = rows.flat().map(cieLab)
  return [0, 1, 2].map(i => values.reduce((sum, lab) => sum + lab[i], 0) / values.length)
}

it.each(IDS)('keeps the %s noon foreground continuous and preserves its mean colour', id => {
  const world = buildWorld(worldInput(loaded.get(id)!, NOON))
  const layer = planeLayer(world, BOX, 'near', world.terrain.near, [])!
  const legacy = band(layer, false)
  const sampled = band(layer, true)
  const meanBefore = meanLab(legacy), meanAfter = meanLab(sampled)
  expect(Math.hypot(...meanAfter.map((v, i) => v - meanBefore[i]))).toBeLessThanOrEqual(2)

  const edges = sampled.map(edgeSteps)
  for (const row of edges) {
    const sorted = [...row].sort((a, b) => a - b)
    const p90 = sorted[Math.ceil(sorted.length * 0.9) - 1]
    expect(Math.max(...row)).toBeLessThanOrEqual(2.5 * p90)
  }
  expect(correlation(edges[0], edges.at(-1)!)).toBeLessThan(1 - Number.EPSILON)
  if (id === 'haifa') expect(sampled).not.toEqual(legacy)
})

it.each(['far', 'back'] as const)('leaves the %s plane palette and lighting identical', name => {
  const world = buildWorld(worldInput(loaded.get('haifa')!, NOON))
  const land = { ...world.land, foreground: undefined }
  const plane = world.terrain[name] ?? world.terrain.far
  const actual = planeLayer(world, BOX, name, plane, [])
  expect(actual).toBeTruthy()
  expect(actual).toEqual(planeLayer({ ...world, land }, BOX, name, plane, []))
  expect(actual?.foreground).toBeUndefined()
})

it('keeps the base colour past 700 m between foreground grid samples', () => {
  const material = prepareForeground({
    cols: 2, rows: 1, rangeKm: Float32Array.of(0.4, 1.01),
    rgba: Uint8Array.of(80, 105, 70, 255, 0, 0, 0, 0),
  })
  const rgb: [number, number, number] = [0.08, 0.08, 0.08]
  blendForeground(material, 0.5, 0, rgb)
  expect(rgb).toEqual([0.08, 0.08, 0.08])
  blendForeground(material, 0, 0, rgb)
  expect(rgb).not.toEqual([0.08, 0.08, 0.08])
})

it('interpolates BOA reflectance at the cell-size scale and fades across water', () => {
  const raster = {
    east0: 0, north0: 0, eastStep: 50, northStep: 50, cols: 2,
    rgba: Uint8Array.of(0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0, 255, 255, 255, 0),
  }
  const middle = albedoAtGround(raster, 25, 25)!
  expect(middle.dryShare).toBe(0.5)
  // IEC sRGB encoding of 50% linear reflectance, independent of the excluded water cells.
  expect(middle.rgb[0]).toBeCloseTo(0.73536, 5)
  expect(middle.rgb).toEqual([middle.rgb[0], middle.rgb[0], middle.rgb[0]])
  expect(albedoAtGround(raster, 25, 50)).toBeUndefined()
})
