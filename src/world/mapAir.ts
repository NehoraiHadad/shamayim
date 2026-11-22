import type { AirInput, AirState } from '../atmo/airTypes'
import { cloud, dustShare, grains, haze, heat, rain, rainRate, rays, snow, streaks, windU } from './airParts'

const NONE = { count: 0, speed: 0, length: 0, alpha: 0 }

/**
 * Turn weather numbers into what the air shows (docs/design/ATMOSPHERE.md).
 * At most two moving systems survive, by priority: precipitation > dust > streaks > shimmer > rays.
 */
export function mapAir(i: AirInput): AirState {
  const u = windU(i.windDirection)
  const r = rainRate(i)
  const st: AirState = {
    calm: false,
    wind: {
      u,
      kmh: i.windSpeed,
      gustExcess: i.windGusts - i.windSpeed >= 15 ? i.windGusts - i.windSpeed : 0,
      cloudDrift: Math.max(1.5, 0.4 * i.windSpeed) * Math.sign(u || 1),
    },
    streaks: streaks(i.windSpeed, u),
    rain: rain(r, i.windSpeed, u, i.showerWeight ?? Number(i.weatherCode >= 80 && i.weatherCode <= 82)),
    snow: snow(i.snowfall),
    grains: grains(i),
    cloud: { ...cloud(i.cloudCover, r), seen: (i.cloudsSeen ?? 0) > 0 },
    heat: heat(i, r),
    haze: { farFade: 0, nearFade: 0, amount: 0, color: '' },
    rays: { alpha: rays(i, r) },
    thunder: (i.thunderWeight ?? Number(i.weatherCode >= 95)) > 0 && !i.preview,
    sunCoin: 0,
  }
  st.haze = haze(i, r, st.heat.bloom > 0)
  st.sunCoin = dustShare(i) * st.haze.farFade

  // One carrier per variable: wind shows through rain or dust when they are there.
  if (r >= 0.5 || st.grains.count > 0) st.streaks = { ...st.streaks, count: Math.round(st.streaks.count * 0.3) }

  const systems = [
    { on: st.rain.count + st.snow.count > 0, off: () => { st.rain = { ...st.rain, ...NONE }; st.snow = { ...st.snow, ...NONE } } },
    { on: st.grains.count > 0, off: () => { st.grains = NONE } },
    { on: st.streaks.count > 0, off: () => { st.streaks = NONE } },
    { on: st.heat.band > 0, off: () => { st.heat = { ...st.heat, band: 0, amplitude: 0 } } },
    { on: st.rays.alpha > 0, off: () => { st.rays = { alpha: 0 } } },
  ]
  systems.filter((s) => s.on).slice(2).forEach((s) => s.off())

  st.calm =
    st.cloud.coverage === 0 && !st.cloud.seen && st.rain.count + st.snow.count + st.grains.count + st.streaks.count === 0 &&
    st.heat.band === 0 && st.wind.gustExcess === 0 && !st.thunder
  return st
}
