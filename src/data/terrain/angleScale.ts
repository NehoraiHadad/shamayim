/**
 * One vertical scale for the land and the sky: how many px above the horizon line (eye level, 0°) an angle stands.
 * The ridges of the horizon panorama and the sun and moon are all drawn with it, so a body is hidden behind the land
 * exactly when its altitude is below the horizon angle in its direction.
 *
 * Across, the sky is 1.5 px per degree of azimuth. Real horizons are only a few degrees high (the Gilead from the
 * Jordan Valley ~4°), which at 1.5 px a degree would be a 6 px strip, so the first few degrees are stretched:
 *   px(a) = SKY_PX · sin(a) + RELIEF_PX · tanh(a / RELIEF_DEG)
 * The sine part is the sky as it was (equal-area, the zenith ~86 px up); the tanh part adds `RELIEF_PX` spread over the
 * first few degrees, so low angles (the land, a body rising) are exaggerated and higher ones keep their shape. It is odd
 * and rising, so land below eye level (seen from a hilltop) is drawn below the line the same way.
 */

const RAD = Math.PI / 180
/** The sky's own scale: 1.5 px a degree at the horizon, easing to the zenith (equal-area). */
export const SKY_PX = 1.5 / RAD

export interface Relief {
  /** Extra px the low angles get in all. */
  px: number
  /** Over how many degrees it is spread (the stretch is strongest below this). */
  deg: number
}

/** The relief options shown to the owner; `?relief=true|mid|high` picks one in dev builds. */
export const RELIEFS: Record<'true' | 'mid' | 'high', Relief> = {
  /** No stretch: the land at its true angle on the sky's scale (very flat). */
  true: { px: 0, deg: 1 },
  /** ~6.5 px a degree at the horizon (4.3×). */
  mid: { px: 30, deg: 6 },
  /** ~9.8 px a degree at the horizon (6.5×). */
  high: { px: 50, deg: 6 },
}

const DEFAULT_RELIEF: keyof typeof RELIEFS = 'high'

function pickRelief(): Relief {
  if (typeof window === 'undefined' || !import.meta.env?.DEV) return RELIEFS[DEFAULT_RELIEF]
  const asked = new URLSearchParams(window.location.search).get('relief')
  return asked && asked in RELIEFS ? RELIEFS[asked as keyof typeof RELIEFS] : RELIEFS[DEFAULT_RELIEF]
}

export const RELIEF: Relief = pickRelief()

/** px above the horizon line for an angle in degrees (negative below it). */
export function anglePx(degrees: number, relief: Relief = RELIEF): number {
  return SKY_PX * Math.sin(degrees * RAD) + relief.px * Math.tanh(degrees / relief.deg)
}

/** px per degree right at the horizon. */
export function horizonSlope(relief: Relief = RELIEF): number {
  return SKY_PX * RAD + relief.px / relief.deg
}
