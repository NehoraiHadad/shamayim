//# allFunctionsCalledOnLoad
import { AFTERGLOW } from '../../world/afterglow'
import { smoothstep } from '../../world/ridgeLighting'
import type { RGB } from '../../world/types'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { rgbOf } from './tone'
import type { RadianceLight } from './landIrradiance'

// Cosine-weighted midpoint quadrature in sin(elevation) and azimuth from the sun.
// Haber et al., doi:10.1145/1095878.1095884 motivates separate broad twilight
// illumination and a low, forward-scattering band. These lobes approximate that
// distribution for illustration without a wavelength-resolved atmosphere or cloud heights.
const DOME = (() => {
  let zenith = 0, forward = 0, moment = 0, roughForward = 0
  for (let i = 0; i < 8; i++) {
    const up = (i + 0.5) / 8, horizontal = Math.sqrt(1 - up * up)
    const low = Math.exp(-up / 0.17)
    zenith += up ** 3 / 4
    for (let j = 0; j < 12; j++) {
      const cos = Math.cos((j + 0.5) * Math.PI / 6)
      const share = low * (0.5 + 0.5 * cos * horizontal) ** 3 * up / 48
      roughForward += Math.exp(-up / .38) * (0.5 + 0.5 * cos * horizontal) ** 2 * up / 48
      forward += share
      moment += share * horizontal * cos
    }
  }
  return { zenith, forward, moment, roughForward }
})()

export const afterglowWeight = (sunAlt: number) =>
  smoothstep(AFTERGLOW.to, AFTERGLOW.to + 2, sunAlt) * smoothstep(AFTERGLOW.from, AFTERGLOW.from - 2.3, sunAlt)

export const DAY_CLOUD_DHI_GAIN = 1.25

export function diffuseSky(light: RadianceLight, sunAlt: number, tau: number): { rgb: RGB; amount: number; exposure: number; bias: number } {
  const horizon = srgbRgbToLinear(rgbOf(light.palette.horizon))
  const mid = srgbRgbToLinear(light.ambient)
  const yHorizon = Math.max(1e-4, linearLuminance(horizon))
  const cloud = Math.min(1, Math.max(0, light.diffuse))
  const dayRgb = mid.map((m, i) => 0.35 * m + 0.65 * horizon[i]) as [number, number, number]
  const yDay = linearLuminance(dayRgb)
  // Keep the daylight diffuse energy. The uncovered share of the dome
  // supplies blue skylight; the covered share and the added DHI are cloud-scattered.
  const day = smoothstep(2, 15, sunAlt)
  const cloudSky = .45 * cloud * (1 - day) + day * (1 - (1 - cloud) / (1 + DAY_CLOUD_DHI_GAIN * cloud))
  for (let i = 0; i < 3; i++) dayRgb[i] += (yDay - dayRgb[i]) * cloudSky
  const twilight = smoothstep(10, 3, sunAlt) * smoothstep(-10, -3, sunAlt)
  const dayBias = 0.065 * smoothstep(3, 16, sunAlt) * (1 - cloud)
  if (twilight <= 0) return { rgb: dayRgb, amount: 0.2, exposure: yHorizon, bias: dayBias }

  const top = srgbRgbToLinear(rgbOf(light.palette.top))
  const glow = srgbRgbToLinear(light.afterglow?.rgb ?? rgbOf(light.palette.horizon))
  const aerosol = -Math.expm1(-2 * tau)
  // One twilight display calibration conditioned on cloud cover: the sky palette supplies
  // dome chromaticity, the fill/forward weights redistribute light across that dome, and
  // the meter gain below sets its displayed contribution. The combined response is fitted
  // to the twilight stills. None of these weights attenuates the independent direct beam.
  const scattered = 1.8 * cloud ** 2 * aerosol
  const forward = 0.8 * aerosol * (1 - 0.65 * cloud)
  // Integrate the fixed sky basis once. Its weights then multiply this hour's linear RGB
  // zenith and mid sky, the diffuse cloud fill, and the solar-side glow.
  const broad = mid.map((m, i) => m + (top[i] - m) * DOME.zenith) as [number, number, number]
  const broadY = linearLuminance(broad)
  const integrated = broad.map((c, i) => c + scattered * yHorizon + forward * DOME.forward * glow[i]) as [number, number, number]
  const moment = linearLuminance(glow) * forward * DOME.moment
  // Illustration meter blends the wide diffuse sky with the daylight display reference.
  const exposure = yHorizon + (broadY - yHorizon) * 0.60 * twilight
  const ySky = linearLuminance(integrated)
  // Under a thick deck the distribution of diffuse radiance broadens and the
  // wide meter needs less additional gain. Both coefficients are display calibration.
  const gain = (0.38 + 1.65 * cloud) * (0.84 - 0.15 * smoothstep(0.55, 0.85, cloud))
  const amount = 0.2 + (gain * ySky / yHorizon - 0.2) * twilight
  const rgb = dayRgb.map((d, i) => d + (integrated[i] * yDay / Math.max(1e-6, ySky) - d) * twilight) as [number, number, number]
  return { rgb, amount, exposure, bias: dayBias * (1 - twilight) + twilight * Math.min(0.25, moment / Math.max(1e-6, ySky)) }
}

/**
 * Directional form of the shared sky for a rough reflector. The broader low lobe
 * is normalized against its own cosine integral, keeping the land's sky energy.
 */
export function skyReflection(light: RadianceLight, sunAlt: number, tau: number, mean: RGB) {
  const cloud = Math.min(1, Math.max(0, light.diffuse))
  const twilight = smoothstep(10, 3, sunAlt) * smoothstep(-10, -3, sunAlt)
  const top = srgbRgbToLinear(rgbOf(light.palette.top)), mid = srgbRgbToLinear(light.ambient)
  const horizon = srgbRgbToLinear(rgbOf(light.palette.horizon)), aerosol = -Math.expm1(-2 * tau)
  const afterglow = light.afterglow ? srgbRgbToLinear(light.afterglow.rgb) : horizon
  const glowWeight = light.afterglow
    ? afterglowWeight(sunAlt) : 0
  const glow = horizon.map((c, i) => c + (afterglow[i] - c) * glowWeight)
  const cloudFill = 1.8 * cloud ** 2 * aerosol * linearLuminance(horizon)
  const forward = (.8 + 5.7 * glowWeight) * aerosol * (1 - .65 * cloud)
  const broad = mid.map((v, i) => v + (top[i] - v) * DOME.zenith + .16 * (horizon[i] - v)
    + cloudFill + forward * DOME.roughForward * glow[i]) as [number, number, number]
  const gain = twilight * linearLuminance(mean) / Math.max(1e-6, linearLuminance(broad))
  const bias = .065 * smoothstep(3, 16, sunAlt) * (1 - cloud)
  return (up: number, towardSun: number): RGB => {
    const m = Math.max(0, up), low = .78 * Math.exp(-m / .37)
    const lobe = Math.exp(-m / .38) * (.5 + .5 * towardSun) ** 2
    const channel = (i: 0 | 1 | 2) => mean[i] * (1 - twilight) * (1 + bias * towardSun)
      + gain * (mid[i] + (top[i] - mid[i]) * m ** 2 + low * (horizon[i] - mid[i]) + cloudFill + forward * lobe * glow[i])
    return [channel(0), channel(1), channel(2)]
  }
}
