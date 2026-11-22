//# allFunctionsCalledOnLoad
import { viewDir, type LightDir, type Normal } from '../../world/livingLight'
import type { RGB } from '../../world/types'
import { landIrradiance, skyView, type RadianceWorld } from './landIrradiance'
import { toLinear, toSrgb } from './tone'
export { landIrradiance, type LandIrradiance, type RadianceWorld } from './landIrradiance'

/** One luminance compression of the linear Lambertian product, before path scattering. */
export const EXPOSURE_GAMMA = 0.6
export const WET_REFLECTANCE_DROP = 0.45
export const ALBEDO_CHROMA_BOOST = 1.35
export const SNOW_ALBEDO_LIN: readonly [number, number, number] = [0.84, 0.87, 0.92]
export const FLAT_NORMAL: Normal = [0, 0, 1]
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
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
  if (r > 1e-9) { const s = (yHorizon * (r ** EXPOSURE_GAMMA)) / r; cr = lr * s; cg = lg * s; cb = lb * s }
  const h = clamp01(hazeShare)
  return h <= 1e-6 || !hazeLin ? [cr, cg, cb] : [cr + (hazeLin[0] - cr) * h, cg + (hazeLin[1] - cg) * h, cb + (hazeLin[2] - cb) * h]
}

export function litRadianceRatio(world: RadianceWorld, albedo: RGB, normal: Normal = FLAT_NORMAL, shadowFactor = 1, chroma = ALBEDO_CHROMA_BOOST, moonVisibility = 1): number {
  const irr = landIrradiance(world), rho = albedoLinear(albedo, chroma), sf = clamp01(shadowFactor), vSky = skyView(normal, irr.sunDir, irr.skyBias)
  const sVis = Math.max(0, normal[0] * irr.sunDir.across + normal[1] * irr.sunDir.ahead + normal[2] * irr.sunDir.up) * sf
  const mVis = Math.max(0, normal[0] * irr.moonDir.across + normal[1] * irr.moonDir.ahead + normal[2] * irr.moonDir.up) * clamp01(moonVisibility)
  return linearLuminance([
    rho[0] * (irr.eSunVec[0] * sVis + irr.eMoonVec[0] * mVis + irr.eSkyVec[0] * vSky),
    rho[1] * (irr.eSunVec[1] * sVis + irr.eMoonVec[1] * mVis + irr.eSkyVec[1] * vSky),
    rho[2] * (irr.eSunVec[2] * sVis + irr.eMoonVec[2] * mVis + irr.eSkyVec[2] * vSky),
  ])
}

export function litLandLinear(
  world: RadianceWorld, albedo: RGB, normal: Normal = FLAT_NORMAL, shadowFactor = 1,
  hazeShare = 0, haze?: RGB, chroma = ALBEDO_CHROMA_BOOST, moonVisibility = 1,
): [number, number, number] {
  const irr = landIrradiance(world), rho = albedoLinear(albedo, chroma), sf = clamp01(shadowFactor)
  const sVis = Math.max(0, normal[0] * irr.sunDir.across + normal[1] * irr.sunDir.ahead + normal[2] * irr.sunDir.up) * sf
  const mVis = Math.max(0, normal[0] * irr.moonDir.across + normal[1] * irr.moonDir.ahead + normal[2] * irr.moonDir.up) * clamp01(moonVisibility)
  return shadeLinearRgb(rho, irr.eSunVec, irr.eMoonVec, irr.eSkyVec, sVis, mVis, skyView(normal, irr.sunDir, irr.skyBias), irr.yHorizon, hazeShare, haze ? srgbRgbToLinear(haze) : undefined)
}

export function litLandRgb(
  world: RadianceWorld, albedo: RGB, normal: Normal = FLAT_NORMAL, hazeShare = 0, haze?: RGB, shadowFactor = 1, chroma = ALBEDO_CHROMA_BOOST, moonVisibility = 1,
): RGB {
  return linearRgbToSrgb(litLandLinear(world, albedo, normal, shadowFactor, hazeShare, haze, chroma, moonVisibility))
}
