import { SCENE_CAMERA, toward, type Camera } from '../domain/camera'
import { hexToOklab, oklabToHex, type Oklab } from '../theme/oklab'
import type { SkyLight } from '../theme/skyLight'
import { smoothstep } from './ridgeLighting'

export type RidgePalette = Pick<SkyLight, 'mid' | 'horizon' | 'accent' | 'ridgeFar' | 'ridgeNear'>

interface ToneInput {
  altitude: number
  azimuth: number
  /** The camera the land is drawn for: "in the view's direction" is its heading. */
  camera?: Camera
  day: number
  noonWeight: number
  glow: number
  cover: number
  wet: boolean
  farFade: number
  nearFade: number
  layer: 'near' | 'far'
  palette: RidgePalette
}

export interface RidgeTone {
  fill: string | null
  rim: string
  rimAlpha: number
}

const mix = (from: Oklab, to: Oklab, t: number): Oklab => ({
  l: from.l + (to.l - from.l) * t,
  a: from.a + (to.a - from.a) * t,
  b: from.b + (to.b - from.b) * t,
})
const roundedFade = (fade: number) => Number(fade.toFixed(2)) * .9
const radians = Math.PI / 180

// SVG opacity composites in sRGB. Check the resulting lightness against the same limits as the fill.
function composite(base: string, rim: string, alpha: number) {
  return '#' + [1, 3, 5].map((offset) => {
    const from = parseInt(base.slice(offset, offset + 2), 16)
    const to = parseInt(rim.slice(offset, offset + 2), 16)
    return Math.round(from + (to - from) * alpha).toString(16).padStart(2, '0')
  }).join('')
}

function limitStrength(strength: number, passes: (value: number) => boolean) {
  if (passes(strength)) return strength
  let low = 0
  let high = strength
  for (let i = 0; i < 12; i++) {
    const middle = (low + high) / 2
    if (passes(middle)) low = middle
    else high = middle
  }
  return low
}

export function ridgeLightTone(input: ToneInput): RidgeTone | null {
  const { altitude, azimuth, day, noonWeight, glow, cover, wet, farFade, nearFade, layer, palette } = input
  if (cover >= 90 || (day <= 0 && glow <= 0)) return null
  const far = layer === 'far'
  // Haze dims the sun itself (`day` already carries the direct share) and veils the far ridge in front of it.
  const weather = (1 - smoothstep(.5, .9, cover / 100)) * (1 - (far ? farFade : nearFade) * .9) * (wet ? .5 : 1)
  const horizon = hexToOklab(palette.horizon)
  const accent = hexToOklab(palette.accent)
  const haze = mix(hexToOklab(palette.mid), horizon, .45)
  const farBase = mix(hexToOklab(palette.ridgeFar), haze, roundedFade(farFade))
  const base = far ? farBase : mix(hexToOklab(palette.ridgeNear), haze, roundedFade(nearFade))
  const baseHex = oklabToHex(base)
  const paintedBase = hexToOklab(baseHex).l
  const limit = Math.min(Math.min(base.l, paintedBase) + (far ? .10 : .08), far ? horizon.l - .06 : farBase.l)
  if (limit <= paintedBase) return null

  const warm = 1 - smoothstep(4, 18, altitude)
  // How much the sun stands in the view's direction (behind the ridges, lighting them from the back).
  const south = Math.max(0, Math.cos(altitude * radians) * toward(azimuth, input.camera ?? SCENE_CAMERA))
  const light = mix(horizon, accent, warm * .55)
  const neutral = { ...base, l: base.l + .03 * south }
  const band = mix(mix(base, light, far ? .28 : .20), neutral, noonWeight)
  const fillAt = (strength: number) => oklabToHex(mix(base, band, strength))
  const fill = fillAt(limitStrength(day * weather, (strength) => hexToOklab(fillAt(strength)).l <= limit))
  const maxAlpha = .45 * Math.max(day, glow) * weather * (1 - smoothstep(6, 15, altitude))
  const rimAt = (tint: number) => oklabToHex(mix(base, accent, tint))
  // Keep the skyline legible when a crest stroke crosses a crescent at its cap.
  const tint = limitStrength(.6, (amount) => [baseHex, fill].every((color) =>
    hexToOklab(composite(color, rimAt(amount), maxAlpha)).l <= limit))
  const rim = rimAt(tint)
  const litFill = hexToOklab(fill).l > paintedBase ? fill : null
  const litRim = hexToOklab(composite(baseHex, rim, maxAlpha)).l > paintedBase ? maxAlpha : 0
  return litFill || litRim ? { fill: litFill, rim, rimAlpha: litRim } : null
}
