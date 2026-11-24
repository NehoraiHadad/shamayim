import { smoothstep } from '../../domain/smoothstep'
import { MIN_TOWER_SHARE, towerOpacity, type CloudSprite } from './cloudSprite'
import { headsOf } from './towerHeads'

/** Crown roughness can extend at most this far in crown radii (the two raster cutoff distances). */
export const TOWER_PHOTO_REACH = 0.45
export const TOWER_BILLOW_REACH = 0.6

/** Both raster bodies use 8% of width or 2 px as their minimum visible underside. */
export const towerBaseDepth = (s: CloudSprite) =>
  Math.max(2, Math.min(s.bowl ?? s.under, s.under), 0.08 * s.w)

/** The brighter of the soft crown/underside silhouettes, before colour and cloud share. */
export function towerPaintProfile(s: CloudSprite) {
  if (s.w < 0.5 || s.tall < 0.5 || s.share <= MIN_TOWER_SHARE) return null
  const heads = headsOf(s), bowl = towerBaseDepth(s), depth = Math.max(s.under, bowl)
  const opacity = towerOpacity(s)
  // Each smooth silhouette union can add at most a quarter of the 0.4-radius crease.
  const crease = (heads.length - 1) * 0.4 / 4
  const reach = Math.max(TOWER_PHOTO_REACH, TOWER_BILLOW_REACH)
  // The rounder of the two bases uses the 1.5 power, and ends at the union's cutoff.
  const bottom = depth + bowl * ((1 + reach + crease) ** (1 / 1.5) - 1)
  // Start at the outer cutoff, then take full core opacity at the nominal crown.
  // The shorter crown yields the steeper rise: use its width even when it belongs
  // to a lower head, so the envelope also covers a narrow anvil above broad shoulders.
  const top = Math.min(...heads.map(h => -h.tall - (reach + crease) * h.crown))
  const soft = (reach + crease) * Math.min(...heads.map(h => h.crown))
  return {
    rows: [top, top + soft, 0, depth, bottom],
    alphaAt: (y: number) => {
      const crown = smoothstep(top, top + soft, y)
      // Both bases retain 20% at the far edge before the outer silhouette ends.
      const base = (1 - 0.8 * smoothstep(0, depth, y)) * (1 - smoothstep(depth, bottom, y))
      return opacity * crown * base
    },
  }
}
