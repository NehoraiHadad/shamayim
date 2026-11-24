//# allFunctionsCalledOnLoad
import { smoothstep } from '../../world/ridgeLighting'
import type { RGB } from '../../world/types'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { rgbOf } from './tone'
import type { RadianceLight } from './landIrradiance'

// Cosine-weighted midpoint quadrature in sin(elevation) and azimuth from the sun.
// Haber et al., doi:10.1145/1095878.1095884 motivates separate broad twilight
// illumination and a low, forward-scattering band. These lobes approximate that
// distribution for illustration without a wavelength-resolved atmosphere or cloud heights.
// Integrate the same low-altitude shapes for diffuse and reflected sky.
// Diffuse receivers approximate the low lobe's colour with the horizon palette.
const horizonShare = (up: number) => .78 * Math.exp(-up / .37)
export const ROUGH_LOBE_HEIGHT = .38
export const lowLobe = (up: number, towardSun: number) => Math.exp(-up / ROUGH_LOBE_HEIGHT) * (.5 + .5 * towardSun) ** 2
// Match the tiled conductor's cosine-power curvature at the lobe axis:
// ((1 + cos θ)/2)^p ≈ 1 − p θ²/4, so p is four times the cosine power.
// Scale the elevation e-folding height by the same ratio of angular widths.
export const METAL_POWER = 2.7
const METAL_AZ_POWER = 4 * METAL_POWER
const METAL_HEIGHT = ROUGH_LOBE_HEIGHT * Math.sqrt(2 / METAL_AZ_POWER)
export const metalSkyLobe = (up: number, towardSun: number) =>
  Math.exp(-up / METAL_HEIGHT) * (.5 + .5 * towardSun) ** METAL_AZ_POWER
export { afterglowWeight } from './skyGlows'
export const twilightShare = (sunAlt: number) => smoothstep(10, 3, sunAlt) * smoothstep(-10, -3, sunAlt)
const cloudScatter = (cloud: number, aerosol: number) => 1.8 * cloud ** 2 * aerosol
const lowScatter = (cloud: number, aerosol: number) => aerosol * (1 - .65 * cloud)
const BASE_FORWARD = .8
const DOME = (() => {
  let zenith = 0, horizon = 0, forward = 0, moment = 0, roughForward = 0, metalForward = 0
  for (let i = 0; i < 8; i++) {
    const up = (i + 0.5) / 8, horizontal = Math.sqrt(1 - up * up)
    const low = Math.exp(-up / 0.17)
    zenith += up ** 3 / 4
    horizon += horizonShare(up) * up / 4
    for (let j = 0; j < 12; j++) {
      const cos = Math.cos((j + 0.5) * Math.PI / 6)
      const share = low * (0.5 + 0.5 * cos * horizontal) ** 3 * up / 48
      roughForward += lowLobe(up, cos * horizontal) * up / 48
      metalForward += metalSkyLobe(up, cos * horizontal) * up / 48
      forward += share
      moment += share * horizontal * cos
    }
  }
  return { zenith, horizon, forward, moment, roughForward, metalForward }
})()

const domeChannel = (mid: number, top: number, horizon: number, zenithShare: number, lowShare: number) =>
  mid + (top - mid) * zenithShare + (horizon - mid) * lowShare

function twilightIntegral(mid: RGB, top: RGB, horizon: RGB, fill: number | RGB, forward: number, lobe: RGB): RGB {
  return mid.map((m, i) => domeChannel(m, top[i], horizon[i], DOME.zenith, DOME.horizon)
    + (typeof fill === 'number' ? fill : fill[i]) + forward * DOME.roughForward * lobe[i]) as [number, number, number]
}

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
  const twilight = twilightShare(sunAlt)
  const dayBias = 0.065 * smoothstep(3, 16, sunAlt) * (1 - cloud)
  if (twilight <= 0) return { rgb: dayRgb, amount: 0.2, exposure: yHorizon, bias: dayBias }

  const top = srgbRgbToLinear(rgbOf(light.palette.top))
  const glow = srgbRgbToLinear(light.afterglow?.rgb ?? rgbOf(light.palette.horizon))
  const aerosol = -Math.expm1(-2 * tau)
  // One twilight display calibration conditioned on cloud cover: the sky palette supplies
  // dome chromaticity, the fill/forward weights redistribute light across that dome, and
  // the meter gain below sets its displayed contribution. The combined response is fitted
  // to the twilight stills. None of these weights attenuates the independent direct beam.
  const scattered = cloudScatter(cloud, aerosol)
  const forward = BASE_FORWARD * lowScatter(cloud, aerosol)
  // Keep the luminance and directional meters while taking
  // chromaticity from a rough wall approximation that averages the painted horizon palette.
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
  const chroma = twilightIntegral(mid, top, horizon, scattered * yHorizon, forward, horizon)
  const scale = yDay / Math.max(1e-6, linearLuminance(chroma))
  const rgb = dayRgb.map((d, i) => d + (chroma[i] * scale - d) * twilight) as [number, number, number]
  return { rgb, amount, exposure, bias: dayBias * (1 - twilight) + twilight * Math.min(0.25, moment / Math.max(1e-6, ySky)) }
}

/**
 * Directional sky for a rough reflector with a sampled forward-lobe colour. The low lobe
 * is normalized to the diffuse reference luminance over the upper hemisphere.
 */
export function skyReflection(light: RadianceLight, sunAlt: number, tau: number, mean: RGB,
  lobeColor: RGB, forwardAccent = 0, shape: 'rough' | 'metal' = 'rough', cloudColor?: RGB) {
  const cloud = Math.min(1, Math.max(0, light.diffuse))
  const twilight = twilightShare(sunAlt)
  const top = srgbRgbToLinear(rgbOf(light.palette.top)), mid = srgbRgbToLinear(light.ambient)
  const horizon = srgbRgbToLinear(rgbOf(light.palette.horizon)), aerosol = -Math.expm1(-2 * tau)
  const cloudFill = cloudScatter(cloud, aerosol) * Math.max(1e-4, linearLuminance(horizon))
  const cloudY = cloudColor ? linearLuminance(cloudColor) : 0
  const fill = cloudColor && cloudY > 0 && cloudFill > 0 && twilight > 0
    ? cloudColor.map(channel => cloudFill * channel / cloudY) as [number, number, number]
    : [cloudFill, cloudFill, cloudFill] as const
  // The low reflected band loses its directional accent through civil
  // twilight as the sun moves below the horizon of the rough reflector.
  const accent = forwardAccent * smoothstep(-10, 0, sunAlt)
  const forward = (BASE_FORWARD + accent) * lowScatter(cloud, aerosol)
  // Concentrate the same hemispheric forward energy into the narrower
  // conductor shape. The broad luminance meter therefore keeps its meaning.
  const lobe = shape === 'metal' ? metalSkyLobe : lowLobe
  const normalization = shape === 'metal' ? DOME.roughForward / DOME.metalForward : 1
  const broad = twilightIntegral(mid, top, horizon, fill, forward, lobeColor)
  const gain = twilight * linearLuminance(mean) / Math.max(1e-6, linearLuminance(broad))
  const bias = .065 * smoothstep(3, 16, sunAlt) * (1 - cloud)
  return (up: number, towardSun: number, lobeTowardSun = towardSun): RGB => {
    const m = Math.max(0, up), low = horizonShare(m)
    const forwardLight = forward * normalization * lobe(m, lobeTowardSun)
    const channel = (i: 0 | 1 | 2) => mean[i] * (1 - twilight) * (1 + bias * towardSun)
      + gain * (domeChannel(mid[i], top[i], horizon[i], m ** 2, low) + fill[i] + forwardLight * lobeColor[i])
    return [channel(0), channel(1), channel(2)]
  }
}
