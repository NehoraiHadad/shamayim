import type { TerrainPlanes } from '../../world/types'
import { layerKey } from './keys'
import { planeCrest } from './planeCrest'
import type { LayerOf, SceneBox } from './types'

type ShadowLayer = LayerOf<'cloudShadow'>
export type ShadowPlane = ShadowLayer['plane']
export type ShadowBlob = ShadowLayer['blobs'][number]
export type ShadowTerrain = Pick<TerrainPlanes, 'horizonY' | 'sightAt' | 'back'> & Partial<Pick<TerrainPlanes, 'near' | 'far'>>
export type ShadowBox = Pick<SceneBox, 'width' | 'dpr' | 'landHeight'>
const frontOf = { near: undefined, far: 'near', back: 'far' } as const
const clipKeys = new WeakMap<NonNullable<ShadowLayer['clip']>['crest'], string>()

function crestKey(crest: NonNullable<ShadowLayer['clip']>['crest'] | undefined) {
  if (!crest) return ''
  let key = clipKeys.get(crest)
  if (key === undefined) clipKeys.set(crest, key = layerKey(JSON.stringify(crest)))
  return key
}

export function shadowLayers(terrain: ShadowTerrain, box: ShadowBox,
  accepted: { km: number; plane: ShadowPlane; blob: ShadowBlob }[]): ShadowLayer[] {
  const byPlane = new Map<ShadowPlane, ShadowBlob[]>()
  for (const { plane, blob } of accepted.sort((a, b) => a.km - b.km)) {
    const blobs = byPlane.get(plane)
    if (blobs) blobs.push(blob)
    else byPlane.set(plane, [blob])
  }
  return Array.from(byPlane, ([plane, blobs]) => {
    const ground = terrain[plane]
    const face = frontOf[plane]
    const next = face && terrain[face]
    const front = next && next.points.length >= 2 ? next : terrain.near
    const clip = ground && ground.points.length >= 2 ? {
      crest: planeCrest(ground, box.width),
      front: face && front && front.points.length >= 2 ? planeCrest(front, box.width) : undefined,
    } : null
    return {
      kind: 'cloudShadow', plane, id: `cloudShadow.${plane}`, surface: 'land', z: 40.3, soft: true, blend: 'source-atop',
      clip, blobs, rgb: [0.04, 0.06, 0.12], bounds: { x: 0, y: 0, w: box.width, h: box.landHeight },
      key: layerKey('cloudShadow', plane, box.width, box.landHeight, box.dpr, crestKey(clip?.crest), crestKey(clip?.front),
        JSON.stringify(blobs.map(({ x, y, rx, ry, alpha }) => [x * 100, y * 100, rx * 100, ry * 100, alpha * 25500].map(Math.round)))),
    }
  })
}
