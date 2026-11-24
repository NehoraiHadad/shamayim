import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { albedoAtGround } from '../../world/foregroundAlbedo'
import { buildWorld } from '../../world/world'
import { foregroundOf } from '../../world/landLiving'
import type { RGB } from '../../world/types'
import { blendForeground, prepareForeground } from '../paint/shared/land/foregroundMaterial'
import { preparePlaneTexels, samplePlaneTexel, shadeTexelSrgb } from '../paint/shared/land/planeTexel'
import { TEXEL } from './planeBands'
import { projectedRange } from './foregroundMaterial'
import { meanLab, nativeForeground } from './foregroundReference.testSupport'
import { roundOneForeground } from './foregroundRoundOne.testSupport'
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

function band(layer: LayerOf<'plane'>, useForeground: boolean, nativeWorld?: ReturnType<typeof buildWorld>, visibleOnly = false) {
  const t = preparePlaneTexels(layer.outline, layer.bounds, layer.surfaceTone, layer.light.litField,
    layer.grain.seed, 0, useForeground ? layer.foreground : undefined)
  const native = nativeWorld && nativeForeground(nativeWorld, t, BOX.landHeight)
  // The still's 48-pixel foreground band is 24 reference pixels at DPR 2.
  return Array.from({ length: 24 / TEXEL }, (_, r) => {
    const y = BOX.landHeight - (24 / TEXEL - r - 0.5) * TEXEL
    return Array.from({ length: t.wPx }, (_, c) => {
      if (visibleOnly && y < t.crestY[c]) return undefined
      const x = layer.bounds.x + (c + 0.5) * TEXEL
      return native ? native(c, x, y) : shadeTexelSrgb(t, samplePlaneTexel(t, c, x, y))
    }).filter((rgb): rgb is [number, number, number] | RGB => rgb !== undefined)
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

it.each(IDS)('keeps the %s noon foreground continuous and follows the native cover mean', id => {
  const world = buildWorld(worldInput(loaded.get(id)!, NOON))
  const layer = planeLayer(world, BOX, 'near', world.terrain.near, [])!
  const roundOne = { ...layer, foreground: roundOneForeground(world, BOX.landHeight) }
  const sampled = band(layer, true)
  const before = meanLab(band(roundOne, true, undefined, true))
  const after = meanLab(band(layer, true, undefined, true))
  const reference = meanLab(band(layer, false, world, true))
  const distance = (mean: number[]) => Math.hypot(...mean.map((v, i) => v - reference[i]))
  console.info('Foreground visible-area CIE Lab', { id, before, after, reference,
    legacyDeltaE: distance(before), sampledDeltaE: distance(after) })
  expect.soft(distance(after)).toBeLessThanOrEqual(1)

  const edges = sampled.map(edgeSteps)
  for (const row of edges) {
    const sorted = [...row].sort((a, b) => a - b)
    const p90 = sorted[Math.ceil(sorted.length * 0.9) - 1]
    expect(Math.max(...row)).toBeLessThanOrEqual(2.5 * p90)
  }
  expect(correlation(edges[0], edges.at(-1)!)).toBeLessThan(1 - Number.EPSILON)
  if (id === 'haifa') expect(sampled).not.toEqual(band(roundOne, true))
})

it.each(['far', 'back'] as const)('leaves the %s plane palette and lighting identical', name => {
  const world = buildWorld(worldInput(loaded.get('haifa')!, NOON))
  const land = { ...world.land }
  const plane = world.terrain[name] ?? world.terrain.far
  const actual = planeLayer(world, BOX, name, plane, [])
  expect(actual).toBeTruthy()
  expect(actual).toEqual(planeLayer({ ...world, land }, BOX, name, plane, []))
  expect(actual?.foreground).toBeUndefined()
})

it('does not read foreground cover until the near material asks for a cell', () => {
  const input = worldInput(loaded.get('haifa')!, NOON)
  const coverAt = vi.fn((lat: number, lon: number) => input.cover!.coverAt(lat, lon))
  const world = buildWorld({ ...input, cover: { coverAt } })
  const calls = coverAt.mock.calls.length
  const raster = foregroundOf(world.land)!
  expect(coverAt).toHaveBeenCalledTimes(calls)
  albedoAtGround(raster, 0, 0)
  const read = coverAt.mock.calls.length - calls
  expect(read).toBeGreaterThan(0)
  expect(read).toBeLessThanOrEqual(9)
  albedoAtGround(raster, 0, 0)
  expect(coverAt).toHaveBeenCalledTimes(calls + read)
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
  expect(albedoAtGround(raster, 25, 125)).toBeUndefined()
})

it('continues to approach the eye below the innermost DEM sample', () => {
  const ground = [{ km: 0, height: -2 }, { km: 0.4, height: 38 }]
  expect(projectedRange(ground, 95, 0.4)).toBeCloseTo(0.4)
  expect(projectedRange(ground, 80, 0.4)).toBeCloseTo(0.1)
  expect(projectedRange(ground, 60, 0.4)).toBeCloseTo(0.05)
  expect(projectedRange(ground, 96, 0.7)).toBe(0.7)
})

it('preserves a cell-width transition across cover even at the cell centres', () => {
  const raster = {
    east0: 0, north0: 0, eastStep: 50, northStep: 50, cols: 4,
    rgba: Uint8Array.from({ length: 4 * 3 * 4 }, (_, i) => i % 4 === 3 || i % 16 >= 8 ? 255 : 0),
  }
  expect(albedoAtGround(raster, 50, 50)!.rgb[0]).toBeGreaterThan(0)
  expect(albedoAtGround(raster, 100, 50)!.rgb[0]).toBeLessThan(1)
})
