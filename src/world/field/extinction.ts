/** Average 1 − exp(−τ) over a circular or elliptical footprint. */
export function footprintExtinction(tau: number, cumuliform: number) {
  if (tau <= 0) return 0
  const parabolic = 1 + Math.expm1(-tau) / tau
  let stratiform = 0
  const count = 128
  // Squared radius is uniform in area. Monotonicity bounds midpoint error by 1 / (2 count).
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count
    stratiform -= Math.expm1(-tau * (1 - u * u))
  }
  return parabolic * cumuliform + stratiform / count * (1 - cumuliform)
}
