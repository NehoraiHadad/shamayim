//# allFunctionsCalledOnLoad
import { mixOklab, type Oklab } from '../../theme/oklab'
import type { RGB } from '../../world/types'

/** `#RRGGBB` → sRGB 0–1. */
export function rgbOf(hex: string): RGB {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16)
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
}

/** sRGB 0–1 → `#RRGGBB`. */
export function hexOf(rgb: RGB): string {
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')}`
}

/** Mixed in Oklab, as the SVG scene's `color-mix(in oklab, …)` mixes. */
export const mixHex = (from: string, to: string, amount: number) => mixOklab(from, to, amount)

/** IEC 61966-2-1 sRGB `[0, 1]` -> linear `[0, 1]`. */
export const toLinear = (c: number) => {
  const v = Math.min(1, Math.max(0, c))
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
/** IEC 61966-2-1 linear `[0, 1]` -> sRGB `[0, 1]`. */
export const toSrgb = (c: number) => {
  const v = Math.min(1, Math.max(0, c))
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
}

/** sRGB 0–1 → Oklab (the same transform as `theme/oklab.ts`, without the trip through hex). */
export function labOf([r0, g0, b0]: RGB): Oklab {
  const r = toLinear(r0), g = toLinear(g0), b = toLinear(b0)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return { l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s }
}

/** Oklab → linear sRGB, retaining any out-of-gamut channels. */
function linearOfLab({ l, a, b }: Oklab): RGB {
  const x = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const y = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const z = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z, -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
    -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z]
}

/** Oklab → sRGB 0–1 (clamped). */
export function rgbOfLab(lab: Oklab): RGB {
  const [r, g, b] = linearOfLab(lab)
  return [toSrgb(r), toSrgb(g), toSrgb(b)]
}

/** Two sRGB colours mixed in Oklab. */
export function mixRgb(from: RGB, to: RGB, amount: number): RGB {
  const a = labOf(from), b = labOf(to), t = Math.min(1, Math.max(0, amount))
  return rgbOfLab({ l: a.l + (b.l - a.l) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t })
}

/** Source-over mixing in the canvas's encoded sRGB channels. */
export function mixSrgb([r, g, b]: RGB, [rr, gg, bb]: RGB, t: number): RGB {
  return [r + (rr - r) * t, g + (gg - g) * t, b + (bb - b) * t]
}

/**
 * Two sRGB colours mixed as light (in linear light): a share of one light added to the rest of another, as a mirror's
 * Fresnel share of the sky over the water's own dark (C9). A perceptual mix of a light and a near-black reads far darker.
 */
export function mixLight(from: RGB, to: RGB, amount: number): RGB {
  const t = Math.min(1, Math.max(0, amount))
  return [0, 1, 2].map((i) => Math.min(1, Math.max(0, toSrgb(toLinear(from[i]) + (toLinear(to[i]) - toLinear(from[i])) * t)))) as unknown as RGB
}

/** An sRGB colour's light scaled by `k` (in linear light): what a surface of albedo `k` gives back of it. */
export const scaleLight = (c: RGB, k: number): RGB =>
  [0, 1, 2].map((i) => Math.min(1, Math.max(0, toSrgb(toLinear(c[i]) * k)))) as unknown as RGB

/**
 * A share of one light added over another, channel by channel (a square root for the sRGB curve, as cheap as a mix): it
 * only lightens, and what is bright already hardly changes.
 */
export const addLight = (rgb: RGB, light: RGB, share: number): RGB => {
  const add = (i: 0 | 1 | 2) => Math.min(1, Math.sqrt(rgb[i] ** 2 + share * light[i] ** 2))
  return [add(0), add(1), add(2)]
}

/** Oklab lightness of an sRGB colour (0 black … 1 white). */
export const lightness = (rgb: RGB) => labOf(rgb).l

/** Scales a colour's Oklab lightness by `k` and its chroma by `chroma` (wet ground: darker and a little richer). */
export function darken(rgb: RGB, k: number, chroma = 1): RGB {
  const { l, a, b } = labOf(rgb)
  return rgbOfLab({ l: l * k, a: a * chroma, b: b * chroma })
}
