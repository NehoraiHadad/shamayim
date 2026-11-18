/** Meteorological visibility is the distance at which contrast drops to 2%. */
export function plainContrast(km: number, visibilityKm = 25) {
  const visibility = Number.isFinite(visibilityKm) && visibilityKm > 0 ? visibilityKm : 25
  return Math.exp(-3.912 * km / visibility)
}

export const MIN_PLAIN_CONTRAST = .05
