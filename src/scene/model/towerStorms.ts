import type { CloudSprite } from './cloudSprite'
import { smoothstep } from '../../world/ridgeLighting'
import type { Tones } from './cloudLight'
import { addLight, mixRgb } from './tone'
import type { LayerOf, RGB } from './types'

/*
 * What a tower's neighbours and its wind make of it, before it is painted: cells whose cores overlap are one storm, and a
 * tower's top is carried the way its wind blows across the view. Pure.
 */

/** A tower as it stands: its sprite, its cell's middle (km east, north) and radius, and its range, and where on the
 * sky its near base edge is (px). */
export interface Standing { sprite: CloudSprite; at: readonly [number, number]; r: number; km: number; x: number; y: number }

/** Cells whose middles stand nearer than this (of the larger radius) are one storm; from this on, two. */
const ONE = 0.6, TWO = 1.2
/** The farther of the two goes into the nearer, from this much farther (of the radius): neither where both are as far. */
const FARTHER = 0.2
/** Wind across the view (px/s at the tower's range) against the wind's whole reach that carries a top all the way. */
const CARRIED = 0.5

/** One storm is drawn once: the farther of two overlapping cells fades into the nearer, as far as it overlaps it. */
export function oneStormEach(towers: readonly Standing[]) {
  const shares = towers.map(({ sprite }) => sprite.share)
  for (const far of towers) {
    towers.forEach((near, n) => {
      if (near.km >= far.km) return
      const r = Math.max(near.r, far.r)
      const apart = smoothstep(ONE, TWO, Math.hypot(near.at[0] - far.at[0], near.at[1] - far.at[1]) / r)
      far.sprite.share *= 1 - (1 - apart) * shares[n] * smoothstep(0, FARTHER, (far.km - near.km) / r)
    })
  }
}

/** A tower this much behind a nearer one (a share of its own face) begins to go, and from here on is hidden. */
const HIDDEN = [0.5, 0.8] as const

/**
 * A storm hides what stands behind it: the soft hand paints a tower slightly see-through, so one behind a nearer one would
 * show in it as a seam and under its base as a pillar. It goes as far as the nearer one covers it.
 */
export function hideBehind(towers: readonly Standing[]) {
  const shares = towers.map(({ sprite }) => sprite.share)
  for (const far of towers) {
    towers.forEach((near, n) => {
      if (near.km < far.km) far.sprite.share *= 1 - shares[n] * smoothstep(HIDDEN[0], HIDDEN[1], coveredBy(near, far))
    })
  }
}

/** The share of the farther tower's face (its column's width by its height) that the nearer one stands in front of. */
function coveredBy(near: Standing, far: Standing): number {
  const n = near.sprite, f = far.sprite
  const across = Math.min(near.x + n.w / 2, far.x + f.w / 2) - Math.max(near.x - n.w / 2, far.x - f.w / 2)
  const up = Math.min(near.y + n.under, far.y) - Math.max(near.y - n.tall, far.y - f.tall)
  return Math.max(0, across) * Math.max(0, up) / Math.max(1, f.w * f.tall)
}

/** −1…1: how far the tops lean downwind on screen, from the wind across the view and the whole wind there (both px/s). */
export const leanOf = (across: number, whole: number) => (whole > 0 ? Math.max(-1, Math.min(1, across / whole / CARRIED)) : 0)

/** The low sheet a far tower stands before: its colour low in the sky, how much of the sky it covers, and the sheet as drawn. */
export interface Beyond { rgb: RGB; referenceRgb?: RGB; cover: number; sheet?: Pick<LayerOf<'cloudSheet'>, 'xs' | 'ys' | 'city'> | null }

const nearest = (at: readonly number[], v: number) => at.reduce((best, a, n) => (Math.abs(a - v) < Math.abs(at[best] - v) ? n : best), 0)

/** The sheet's colour behind (x, y) on the sky: by night with the towns' light it is drawn with there. */
function sheetAt({ rgb, sheet }: Beyond, x: number, y: number): RGB {
  if (!sheet?.city) return rgb
  return addLight(rgb, sheet.city.rgb, sheet.city.weight[nearest(sheet.ys, y) * sheet.xs.length + nearest(sheet.xs, x)] ?? 0)
}

/** A tower's tones as the air takes them to what stands behind it: the sheet there, as far as it covers, not the clear sky. */
export function beforeSheet(tones: Tones, beyond: Beyond | null, x = 0, y = 0): Tones {
  if (!beyond) return tones
  const behind = mixRgb(tones.behind, sheetAt(beyond, x, y), beyond.cover)
  const referenceBehind = beyond.referenceRgb
    ? mixRgb(tones.behind, sheetAt({ ...beyond, rgb: beyond.referenceRgb }, x, y), beyond.cover) : behind
  const moved = (c: RGB) => c.map((v, n) => v + (referenceBehind[n] - tones.behind[n])
    * (tones.referenceFade ?? tones.fade)) as unknown as RGB
  return { ...tones, body: moved(tones.body), shade: moved(tones.shade), behind, referenceBehind }
}

/** A sheet's colour low in the sky, where its rolls stand edge on: its lit sides over its shade, all lit by a low sun. */
export const lowSheetRgb = (s: { body: RGB; shade: RGB; lit: RGB }, light: { under: number } | null): RGB =>
  mixRgb(mixRgb(s.shade, s.body, 0.5), s.lit, light ? EDGE_LIT + (1 - EDGE_LIT) * light.under : 0)
const EDGE_LIT = 0.6
