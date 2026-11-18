import { THRESHOLDS } from '../config/thresholds'
import { ratio } from './contrast'
import { hexToOklab, mixOklab, oklabToHex } from './oklab'
import type { Aerosol } from '../ui/scene/sceneLight'
import { skyAir } from './skyAir'
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
  /** The lit scene: the hour's aerosol, which whitens a hazy horizon by day and reddens it at sunrise and sunset. */
  air?: Aerosol
}
export type SkyLight = Pick<SkyTheme, 'top' | 'mid' | 'horizon' | 'ink' | 'accent' | 'ridgeFar' | 'ridgeNear'>

const smoothstep = (lo: number, hi: number, value: number) => {
  const x = Math.min(1, Math.max(0, (value - lo) / (hi - lo)))
  return x * x * (3 - 2 * x)
}

type ColorRow = readonly [number, string, string, string]

/**
 * Clear-sky zenith / mid / horizon by sun altitude, after real skies: deep blue night; blue hour with a rose band low on
 * the horizon (dawn pinker, dusk more orange); a warm horizon only in the few degrees around sunrise and sunset; then a
 * quick turn to blue once the sun is up, with a pale whitish-blue horizon by day (beige comes only from haze or dust).
 */
function anchors(rising: boolean): ColorRow[] {
  const dawn = rising
  return [
    [-18, '#070B1E', '#131C3F', '#2A2F5C'], [-12, '#0A1130', '#19234F', '#33386A'],
    [-9, '#0F1840', '#24305E', dawn ? '#604C78' : '#604874'],
    [-6, '#14214F', '#363D72', dawn ? '#8C6282' : '#925C70'],
    [-4, '#17275A', dawn ? '#40467E' : '#463F78', dawn ? '#B27882' : '#BA6C68'],
    [-2, '#1C2F66', dawn ? '#4A5088' : '#504C84', dawn ? '#D69482' : '#DC845E'],
    [0, '#20387A', dawn ? '#4E5C94' : '#565A8E', dawn ? '#F2AE84' : '#F29B5E'],
    [3, '#22427F', '#3F649E', '#F5CB9C'], [7, '#1E4D90', '#3A6CA8', '#E6DCC6'],
    [12, '#18559E', '#3570AE', '#CFDFEC'], [25, '#11519B', '#3172B0', '#BBD5EC'],
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
  // Once the sun is up the land is lit: the twilight tint is gone by 6°, not an hour later.
  if (altitude < 6) return mixOklab(twilight[field], SKY_THEMES.clearDay[field], (altitude + 2) / 8)
  return SKY_THEMES.clearDay[field]
}

function guard(background: string, inks: string[]): string {
  let lab = hexToOklab(background)
  while (inks.some((ink) => ratio(ink, oklabToHex(lab)) < 4.6) && lab.l > 0) lab = { ...lab, l: lab.l - 0.005 }
  return oklabToHex(lab)
}

export function skyLight(input: SkyLightInput): SkyLight {
  const [top, clearMid, clearHorizon] = keyframe(input.altitude, input.rising)
  const { mid, horizon } = input.air ? skyAir({ mid: clearMid, horizon: clearHorizon }, input.altitude, input.air)
    : { mid: clearMid, horizon: clearHorizon }
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
