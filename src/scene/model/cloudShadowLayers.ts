import type { RGB, TerrainPlanes } from '../../world/types'
import { colourKey, layerKey } from './keys'
import { planeCrest } from './planeCrest'
import type { LayerOf, SceneBox } from './types'

type ShadowLayer = LayerOf<'cloudShadow'>
export type ShadowPlane = ShadowLayer['plane']
export type ShadowBlob = ShadowLayer['blobs'][number]
export type ShadowTerrain = Pick<TerrainPlanes, 'horizonY' | 'sightAt' | 'back'> & Partial<Pick<TerrainPlanes, 'near' | 'far'>>
export type ShadowBox = Pick<SceneBox, 'width' | 'dpr' | 'landHeight'>
const nearerOf = { near: [], far: ['near'], back: ['far', 'near'] } as const
/** Plane z + 0.2: directly over each plane + canopy, strictly BELOW water (12/32), farCities (16), marks (17/40), outside (38). */
const SHADOW_Z: Record<ShadowPlane, number> = { back: 5.2, far: 10.2, near: 30.2 }
const clipKeys = new WeakMap<NonNullable<ShadowLayer['clip']>['crest'], string>()

function crestKey(crest: NonNullable<ShadowLayer['clip']>['crest'] | undefined) {
  if (!crest) return ''
  let key = clipKeys.get(crest)
  if (key === undefined) clipKeys.set(crest, key = layerKey(JSON.stringify(crest)))
  return key
}

const DEFAULT_SHADOW_RGB: RGB = [0.22, 0.25, 0.30]

export function shadowLayers(
  terrain: ShadowTerrain, box: ShadowBox, accepted: { km: number; plane: ShadowPlane; blob: ShadowBlob }[],
  rgb: RGB = DEFAULT_SHADOW_RGB, planes?: readonly LayerOf<'plane'>[],
): ShadowLayer[] {
  const byPlane = new Map<ShadowPlane, ShadowBlob[]>()
  for (const { plane, blob } of accepted.sort((a, b) => a.km - b.km)) {
    const blobs = byPlane.get(plane)
    if (blobs) blobs.push(blob)
    else byPlane.set(plane, [blob])
  }
  const planeByName = new Map(planes?.map((p) => [p.plane, p]))
  return Array.from(byPlane, ([plane, blobs]) => {
    const ground = terrain[plane]
    const fronts = nearerOf[plane].map((p) => terrain[p]).filter((t) => t && t.points.length >= 2)
      .map((t) => planeCrest(t!, box.width))
    const clip = ground && ground.points.length >= 2 ? { crest: planeCrest(ground, box.width), fronts } : null
    const p = planeByName.get(plane)
    const litPlane = p?.light.litField
      ? { outline: p.outline, bounds: p.bounds, surfaceTone: p.surfaceTone, litField: p.light.litField,
          grainSeed: p.grain.seed, grainAmount: p.grain.amount }
      : undefined
    return {
      kind: 'cloudShadow', plane, id: `cloudShadow.${plane}`, surface: 'land', z: SHADOW_Z[plane], soft: true,
      blend: 'source-atop', clip, litPlane, blobs, rgb, bounds: { x: 0, y: 0, w: box.width, h: box.landHeight },
      key: layerKey('cloudShadow', plane, box.width, box.landHeight, box.dpr, p?.light.key ?? colourKey(rgb),
        crestKey(clip?.crest), ...(clip?.fronts ?? []).map(crestKey),
        JSON.stringify(blobs.map(({ x, y, rx, ry, alpha }) => [x * 100, y * 100, rx * 100, ry * 100, alpha * 25500].map(Math.round)))),
    }
  })
}
