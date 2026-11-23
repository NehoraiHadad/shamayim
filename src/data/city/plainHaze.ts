const EXTINCTION = 3.912
const validVisibility = (km: number) => Number.isFinite(km) && km > 0 ? km : 25

/** Meteorological visibility is the distance at which contrast drops to 2%. */
export function plainContrast(km: number, visibilityKm = 25) {
  return Math.exp(-EXTINCTION * km / validVisibility(visibilityKm))
}

export const MIN_PLAIN_CONTRAST = .05
export const plainContrastDistance = (contrast: number, visibilityKm: number) =>
  -Math.log(contrast) / EXTINCTION * validVisibility(visibilityKm)
