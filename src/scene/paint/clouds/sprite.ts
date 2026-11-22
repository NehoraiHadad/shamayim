import type { RGB } from '../../../world/types'

/** The cloud genera the field makes (`world/field/types.ts` `Genus`), as the painter draws them. */
export type SpriteGenus = 'cu' | 'cg' | 'cb' | 'sc' | 'st' | 'ac' | 'as' | 'ns' | 'ci' | 'cs'

/**
 * One cloud cell as the painter draws it (track D, SPEC §6), in sprite px with the origin at the middle of its near base
 * edge (the underside's line nearest the eye) and y down. What the eye sees of a cell in true perspective:
 * - `under`: how deep the underside shows below the near edge (from `y(aFar)` to `y(aNear)`); a cell overhead shows its
 *   underside only, a far one a sliver.
 * - `tall`: how high its side and top stand above the near edge (`y(aNear)` to `y(aTop)`); none overhead.
 * Tones come from the model's light (`cloudTones`), never from a time.
 */
export interface CloudSprite {
  genus: SpriteGenus
  seed: number
  /** Width across (px). */
  w: number
  under: number
  tall: number
  /** −1…1: how far the tops lean downwind on screen (+ to the right). */
  lean: number
  /** Optical depth at the centre (SPEC §1.4): thin cells are translucent, thick ones have dark bases. */
  tau: number
  /** The body in the sky's light, its shade side, and the light's own colour on its lit side. */
  body: RGB
  shade: RGB
  lit: RGB
  /** How strongly the lit side catches the light (0–1). */
  litA: number
  /** Unit vector toward the light (sprite px), or null with no direct light (the sky's alone, from above). */
  toward: readonly [number, number] | null
  /** The thin edges toward a sun behind or beside it, lit by forward scattering (0–1). */
  silver: number
  /** A low sun lighting the underside (0–1). */
  glow: number
  /** The cell rains: a dark heavy base (its shaft is the shafts layer's). */
  rains: boolean
  /** How much of the cell has formed (0–1): its alpha. */
  share: number
  /** The axis of a cirrus streak on screen (rad, 0 = across), the direction the wind combs its fibres. */
  axis?: number
}

/** The sprite's box round its origin (px): what a painter may touch, so the cache sheet is sized from it. */
export function spriteBox(s: CloudSprite): { x: number; y: number; w: number; h: number } {
  const pad = Math.max(3, s.w * 0.08)
  const reachUp = s.tall + Math.max(s.under, 2) * 0.4
  const lean = Math.abs(s.lean) * Math.max(s.tall, 4) * 0.4
  return { x: -s.w / 2 - pad - lean, y: -reachUp - pad, w: s.w + 2 * (pad + lean), h: reachUp + s.under + 2 * pad }
}
