import { mixOklab } from '../../theme/oklab'
import type { RGB } from '../../world/types'

/** `#RRGGBB` → sRGB 0–1. */
export function rgbOf(hex: string): RGB {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16)
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
}

/** Mixed in Oklab, as the SVG scene's `color-mix(in oklab, …)` mixes. */
export const mixHex = (from: string, to: string, amount: number) => mixOklab(from, to, amount)
