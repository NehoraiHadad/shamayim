//# allFunctionsCalledOnLoad
import type { Camera } from '../../domain/camera'
import { MOON_RGB } from '../../world/light'
import { viewDir, type LightDir, type Normal } from '../../world/livingLight'
import { smoothstep } from '../../world/ridgeLighting'
import { sunLight } from '../../world/sceneLight'
import type { RGB, WorldState } from '../../world/types'
import { rgbOf, toLinear, toSrgb } from './tone'

/**
 * Physical linear-light land radiance model (Stage 7 round 2).
 *   L / L_hor = (ρ / π) · (E_sun·max(0,n·s_sun)·C_sun + E_moon·max(0,n·s_moon)·C_moon + E_sky·V(n)·C_sky)
 * - ρ = boostChroma(srgbToLinear(albedo), 1.35) · (1 − 0.45·wet) (Twomey 1986; Lekner & Dorf 1988; 1.35× Stage-3 chroma).
 * - Calibration (uncoupled from display palette): Bird & Hulstrom (1981) at 38° clear sky (AM 1.62, 1013 hPa, 1.5 cm PW,
 *   AOD_500 = 0.08, 30 km vis: DNI_0 ≈ 800, DHI_0 ≈ 105 W/m² → DNI/DHI = 7.62), uncompressed beam transmission from
 *   `sunLight(sunAlt, air).strength` (undoing `airDim`'s ^0.35), CIE Type 12 horizon-to-sky ratio (`5.4` day / `5.0` low),
 *   and broken-cloud/Mie diffuse enhancement (`1.25×`, Gueymard 2017) gated above 2° solar altitude.
 * - Separate lunar beam (`bodies.moon`, `MOON_RGB`, `MOON_DIR_OVER_SKY = 2.4`).
 * - Single exposure & compression (`γ = 0.6`): `Y = Y_hor · (L / L_hor)^0.6`, then linear RGB Koschmieder haze once.
 */
export const EXPOSURE_GAMMA = 0.6
export const WET_REFLECTANCE_DROP = 0.45
export const DNI_OVER_DHI_CLEAR = 7.62
export const HORIZON_OVER_SKY_DAY = 5.4
export const HORIZON_OVER_SKY_LOW = 5.0
export const ALBEDO_CHROMA_BOOST = 1.35
export const SNOW_ALBEDO_LIN: readonly [number, number, number] = [0.84, 0.87, 0.92]
export const FLAT_NORMAL: Normal = [0, 0, 1]
const DIFFUSE_CLOUD_GAIN = 1.25
const MOON_DIR_OVER_SKY = 2.4
const REF_SUN_STRENGTH = sunLight(38, { visibilityKm: 30, dustWeight: 0 }).strength

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const srgbToLinear = toLinear
export const linearToSrgb = toSrgb
export const srgbRgbToLinear = (rgb: RGB): [number, number, number] => [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])]
export const linearRgbToSrgb = (rgb: readonly [number, number, number]): RGB => [toSrgb(rgb[0]), toSrgb(rgb[1]), toSrgb(rgb[2])]
export const linearLuminance = (lin: readonly [number, number, number]): number => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
export function unitChroma(rgb: RGB): [number, number, number] {
  const lin = srgbRgbToLinear(rgb), y = linearLuminance(lin)
  return y > 1e-6 ? [lin[0] / y, lin[1] / y, lin[2] / y] : [1, 1, 1]
}
export function albedoLinear(albedo: RGB, chroma = ALBEDO_CHROMA_BOOST): [number, number, number] {
  const r = toLinear(albedo[0]), g = toLinear(albedo[1]), b = toLinear(albedo[2])
  if (chroma === 1) return [r, g, b]
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const nr = Math.max(0, y + (r - y) * chroma), ng = Math.max(0, y + (g - y) * chroma), nb = Math.max(0, y + (b - y) * chroma)
  const ny = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb, s = ny > 1e-7 ? y / ny : 1
  return [clamp01(nr * s), clamp01(ng * s), clamp01(nb * s)]
}
export function surfaceNormal(acrossSlope: number, aheadSlope: number): Normal {
  const ax = -clamp(acrossSlope, -2, 2), ay = -clamp(aheadSlope, -2, 2), inv = 1 / Math.hypot(ax, ay, 1)
  return [ax * inv, ay * inv, inv]
}
export const dirAtBearing = (azimuth: number, altitude: number, bearingDeg: number, handed: 1 | -1): LightDir =>
  viewDir(azimuth, altitude, { heading: bearingDeg, handed, pxPerDeg: 1, width: 1 })
export type RadianceWorld = Pick<WorldState, 'light' | 'ground'> & {
  bodies?: Pick<WorldState['bodies'], 'sun' | 'moon'>; air?: Pick<WorldState['air'], 'visibilityKm' | 'dustWeight'>; camera?: Pick<Camera, 'heading' | 'handed'>
}
export interface LandIrradiance {
  eSunPi: number; eMoonPi: number; eSkyPi: number
  cSun: [number, number, number]; cMoon: [number, number, number]; cSky: [number, number, number]
  sunDir: LightDir; moonDir: LightDir; sunAz: number; sunAlt: number; moonAz: number; moonAlt: number
  yHorizon: number; wetFactor: number
  eSunVec: [number, number, number]; eMoonVec: [number, number, number]; eSkyVec: [number, number, number]
}

export function landIrradiance(world: RadianceWorld): LandIrradiance {
  const { light } = world
  const horLin = srgbRgbToLinear(rgbOf(light.palette.horizon)), midLin = srgbRgbToLinear(light.ambient)
  const yHorizon = Math.max(1e-4, linearLuminance(horLin))
  const sunAz = world.bodies?.sun.azimuth ?? light.azimuth
  const sunAlt = world.bodies?.sun.altitude ?? (light.shares.moon > light.shares.sun ? -15 : light.altitude)
  const moonAz = world.bodies?.moon.azimuth ?? light.azimuth
  const moonAlt = world.bodies?.moon.altitude ?? (light.shares.moon > light.shares.sun ? light.altitude : -15)
  const sunInfo = sunLight(sunAlt, { visibilityKm: world.air?.visibilityKm ?? 30, dustWeight: world.air?.dustWeight ?? 0 })
  const cleanInfo = sunLight(sunAlt, { visibilityKm: 40, dustWeight: 0 })
  const sunShare = clamp01(light.shares.sun), moonShare = clamp01(light.shares.moon)
  const visibleOpen = sunShare > 0 ? clamp01(sunShare / Math.max(1e-4, sunInfo.strength ** 0.35)) : 0
  const sunPhysical = visibleOpen * Math.min(1.15, sunInfo.strength / Math.max(1e-4, REF_SUN_STRENGTH))
  const dayRamp = smoothstep(2, 15, sunAlt)
  const horOverSky = HORIZON_OVER_SKY_LOW + (HORIZON_OVER_SKY_DAY - HORIZON_OVER_SKY_LOW) * smoothstep(0, 22, sunAlt)
  const aeroScatter = cleanInfo.strength > 1e-4 ? clamp01(1 - sunInfo.strength / cleanInfo.strength) : 0
  // Broken sunlit clouds & Mie haze boost diffuse sky irradiance (Gueymard 2017) without touching twilight (< 2°).
  const diffuseBoost = Math.max(clamp01(light.diffuse), 0.9 * aeroScatter) * dayRamp
  const eSkyPi = (1 / horOverSky) * (1 + DIFFUSE_CLOUD_GAIN * diffuseBoost)
  const eSunPi = (DNI_OVER_DHI_CLEAR / HORIZON_OVER_SKY_DAY) * sunPhysical
  const eMoonPi = (MOON_DIR_OVER_SKY / HORIZON_OVER_SKY_LOW) * moonShare
  const domeLin: [number, number, number] = [0.35 * midLin[0] + 0.65 * horLin[0], 0.35 * midLin[1] + 0.65 * horLin[1], 0.35 * midLin[2] + 0.65 * horLin[2]]
  const dY = linearLuminance(domeLin), cw = 0.45 * clamp01(light.diffuse)
  const cSky: [number, number, number] = dY > 1e-6
    ? [(domeLin[0] / dY) * (1 - cw) + cw, (domeLin[1] / dY) * (1 - cw) + cw, (domeLin[2] / dY) * (1 - cw) + cw] : [1, 1, 1]
  const cSun = unitChroma(sunInfo.rgb), cMoon = unitChroma(MOON_RGB)
  const wf = 1 - WET_REFLECTANCE_DROP * clamp01(world.ground.wet)
  const heading = world.camera?.heading ?? 180, handed = world.camera?.handed ?? 1
  const sunDir = world.bodies ? dirAtBearing(sunAz, sunAlt, heading, handed) : light.dir
  const moonDir = world.bodies ? dirAtBearing(moonAz, moonAlt, heading, handed) : light.dir
  return {
    eSunPi, eMoonPi, eSkyPi, cSun, cMoon, cSky, sunDir, moonDir, sunAz, sunAlt, moonAz, moonAlt, yHorizon, wetFactor: wf,
    eSunVec: [eSunPi * cSun[0] * wf, eSunPi * cSun[1] * wf, eSunPi * cSun[2] * wf],
    eMoonVec: [eMoonPi * cMoon[0] * wf, eMoonPi * cMoon[1] * wf, eMoonPi * cMoon[2] * wf],
    eSkyVec: [eSkyPi * cSky[0] * wf, eSkyPi * cSky[1] * wf, eSkyPi * cSky[2] * wf],
  }
}

export function shadeLinearRgb(
  rhoLin: readonly [number, number, number], eSun: readonly [number, number, number], eMoon: readonly [number, number, number],
  eSky: readonly [number, number, number], sVis: number, mVis: number, vSky: number, yHorizon: number,
  hazeShare = 0, hazeLin?: readonly [number, number, number],
): [number, number, number] {
  const lr = rhoLin[0] * (eSun[0] * sVis + eMoon[0] * mVis + eSky[0] * vSky)
  const lg = rhoLin[1] * (eSun[1] * sVis + eMoon[1] * mVis + eSky[1] * vSky)
  const lb = rhoLin[2] * (eSun[2] * sVis + eMoon[2] * mVis + eSky[2] * vSky)
  const r = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
  let cr = 0, cg = 0, cb = 0
  if (r > 1e-9) { const s = (yHorizon * (r ** EXPOSURE_GAMMA)) / r; cr = clamp01(lr * s); cg = clamp01(lg * s); cb = clamp01(lb * s) }
  const h = clamp01(hazeShare)
  return h <= 1e-6 || !hazeLin ? [cr, cg, cb] : [cr + (hazeLin[0] - cr) * h, cg + (hazeLin[1] - cg) * h, cb + (hazeLin[2] - cb) * h]
}

export function litRadianceRatio(world: RadianceWorld, albedo: RGB, normal: Normal = FLAT_NORMAL, shadowFactor = 1, chroma = ALBEDO_CHROMA_BOOST): number {
  const irr = landIrradiance(world), rho = albedoLinear(albedo, chroma), sf = clamp01(shadowFactor), vSky = (1 + normal[2]) * 0.5
  const sVis = Math.max(0, normal[0] * irr.sunDir.across + normal[1] * irr.sunDir.ahead + normal[2] * irr.sunDir.up) * sf
  const mVis = Math.max(0, normal[0] * irr.moonDir.across + normal[1] * irr.moonDir.ahead + normal[2] * irr.moonDir.up) * sf
  return linearLuminance([
    rho[0] * (irr.eSunVec[0] * sVis + irr.eMoonVec[0] * mVis + irr.eSkyVec[0] * vSky),
    rho[1] * (irr.eSunVec[1] * sVis + irr.eMoonVec[1] * mVis + irr.eSkyVec[1] * vSky),
    rho[2] * (irr.eSunVec[2] * sVis + irr.eMoonVec[2] * mVis + irr.eSkyVec[2] * vSky),
  ])
}

export function litLandLinear(
  world: RadianceWorld, albedo: RGB, normal: Normal = FLAT_NORMAL, shadowFactor = 1,
  hazeShare = 0, haze?: RGB, chroma = ALBEDO_CHROMA_BOOST,
): [number, number, number] {
  const irr = landIrradiance(world), rho = albedoLinear(albedo, chroma), sf = clamp01(shadowFactor)
  const sVis = Math.max(0, normal[0] * irr.sunDir.across + normal[1] * irr.sunDir.ahead + normal[2] * irr.sunDir.up) * sf
  const mVis = Math.max(0, normal[0] * irr.moonDir.across + normal[1] * irr.moonDir.ahead + normal[2] * irr.moonDir.up) * sf
  return shadeLinearRgb(rho, irr.eSunVec, irr.eMoonVec, irr.eSkyVec, sVis, mVis, (1 + normal[2]) * 0.5, irr.yHorizon, hazeShare, haze ? srgbRgbToLinear(haze) : undefined)
}

export function litLandRgb(
  world: RadianceWorld, albedo: RGB, normal: Normal = FLAT_NORMAL, hazeShare = 0, haze?: RGB, shadowFactor = 1, chroma = ALBEDO_CHROMA_BOOST,
): RGB {
  return linearRgbToSrgb(litLandLinear(world, albedo, normal, shadowFactor, hazeShare, haze, chroma))
}
