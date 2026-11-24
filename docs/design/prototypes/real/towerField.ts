import { smoothstep } from '../../../../src/domain/smoothstep'
import type { CloudSprite } from '../../../../src/scene/model/cloudSprite'
import { carriedAt, crownAt, halfAt, headsOf, type Head } from '../../../../src/scene/model/towerHeads'
import { bodyOf, grainRows, HEAP, type Make } from './cloudGrain'
import type { LitBody } from './cloudLight'
import { noiseAt, placeOf, puffTile } from './cloudNoise'

/*
 * A tower's density on a raster, made as a sheet's is: the model's own heads (`headsOf`) as a soft cover, billowing inward,
 * its edge carried by the one grain of all clouds. What has spread under the tropopause is ice: a thin fibrous veil, no
 * heads of its own. Sprite px, the origin at the middle of the near base edge, y down. Pure: the sprite alone.
 */

/** Raster px per sky px, and in a tower at most. */
const RASTER = 0.6, PX = 40_000
/** The width (px) of a tower drawn at the overhead scale. */
const WIDE = 130
/** The billows on the outline, big and small: their size against the tower's width, how deep they cut in (of a head's half
 *  width); how far out of it the biggest stand. */
const BILLOWS = [[1.5, 0.55], [0.62, 0.3]] as const, STAND = 0.26
/** A tower's billows are its own: the grain carries its edge less. */
const TOWER: Make = { ...HEAP, carry: 0.55, rim: 0.7 }
/** The softness of an edge: of the tower's width, px at least. */
const SOFT = 0.09, LEAST = 3
/** The ice's cover, and its softness against the heads'. */
const ICE = 0.5, ICE_SOFT = 2.4
const FROM_ICE = 0.58

export interface TowerField extends LitBody { x: number; y: number; alpha: Float32Array; relief: Float32Array }

/** How far (px) a place lies inside a head, its ice left out or in. */
function inside(h: Head, x: number, y: number, lean: number, ice: boolean): number {
  const t = Math.min(1, Math.max(0, -y / h.tall))
  const half = ice ? halfAt(h, y) : Math.max(0.5, h.half * (1 - (1 - h.top) * t))
  const dx = x - h.x - (ice ? carriedAt(h, y, lean) : 0)
  return (1 - Math.hypot(dx / half, crownAt(h, y))) * Math.min(half, 1.4 * h.crown)
}

export function towerField(s: CloudSprite, toward: readonly [number, number]): TowerField {
  const heads = headsOf(s), iced = heads.filter((h) => h.anvil > 0.05), puff = puffTile()
  const pad = 4, ends = heads.flatMap((h) => [0, 0.6, 0.8, 1].flatMap((t) => {
    const at = h.x + carriedAt(h, -t * h.tall, s.lean), half = halfAt(h, -t * h.tall)
    return [at - half, at + half]
  }))
  const x0 = Math.min(...ends) - pad, x1 = Math.max(...ends) + pad, y0 = -Math.max(...heads.map((h) => h.tall)) - pad
  const y1 = Math.max(4, 0.08 * s.w)
  const k = Math.min(RASTER, Math.sqrt(PX / ((x1 - x0) * (y1 - y0))))
  const w = Math.max(4, Math.ceil((x1 - x0) * k)), h = Math.max(4, Math.ceil((y1 - y0) * k)), size = w * h
  const scale = Math.min(1, Math.max(0.1, s.w / WIDE)), soft = Math.min(1.5 * TOWER.soft, Math.max(LEAST, SOFT * s.w))
  const out: TowerField = { w, h, k, x: x0, y: y0, alpha: new Float32Array(size), thick: new Float32Array(size),
    relief: new Float32Array(size), scale: new Float32Array(h).fill(scale) }
  const grain = grainRows(TOWER, s.seed % 9973)(scale), from = placeOf(s.seed % 997)
  for (let j = 0, n = 0; j < h; j++) {
    const y = y0 + (j + 0.5) / k, up = Math.min(1, Math.max(0, -y / s.tall))
    for (let i = 0; i < w; i++, n++) {
      const x = x0 + (i + 0.5) / k
      let deep = -1e3, half = 1
      for (const head of heads) {
        const d = inside(head, x, y, s.lean, false)
        if (d > deep) { deep = d; half = head.half }
      }
      let billow = -STAND
      for (const [tile, cut] of BILLOWS) billow += cut * (1 - noiseAt(puff, x / (tile * s.w) + from.u, y / (tile * s.w) + from.v))
      const a = smoothstep(-soft, soft, deep - billow * half * smoothstep(0, 0.2, up))
      let veil = 0
      for (const head of iced) veil = Math.max(veil, smoothstep(0, ICE_SOFT * soft, inside(head, x, y, s.lean, true)))
      veil *= smoothstep(FROM_ICE, FROM_ICE + 0.2, up)
      if (a < 0.012 && veil < 0.012) continue
      const g = grain(x, y, toward[0], toward[1])
      const [body, thick] = bodyOf(TOWER, a, g, 0)
      const ice = ICE * veil * (0.45 + 1.1 * g.wisp)
      out.alpha[n] = 1 - (1 - body) * (1 - Math.min(1, ice))
      out.thick[n] = Math.max(thick, 0.3 * ice)
      out.relief[n] = g.relief * a
    }
  }
  return out
}
