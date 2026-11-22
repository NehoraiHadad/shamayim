//# allFunctionsCalledOnLoad
import { smoothstep } from '../../world/ridgeLighting'
import type { Light, RGB } from '../../world/types'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { rgbOf } from './tone'

// Cosine-weighted midpoint quadrature in sin(elevation) and azimuth from the sun.
// Haber et al., doi:10.1145/1095878.1095884 motivates separate broad twilight
// illumination and a low, forward-scattering band. These lobes approximate that
// distribution for illustration without a wavelength-resolved atmosphere or cloud heights.
const DOME = Array.from({ length: 8 }, (_, i) => {
  const up = (i + 0.5) / 8
  return {
    up, horizon: Math.exp(-up / 0.17), horizontal: Math.sqrt(1 - up * up),
    azimuth: Array.from({ length: 12 }, (_, j) => Math.cos((j + 0.5) * Math.PI / 6)),
  }
})

export function diffuseSky(light: Light, sunAlt: number, tau: number): { rgb: RGB; amount: number; exposure: number; bias: number } {
  const horizon = srgbRgbToLinear(rgbOf(light.palette.horizon))
  const mid = srgbRgbToLinear(light.ambient)
  const yHorizon = Math.max(1e-4, linearLuminance(horizon))
  const cloud = Math.min(1, Math.max(0, light.diffuse))
  const dayRgb = mid.map((m, i) => 0.35 * m + 0.65 * horizon[i]) as [number, number, number]
  const yDay = linearLuminance(dayRgb)
  // Cloud-scattered light varies less in chromaticity across the dome.
  for (let i = 0; i < 3; i++) dayRgb[i] += (yDay - dayRgb[i]) * 0.45 * cloud
  const twilight = smoothstep(10, 3, sunAlt) * smoothstep(-10, -3, sunAlt)
  const dayBias = 0.065 * smoothstep(3, 16, sunAlt) * (1 - cloud)
  if (twilight <= 0) return { rgb: dayRgb, amount: 0.2, exposure: yHorizon, bias: dayBias }

  const top = srgbRgbToLinear(rgbOf(light.palette.top))
  const glow = srgbRgbToLinear(light.afterglow?.rgb ?? rgbOf(light.palette.horizon))
  const aerosol = -Math.expm1(-2 * tau)
  const scattered = 1.8 * cloud ** 2 * aerosol
  const forward = 0.8 * aerosol * (1 - 0.65 * cloud)
  const integrated: [number, number, number] = [0, 0, 0]
  let broadY = 0, moment = 0
  for (const { up, horizon: low, horizontal, azimuth } of DOME) {
    // The UI's horizon is a narrow, bright direction. Meter exposure on the body of the sky.
    const broad = mid.map((m, i) => m + (top[i] - m) * up ** 2)
    broadY += linearLuminance(broad as unknown as RGB) * up / 4
    for (const cos of azimuth) {
      const lobe = forward * low * (0.5 + 0.5 * cos * horizontal) ** 3
      for (let i = 0; i < 3; i++) integrated[i] += (broad[i] + scattered * yHorizon + lobe * glow[i]) * up / 48
      moment += linearLuminance(glow) * lobe * horizontal * cos / 48
    }
  }
  // Illustration meter blends the wide diffuse sky with the daylight display reference.
  const exposure = yHorizon + (broadY - yHorizon) * 0.60 * twilight
  const ySky = linearLuminance(integrated)
  // Under a thick deck the distribution of diffuse radiance broadens and the
  // wide meter needs less additional gain. Both coefficients are display calibration.
  const gain = (0.38 + 1.65 * cloud) * (0.84 - 0.20 * smoothstep(0.55, 0.85, cloud))
  const amount = 0.2 + (gain * ySky / yHorizon - 0.2) * twilight
  const rgb = dayRgb.map((d, i) => d + (integrated[i] * yDay / Math.max(1e-6, ySky) - d) * twilight) as [number, number, number]
  return { rgb, amount, exposure, bias: dayBias * (1 - twilight) + twilight * Math.min(0.25, moment / Math.max(1e-6, ySky)) }
}
