//# allFunctionsCalledOnLoad
import { canopyTones } from './canopyTones'
import { layerKey } from './keys'
import { frondTravel, LAND_GUST, plantWindFade, treeTravel, tuftTravel, type PlantWind } from './landWind'
import { receiverBlobs } from './planeCloudShadow'
import type { Box, LayerOf, PlaneVegetation } from './types'
import { treeExtent, tuftExtent } from './vegShapes'

// A quarter of a CSS pixel over a gust reads as shifting antialias, even at high DPR.
const MIN_SWAY_PX = 0.25

interface CanopyFootprint { left: number; right: number; top: number; bottom: number; travel: number }
const footprints = new WeakMap<PlaneVegetation, CanopyFootprint>()

function footprintOf(veg: PlaneVegetation): CanopyFootprint {
  const held = footprints.get(veg)
  if (held) return held
  const fp = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity, travel: 0 }
  const include = ([x0, y0, x1, y1]: readonly number[], travel: number) => {
    // Reserve the full mean + gust travel on either side and one px for raster coverage.
    const pad = 1 + travel * 1.55
    fp.left = Math.min(fp.left, Math.floor(x0 - pad))
    fp.right = Math.max(fp.right, Math.ceil(x1 + pad))
    fp.top = Math.min(fp.top, Math.floor(y0 - 1))
    fp.bottom = Math.max(fp.bottom, Math.ceil(y1 + 1))
    fp.travel = Math.max(fp.travel, travel)
  }
  const { trees, treeMeta, tufts, tuftMeta } = veg
  for (let i = 0; i < trees.length; i += 6) {
    const x = trees[i], y = trees[i + 1], r = trees[i + 2], h = trees[i + 3], phase = trees[i + 4]
    const m = i / 6 * 3, kind = treeMeta[m]
    const travel = treeTravel(kind, h) + (kind === 3 ? frondTravel(r) : 0)
    include(treeExtent(x, y, r, h, phase, kind, 1), travel * plantWindFade(treeMeta[m + 2] / 255))
  }
  for (let i = 0; i < tufts.length; i += 4) {
    const x = tufts[i], y = tufts[i + 1], r = tufts[i + 2]
    include(tuftExtent(x, y, r, 1), tuftTravel(tuftMeta[i / 2], r) * plantWindFade(tufts[i + 3]))
  }
  footprints.set(veg, fp)
  return fp
}

/** The crowns/tufts interleave with their parent plane's light. Their placement is cached with the ground. */
export function canopyOf(plane: LayerOf<'plane'>, response: PlantWind, clear: readonly Box[], animate = true): LayerOf<'canopy'> | null {
  if (!plane.canopyId) return null
  const { vegetation, outline, bounds } = plane
  const { left, right, top, bottom, travel } = footprintOf(vegetation)
  const x = Math.max(bounds.x, left), y = Math.max(bounds.y, top)
  const w = Math.max(1, Math.min(bounds.x + bounds.w, right) - x)
  const h = Math.max(1, Math.min(bounds.y + bounds.h, bottom) - y)
  const gust = Math.abs(response.gust) * travel >= MIN_SWAY_PX ? response.gust : 0
  const lean = travel ? response.lean : 0
  const { seed, tones: rawTones, trees, treeMeta, tufts, tuftMeta } = vegetation
  const zones = lean || gust ? clear : []
  const key = layerKey('canopy', plane.key, lean, gust, zones)
  const canopyBounds = { x, y, w, h }
  const shadow = plane.cloudShadow
  const cloudShadow = shadow && receiverBlobs(shadow, canopyBounds, shadow.speed !== 0) ? shadow : undefined
  const { tones, shadedTones } = canopyTones(plane, Boolean(cloudShadow))
  return {
    kind: 'canopy', surface: 'land', id: plane.canopyId, z: plane.z + 0.1, key, receiver: { form: plane.key },
    bounds: canopyBounds, outline, vegetation: { seed, tones: rawTones, trees, treeMeta, tufts, tuftMeta }, wind: { lean, gust },
    clear: zones,
    animated: animate && gust ? { mode: 'frames', frames: LAND_GUST } : undefined,
    cloudShadow: shadedTones && cloudShadow, tones, shadedTones,
    light: { key: layerKey(key, tones.key), blend: 'source-over' },
  }
}
