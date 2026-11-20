export const STOREY_M = 3.1
const MAX_ROOF_M = 60
const typicalRoof = (levels: number, p90: number) =>
  levels > 0 ? Math.min(MAX_ROOF_M, levels * STOREY_M + 1) : p90 > 0 ? Math.min(10, Math.max(7, p90)) : 10

export function roofHeight(levels: number, p90: number, u: number) {
  const typ = typicalRoof(levels, p90)
  const hi = Math.max(typ, Math.min(MAX_ROOF_M, p90))
  return typ + (hi - typ) * u * u
}
