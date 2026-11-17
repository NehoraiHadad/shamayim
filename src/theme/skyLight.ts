import { THRESHOLDS } from '../config/thresholds'
import { ratio } from './contrast'
import { hexToOklab, mixOklab, oklabToHex } from './oklab'
import { SKY_THEMES, type SkyTheme } from './skyThemes'

export interface SkyLightInput {
  /** Sun altitude, degrees. */
  altitude: number
  /** Morning or evening twilight (they differ in tint). */
  rising: boolean
  cloudCover: number
  /** How wet, 0–1 (a ramp, not a switch, so drizzle starting does not jump the colour). */
  wet: number
  pm10: number | null
}
export type SkyLight = Pick<SkyTheme, 'top' | 'mid' | 'horizon' | 'ink' | 'accent' | 'ridgeFar' | 'ridgeNear'>

const smoothstep = (lo: number, hi: number, value: number) => {
  const x = Math.min(1, Math.max(0, (value - lo) / (hi - lo)))
  return x * x * (3 - 2 * x)
}

type ColorRow = readonly [number, string, string, string]

function anchors(rising: boolean): ColorRow[] {
  return [
    [-18, '#070B1E', '#131C3F', '#2A2F5C'], [-12, '#0B1230', '#1C2452', '#3A3A6A'],
    [-6, '#1A2248', '#5A3A66', '#C9785A'],
    rising ? [-2, '#1F2A52', '#7E3F62', '#F6B26B'] : [-2, '#2B2350', '#7E3A5E', '#F2994A'],
    [0, '#24376E', '#8A4A66', '#F8BE78'], [4, '#1B4480', '#4A6A9C', '#F3CF98'],
    [10, '#124A90', '#2F70B0', '#EDD5AC'], [20, '#0E4C96', '#2A74B8', '#E9D3A8'],
  ]
}

function keyframe(altitude: number, rising: boolean): [string, string, string] {
  const rows = anchors(rising)
  if (altitude <= rows[0][0]) return rows[0].slice(1) as [string, string, string]
  const upper = rows.findIndex((row) => altitude <= row[0])
  if (upper < 0) return rows.at(-1)!.slice(1) as [string, string, string]
  const from = rows[upper - 1], to = rows[upper]
  const t = (altitude - from[0]) / (to[0] - from[0])
  return [mixOklab(from[1], to[1], t), mixOklab(from[2], to[2], t), mixOklab(from[3], to[3], t)]
}

function semantic(altitude: number, rising: boolean, field: keyof SkyLight): string {
  const twilight = rising ? SKY_THEMES.dawn : SKY_THEMES.dusk
  if (altitude <= -12) return SKY_THEMES.night[field]
  if (altitude < -2) return mixOklab(SKY_THEMES.night[field], twilight[field], (altitude + 12) / 10)
  if (altitude < 10) return mixOklab(twilight[field], SKY_THEMES.clearDay[field], (altitude + 2) / 12)
  return SKY_THEMES.clearDay[field]
}

function guard(background: string, inks: string[]): string {
  let lab = hexToOklab(background)
  while (inks.some((ink) => ratio(ink, oklabToHex(lab)) < 4.6) && lab.l > 0) lab = { ...lab, l: lab.l - 0.005 }
  return oklabToHex(lab)
}

export function skyLight(input: SkyLightInput): SkyLight {
  const [top, mid, horizon] = keyframe(input.altitude, input.rising)
  const result = { top, mid, horizon } as SkyLight
  for (const field of ['ink', 'accent', 'ridgeFar', 'ridgeNear'] as const) result[field] = semantic(input.altitude, input.rising, field)
  const cloudWeight = smoothstep(30, 90, input.cloudCover) * 0.85
  const daylight = Math.min(1, Math.max(0, (input.altitude + 6) / 10))
  const cloudDaylight = smoothstep(-6, 12, input.altitude)
  for (const field of Object.keys(result) as (keyof SkyLight)[]) {
    const cloudTarget = mixOklab(SKY_THEMES.night[field], SKY_THEMES.cloudy[field], cloudDaylight)
    result[field] = mixOklab(result[field], cloudTarget, cloudWeight)
    if (input.wet > 0) result[field] = mixOklab(result[field], SKY_THEMES.rain[field], 0.7 * Math.min(1, input.wet))
    if (input.pm10 != null) {
      const dust = smoothstep(THRESHOLDS.dust.light, THRESHOLDS.dust.heavy, input.pm10) * 0.9 * daylight
      result[field] = mixOklab(result[field], SKY_THEMES.dust[field], Math.min(0.9, dust * (field === 'horizon' ? 1.3 : 1)))
    }
  }
  result.top = guard(result.top, [result.ink])
  result.mid = guard(result.mid, [result.ink, '#E8F9FF'])
  return result
}

export function skyLightVars(light: SkyLight): Record<string, string> {
  return { '--sky-top': light.top, '--sky-mid': light.mid, '--sky-horizon': light.horizon, '--ink': light.ink,
    '--accent': light.accent, '--ridge-far': light.ridgeFar, '--ridge-near': light.ridgeNear }
}
