import { smoothstep } from '../../../domain/smoothstep'
import type { RGB } from '../../../world/types'
import type { CloudSprite } from '../../model/cloudSprite'
import { mix } from '../shared/base/hand'
import { cloudLight, gridAt } from './cloud/light'
import { cloudPoint, cloudTone } from './cloud/tone'
import type { TowerPoint, TowerShape } from './towerShape'

/*
 * A tower's colour at a point, by the sheets' own light: how much of it goes through the body from the light's side and from
 * the open sky above, its heads and lumps rounded by it, the lower column and the flat base in the tower's own shade, the
 * rim silvered before a sun behind. With no direct light the sky's alone, from above. Every tone is the model's. Pure (the
 * returned colour is reused).
 */

/** Cells of the grid the light is worked out on, at most; its side at most, against the width. */
const CELLS = 1200, CELL = 0.5
/** The width (px) of a tower drawn at the overhead scale. */
const WIDE = 130
/** How thick the body is in a crease, against a head's. */
const CREASE = 0.55
/** The widths (px) from which to which a tower is one broad body, its inside calm: what its lumps and creases keep. */
const BROAD = [150, 260] as const, LUMPS_KEPT = 0.25
/** How much of the light on a lump's and on a head's side is the sky's, with no direct light; the step over which a lump's slope
 *  is read (against the width), and how strongly lumps and whole heads round. */
const SKY_RELIEF = 0.5, STEP = 0.08, LUMP = 0.85, HEAD = 0.34
/** The tone of a column's foot and of its top: the tower's own mean, darker to its base. */
const FOOT_TONE = 0.72, TOP_TONE = 0.3
/** A tower this wide (px) keeps its whole contrast, one this narrow a far cloud's. */
const NEAR = [14, 70] as const, KEEP = 0.5
/** How far the base stands in its own shade, and the share of the height it climbs. */
const BASE = 0.8, CLIMB = 0.3
/** The mean shade of a tower's own light, over its tone. */
const MEAN = 0.12
/** The silver rim of a tower before the sun. */
const SILVER = 0.6

export function towerTone(s: CloudSprite, shape: TowerShape): (x: number, y: number, here: TowerPoint) => Readonly<RGB> {
  const [tx, ty] = s.toward ?? [0, -1], beam = s.toward ? Math.min(1, s.litA) : 0
  const { light, w, h, k, x0, y0 } = lightIn(s, shape, tx, ty, beam), tone = cloudTone(s, 1)
  const under = mix(s.shade, s.lit, 0.6 * s.glow), out = new Float32Array(3), c: [number, number, number] = [0, 0, 0]
  const point = cloudPoint(), round = SKY_RELIEF + (1 - SKY_RELIEF) * beam, step = STEP * s.w, lump = LUMP * (1 + (LUMPS_KEPT - 1) * calmOf(s))
  point.near = KEEP + (1 - KEEP) * smoothstep(NEAR[0], NEAR[1], s.w)
  return (x, y, here) => {
    const up = Math.min(1, Math.max(0, -y / s.tall)), over = smoothstep(0, 0.7, up), gx = (x - x0) * k - 0.5, gy = (y - y0) * k - 0.5
    const at = (grid: Float32Array) => gridAt(grid, w, h, gx, gy)
    const facing = lump * (here.bump - shape.relief(x + tx * step, y + ty * step)) + HEAD * (here.side * tx - here.rise * ty)
    point.tone = FOOT_TONE + (TOP_TONE - FOOT_TONE) * over
    point.light = at(light.light)
    point.shade = at(light.shade)
    point.relief = -facing * round
    point.thick = point.cover = here.a
    tone(point, out)
    const shaded = BASE * (1 - smoothstep(0, 1, (shape.depth - y) / (shape.depth + CLIMB * s.tall))), silver = SILVER * s.silver * Math.max(0, here.side * tx - here.rise * ty) ** 2
    for (let n = 0; n < 3; n++) {
      const based = out[n] + (under[n] - out[n]) * shaded
      c[n] = based + (s.lit[n] - based) * silver
    }
    return c
  }
}

const calmOf = (s: CloudSprite) => smoothstep(BROAD[0], BROAD[1], s.w)

/** The light through the body, on a coarse grid over it (sprite px from (x0, y0), `k` cells a px). */
function lightIn(s: CloudSprite, shape: TowerShape, tx: number, ty: number, beam: number) {
  const x0 = -shape.reach, y0 = -s.tall - 0.25 * s.w, wide = 2 * shape.reach, high = shape.depth - y0
  const k = Math.min(CELL, Math.sqrt(CELLS / (wide * high))), w = Math.max(3, Math.ceil(wide * k)), h = Math.max(3, Math.ceil(high * k))
  const calm = calmOf(s), crease = CREASE + (1 - CREASE) * (1 - LUMPS_KEPT) * calm
  const thick = new Float32Array(w * h), scale = new Float32Array(h).fill(Math.min(1, Math.max(0.1, s.w / WIDE)))
  const foot = { sky: new Float32Array(h), base: new Float32Array(h) }
  for (let j = 0, n = 0; j < h; j++) {
    const up = Math.max(0, -(y0 + (j + 0.5) / k) / s.tall)
    foot.sky[j] = 0.4 + 0.6 * smoothstep(0, 0.7, up)
    foot.base[j] = 1 - smoothstep(0, 0.16, up)
    for (let i = 0; i < w; i++, n++) {
      const here = shape.at(x0 + (i + 0.5) / k, y0 + (j + 0.5) / k)
      if (here) thick[n] = here.a * Math.min(1, Math.max(crease, 0.8 + here.bump))
    }
  }
  const far = 1e4
  return { light: cloudLight({ w, h, k, thick, scale, calm }, { x: w / 2 + tx * far, y: h / 2 + ty * far }, beam, MEAN, foot), w, h, k, x0, y0 }
}
