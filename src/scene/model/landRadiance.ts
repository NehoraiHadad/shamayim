//# allFunctionsCalledOnLoad
import { smoothstep } from '../../world/ridgeLighting'
import type { Normal } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { rgbOf } from './tone'

/**
 * Physical linear-light land radiance model (Stage 7: living land).
 * Radiative transfer in units of horizon sky radiance `L_horizon`:
 *   L_land / L_horizon = (ρ / π) · (E_dir · max(0, n · s) · C_sun + E_sky · V(n) · C_sky)
 * with `ρ = srgbToLinear(albedo) · (1 − 0.45 · wet)` (Twomey et al. 1986; Lekner & Dorf 1988),
 * `V(n) = (1 + n_up) / 2`, `s = light.dir`, and unit-luminance linear chromaticities `C_sun`, `C_sky`.
 * Calibration (ONE global constant, ASTM G173-03 / Bird & Hulstrom 1981 clear sky at ~38° altitude:
 * DNI ≈ 800 W/m², DHI ≈ 105 W/m² → `DNI_OVER_DHI_CLEAR = 7.6`): `E_sky / (π · L_horizon)` is the exact
 * cosine-weighted hemisphere integral `∫₀^{π/2} (L(θ)/L_hor) sin(2θ) dθ` over `top` (0.25), `mid` (0.633),
 * `horizon` (0.117), inverted by `1/γ` (`γ = 0.6`), with daytime overcast gain gated by `(1 − shares.sun) · diffuse`.
 * Cloud-once rule: `shares.sun` drives `E_dir`; discrete cloud shadows remove ONLY `E_dir`; `palette.ridgeNear`
 * never darkens lit land again. Exposure & compression (Stevens/Reinhard `γ = 0.6`): `Y = Y_hor · (L / L_hor)^0.6`.
 * Form/light split: form stores `F_lin(ρ) = (Y(ρ)/ρ_ref)^0.6 · (ρ/Y(ρ))` (`ρ_ref = 0.50`); light pass multiplies by
 * `M_lin(n) = Y_hor · (ρ_ref · E_Y)^0.6 · (E(n)/E_Y) ∈ [0, 1]`.
 */
export const EXPOSURE_GAMMA = 0.6
export const WET_REFLECTANCE_DROP = 0.45
export const DNI_OVER_DHI_CLEAR = 7.6
export const REF_REFLECTANCE = 0.5
export const FLAT_NORMAL: Normal = [0, 0, 1]
const OVERCAST_SKY_GAIN = 0.6
const MOON_DIR_SCALE = 0.3

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** IEC 61966-2-1 sRGB `[0, 1]` <-> linear `[0, 1]` and ITU-R BT.709 luminance Y. */
export const srgbToLinear = (c: number): number => { const x = clamp01(c); return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
export const linearToSrgb = (l: number): number => { const x = clamp01(l); return x <= 0.0031308 ? 12.92 * x : 1.055 * (x ** (1 / 2.4)) - 0.055 }
export const srgbRgbToLinear = (rgb: RGB): [number, number, number] => [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])]
export const linearRgbToSrgb = (rgb: readonly [number, number, number]): RGB => [linearToSrgb(rgb[0]), linearToSrgb(rgb[1]), linearToSrgb(rgb[2])]
export const linearLuminance = (lin: readonly [number, number, number]): number => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]

/** Luminance-normalised linear chromaticity (`Y = 1`). */
export function unitChroma(rgb: RGB): [number, number, number] {
  const lin = srgbRgbToLinear(rgb), y = linearLuminance(lin)
  return y > 1e-6 ? [lin[0] / y, lin[1] / y, lin[2] / y] : [1, 1, 1]
}
/** Upward unit normal in view frame `(across, ahead, up)` from true slopes (`∂z/∂across`, `∂z/∂ahead`). */
export function surfaceNormal(acrossSlope: number, aheadSlope: number): Normal {
  const ax = -clamp(acrossSlope, -2, 2), ay = -clamp(aheadSlope, -2, 2), inv = 1 / Math.hypot(ax, ay, 1)
  return [ax * inv, ay * inv, inv]
}

export type RadianceWorld = Pick<WorldState, 'light' | 'ground'> & { bodies?: Pick<WorldState['bodies'], 'sun'> }
export interface LandIrradiance {
  eDirPi: number; eSkyPi: number; cSun: [number, number, number]; cSky: [number, number, number]
  yHorizon: number; wetFactor: number; dir: WorldState['light']['dir']
}

/** Derives incident linear irradiance (in units of `π · L_horizon`) from `WorldState.light`, counting cloud once. */
export function landIrradiance(world: RadianceWorld): LandIrradiance {
  const { light } = world
  const horLin = srgbRgbToLinear(rgbOf(light.palette.horizon)), midLin = srgbRgbToLinear(light.ambient)
  const yHorizon = Math.max(1e-4, linearLuminance(horLin))
  const yTop = linearLuminance(srgbRgbToLinear(rgbOf(light.palette.top))), yMid = linearLuminance(midLin)
  const invG = 1 / EXPOSURE_GAMMA
  const domeSkyPi = clamp(0.25 * ((yTop / yHorizon) ** invG) + 0.633 * ((yMid / yHorizon) ** invG) + 0.117, 0.12, 1)
  const sunAlt = world.bodies?.sun.altitude ?? (light.shares.moon > light.shares.sun ? -15 : light.altitude)
  const sunShare = clamp01(light.shares.sun)
  const overcastDay = clamp01(light.diffuse * (1 - sunShare)) * smoothstep(2, 15, sunAlt)
  const eSkyPi = domeSkyPi * (1 + OVERCAST_SKY_GAIN * overcastDay)
  const eDirPi = DNI_OVER_DHI_CLEAR * domeSkyPi * (sunShare + MOON_DIR_SCALE * clamp01(light.shares.moon))
  // Hemispherical sky chromaticity: blend mid-sky (`ambient`) + horizon + neutral cloud scatter (`diffuse`), ~8–10k K cool sky.
  const domeLin: [number, number, number] = [0.35 * midLin[0] + 0.65 * horLin[0], 0.35 * midLin[1] + 0.65 * horLin[1], 0.35 * midLin[2] + 0.65 * horLin[2]]
  const dY = linearLuminance(domeLin), cw = 0.45 * clamp01(light.diffuse)
  const cSky: [number, number, number] = dY > 1e-6
    ? [(domeLin[0] / dY) * (1 - cw) + cw, (domeLin[1] / dY) * (1 - cw) + cw, (domeLin[2] / dY) * (1 - cw) + cw]
    : [1, 1, 1]
  return {
    eDirPi, eSkyPi, cSun: unitChroma(light.colour), cSky, yHorizon,
    wetFactor: 1 - WET_REFLECTANCE_DROP * clamp01(world.ground.wet), dir: light.dir,
  }
}

function incidentLinear(irr: LandIrradiance, normal: Normal, shadowFactor: number): [number, number, number] {
  const ndotl = Math.max(0, normal[0] * irr.dir.across + normal[1] * irr.dir.ahead + normal[2] * irr.dir.up)
  const ed = irr.eDirPi * clamp01(shadowFactor) * ndotl, es = irr.eSkyPi * (1 + normal[2]) * 0.5, wf = irr.wetFactor
  return [(ed * irr.cSun[0] + es * irr.cSky[0]) * wf, (ed * irr.cSun[1] + es * irr.cSky[1]) * wf, (ed * irr.cSun[2] + es * irr.cSky[2]) * wf]
}

/** Light-free reflectance form encoding (no lightness squeeze): `F_lin(ρ) = (Y(ρ)/ρ_ref)^0.6 · (ρ/Y(ρ))`. */
export function albedoToFormTone(albedo: RGB): RGB {
  const rho = srgbRgbToLinear(albedo), y = linearLuminance(rho)
  if (y <= 1e-7) return [0, 0, 0]
  const s = ((y / REF_REFLECTANCE) ** EXPOSURE_GAMMA) / y
  return linearRgbToSrgb([rho[0] * s, rho[1] * s, rho[2] * s])
}

/** sRGB `multiply` colour `M_sRGB(n, world)` for Band 0 plane shading (linear-exact under `multiply`). */
export function lightMultiplierRgb(world: RadianceWorld, normal: Normal = FLAT_NORMAL, shadowFactor = 1): RGB {
  const irr = landIrradiance(world), inc = incidentLinear(irr, normal, shadowFactor), eY = linearLuminance(inc)
  if (eY <= 1e-7) return [0, 0, 0]
  const s = (irr.yHorizon * ((REF_REFLECTANCE * eY) ** EXPOSURE_GAMMA)) / eY
  return linearRgbToSrgb([inc[0] * s, inc[1] * s, inc[2] * s])
}

/** Linear land-to-horizon radiance ratio `L_land / L_horizon` before eye-adaptation compression. */
export function litRadianceRatio(world: RadianceWorld, albedo: RGB, normal: Normal = FLAT_NORMAL, shadowFactor = 1): number {
  const rho = srgbRgbToLinear(albedo), inc = incidentLinear(landIrradiance(world), normal, shadowFactor)
  return linearLuminance([rho[0] * inc[0], rho[1] * inc[1], rho[2] * inc[2]])
}

/** Displayed linear RGB after exposure & compression (before aerial haze). */
export function litLandLinear(world: RadianceWorld, albedo: RGB, normal: Normal = FLAT_NORMAL, shadowFactor = 1): [number, number, number] {
  const irr = landIrradiance(world), rho = srgbRgbToLinear(albedo), inc = incidentLinear(irr, normal, shadowFactor)
  const L: [number, number, number] = [rho[0] * inc[0], rho[1] * inc[1], rho[2] * inc[2]], r = linearLuminance(L)
  if (r <= 1e-9) return [0, 0, 0]
  const s = (irr.yHorizon * (r ** EXPOSURE_GAMMA)) / r
  return [clamp01(L[0] * s), clamp01(L[1] * s), clamp01(L[2] * s)]
}

/** Canonical lit land sRGB colour for any albedo, normal, and optional linear Koschmieder aerial haze. */
export function litLandRgb(
  world: RadianceWorld, albedo: RGB, normal: Normal = FLAT_NORMAL, hazeShare = 0, haze?: RGB, shadowFactor = 1,
): RGB {
  const lin = litLandLinear(world, albedo, normal, shadowFactor), h = clamp01(hazeShare)
  if (h <= 1e-6 || !haze) return linearRgbToSrgb(lin)
  const air = srgbRgbToLinear(haze)
  return linearRgbToSrgb([lin[0] * (1 - h) + air[0] * h, lin[1] * (1 - h) + air[1] * h, lin[2] * (1 - h) + air[2] * h])
}

/** Exact `source-over` sRGB alpha equivalent to linear-light Koschmieder haze `L = L_0·(1−h) + L_air·h`. */
export function linearHazeAlpha(hazeShare: number, landLinearY: number, airLinearY: number): number {
  const h = clamp01(hazeShare)
  if (h <= 1e-5 || h >= 1 - 1e-5) return h
  const c0 = linearToSrgb(landLinearY), cAir = linearToSrgb(airLinearY), span = cAir - c0
  return Math.abs(span) < 0.02 ? h : clamp01((linearToSrgb(landLinearY * (1 - h) + airLinearY * h) - c0) / span)
}

/** Linear-correct `multiply` sRGB colour for a cloud/cast shadow removing ONLY the direct term. */
export function cloudShadowMultiplyRgb(world: RadianceWorld, normal: Normal = FLAT_NORMAL): RGB {
  const irr = landIrradiance(world)
  if (irr.eDirPi <= 1e-6) return [1, 1, 1]
  const lit = incidentLinear(irr, normal, 1), diff = incidentLinear(irr, normal, 0)
  const yLit = linearLuminance(lit), yDiff = linearLuminance(diff)
  if (yLit <= 1e-7 || yDiff >= yLit) return [1, 1, 1]
  const f = (yDiff / yLit) ** EXPOSURE_GAMMA, c0 = 0.55, y0 = srgbToLinear(c0)
  const ratio: [number, number, number] = [lit[0] > 1e-7 ? diff[0] / lit[0] : 1, lit[1] > 1e-7 ? diff[1] / lit[1] : 1, lit[2] > 1e-7 ? diff[2] / lit[2] : 1]
  const rY = linearLuminance(ratio), k = rY > 1e-7 ? f / rY : f, enc = (v: number) => clamp01(linearToSrgb(y0 * clamp01(v)) / c0)
  return [enc(ratio[0] * k), enc(ratio[1] * k), enc(ratio[2] * k)]
}
