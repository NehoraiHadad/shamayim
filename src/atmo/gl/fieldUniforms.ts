import type { AirMotion } from '../motion'
import type { AirPalette } from './palette'
import type { FieldName } from './particles'

export interface FieldDraw {
  name: FieldName
  /** Unit travel direction on screen (y down). */
  dir: [number, number]
  color: [number, number, number]
  scalars: Record<string, number>
}

const norm = (x: number, y: number): [number, number] => {
  const l = Math.hypot(x, y) || 1
  return [x / l, y / l]
}

/** Uniforms for each particle field that is visible this frame (gusts and shower breathing applied). */
export function fieldUniforms(m: AirMotion, pal: AirPalette, t: number): FieldDraw[] {
  const c = m.cur
  const side = Math.sign(c.u || 1)
  const gustK = c.kmh > 0 ? (c.kmh + c.gust * m.gustEnv) / c.kmh : 1
  const out: FieldDraw[] = []

  if (c.rainD > 0.002) {
    const breathe = m.breathe ? 1 + 0.35 * Math.sin((2 * Math.PI * t) / 11) : 1
    const slant = Math.atan(Math.tan(c.slant) * gustK)
    out.push({
      name: 'rain', dir: [Math.sin(slant), Math.cos(slant)], color: pal.rain,
      scalars: { uLen: c.rainL, uWid: 0.9, uAlpha: c.rainA * pal.night, uDensity: c.rainD * breathe, uSway: 0, uLift: 0, uMargin: c.rainL + 12, uShape: 0 },
    })
  }
  if (c.snowD > 0.002) {
    out.push({
      name: 'snow', dir: norm(4 * c.kmh * c.u, c.snowV), color: pal.snow,
      scalars: { uLen: c.snowL * 3.2, uWid: c.snowL * 1.6, uAlpha: 0.95 * pal.night, uDensity: c.snowD, uSway: 12, uLift: 0, uMargin: 20, uShape: 2 },
    })
  }
  if (c.grainD > 0.002) {
    out.push({
      name: 'grains', dir: norm(side, 0.12), color: pal.grains,
      scalars: { uLen: 2.6, uWid: 1.3, uAlpha: c.grainA, uDensity: c.grainD, uSway: 0, uLift: 3, uMargin: 10, uShape: 2 },
    })
  }
  if (c.streakD > 0.002) {
    const len = c.streakL * Math.sqrt(gustK)
    out.push({
      name: 'streaks', dir: norm(side, 0.04), color: pal.streaks,
      scalars: { uLen: len, uWid: 1.1, uAlpha: c.streakA * (0.85 + 0.25 * m.gustEnv) * pal.night, uDensity: c.streakD, uSway: 0, uLift: 5, uMargin: len + 10, uShape: 1 },
    })
  }
  return out
}
