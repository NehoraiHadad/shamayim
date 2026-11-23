//# allFunctionsCalledOnLoad
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { layerKey, skyBoxKey } from './keys'
import type { SkyGeom } from './sky'
import { mixRgb } from './tone'
import type { FallingCloud, LayerOf, Pt, RGB, SceneBox } from './types'
import { nearest, type PrecipState } from './shafts'
import { clamp01, q, tone } from './weatherShared'

/**
 * The edge mark (true-scene plan): it rains or snows, but none of the banks it falls from is in view. A heavy bank with
 * its curtain, cut by the frame's edge on the side the nearest of them truly lies, low over the horizon: the rain is
 * there, out of the frame. Static (it marks a direction, not a cloud's place on the band).
 */
export function edgeMark(world: WorldState, box: SceneBox, geom: SkyGeom, banks: readonly FallingCloud[], p: PrecipState, horizonSky: RGB): LayerOf<'edge'> | null {
  const mid = geom.left + box.width / 2
  const nearestBank = banks.map((f) => ({ f, x: nearest(f.x, mid, geom.period) }))
    .sort((a, b) => Math.abs(a.x - mid) - Math.abs(b.x - mid))[0]
  if (!nearestBank) return null
  const side = nearestBank.x < mid ? 'left' : 'right'
  const b = nearestBank.f
  const w = Math.min(box.width * 0.36, Math.max(70, b.w * 0.9))
  const h = Math.max(18, Math.min(34, w * 0.3))
  // The bank stands clear over the land at that edge (the highest crest under it), its curtain falling behind the ridge.
  const sx = box.width / SCENE_W
  const xs = Array.from({ length: 9 }, (_, i) => (side === 'left' ? i : SCENE_W - i) * (w / sx / 8))
  const crest = Math.min(geom.horizon, ...[world.terrain.near.points, world.terrain.far.points].filter((pts) => pts.length)
    .flatMap((pts) => xs.map((x) => box.landTop + crestAt(pts, x))))
  const y = crest - 12 - 0.3 * h
  const x = side === 'left' ? geom.left : geom.left + box.width
  const lean = Math.tan(p.slant) * (geom.horizon - y) * (p.precip === 'snow' ? 0.6 : 1)
  // A mark, not a far cloud faded into the haze: a heavy shower cloud's own grey, darker under, in the hour's light.
  const dark = world.night.dark
  const heavy: RGB = p.precip === 'rain' ? [0.36, 0.4, 0.46] : [0.62, 0.66, 0.72]
  const body = mixRgb(mixRgb(b.shade, heavy, 0.6), [0.08, 0.1, 0.14], 0.6 * dark)
  const shade = mixRgb(body, [0.12, 0.14, 0.18], 0.35)
  const curtain = mixRgb(shade, horizonSky, p.precip === 'rain' ? 0.2 : 0.3)
  const pad = Math.abs(lean) + 8
  const x0 = Math.max(0, Math.floor(side === 'left' ? x - 2 : x - w - pad))
  const x1 = Math.min(geom.width, Math.ceil(side === 'left' ? x + w + pad : x + 2))
  const top = Math.max(0, Math.floor(y - h * 1.6))
  const bottom = Math.min(box.skyHeight, Math.ceil(geom.horizon + 3))
  const alpha = (0.85 + 0.15 * p.strength) * p.opacity * nearestBank.f.share
  return { kind: 'edge', id: 'edge', surface: 'sky', z: 8.5, soft: true, precip: p.precip, side, x, y, w, h,
    body, shade, curtain, alpha, lean, seed: b.seed,
    bounds: { x: x0, y: top, w: Math.max(1, x1 - x0), h: Math.max(1, bottom - top) },
    key: layerKey('edge', p.precip, skyBoxKey(box, true), side, q(x, 0.5), q(y, 0.5), q(w, 0.5), q(lean, 0.5), tone(body), tone(shade),
      tone(curtain), q(alpha, 0.02)) }
}

/** The crest's y (land px) at a reference x, from a plane's points. */
export function crestAt(points: readonly Pt[], x: number): number {
  if (!points.length) return 0
  let i = 1
  while (i < points.length - 1 && points[i][0] < x) i++
  const [x0, y0] = points[i - 1], [x1, y1] = points[i]
  const t = x1 === x0 ? 0 : clamp01((x - x0) / (x1 - x0))
  return y0 + (y1 - y0) * t
}
