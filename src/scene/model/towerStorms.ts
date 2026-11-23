import type { CloudSprite } from '../paint/cloudSprite'
import { smoothstep } from '../../world/ridgeLighting'
import type { Tones } from './cloudLight'
import { mixRgb } from './tone'
import type { RGB } from './types'

/*
 * What a tower's neighbours and its wind make of it, before it is painted: cells whose cores overlap are one storm, and a
 * tower's top is carried the way its wind blows across the view. Pure.
 */

/** A tower as it stands: its sprite, its cell's middle (km east, north) and radius, and its range. */
export interface Standing { sprite: CloudSprite; at: readonly [number, number]; r: number; km: number }

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

/** −1…1: how far the tops lean downwind on screen, from the wind across the view and the whole wind there (both px/s). */
export const leanOf = (across: number, whole: number) => (whole > 0 ? Math.max(-1, Math.min(1, across / whole / CARRIED)) : 0)

/** The low sheet a far tower stands before: its colour low in the sky, and how much of the sky it covers. */
export interface Beyond { rgb: RGB; cover: number }

/** A tower's tones as the air takes them to what stands behind it: the sheet there, as far as it covers, not the clear sky. */
export function beforeSheet(tones: Tones, beyond: Beyond | null): Tones {
  if (!beyond) return tones
  const behind = mixRgb(tones.behind, beyond.rgb, beyond.cover)
  const moved = (c: RGB) => c.map((v, n) => v + (behind[n] - tones.behind[n]) * tones.fade) as unknown as RGB
  return { body: moved(tones.body), shade: moved(tones.shade), behind, fade: tones.fade }
}

/** A sheet's colour low in the sky, where its rolls stand edge on: its lit sides over its shade, all lit by a low sun. */
export const lowSheetRgb = (s: { body: RGB; shade: RGB; lit: RGB }, light: { under: number } | null): RGB =>
  mixRgb(mixRgb(s.shade, s.body, 0.5), s.lit, light ? EDGE_LIT + (1 - EDGE_LIT) * light.under : 0)
const EDGE_LIT = 0.6
