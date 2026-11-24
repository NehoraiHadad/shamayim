export function encodeForm(size: number, big: number, roof: number, evidence: boolean) {
  return (size & 7) | ((big & 3) << 3) | ((roof & 3) << 5) | (Number(evidence) << 7)
}

export function decodeForm(byte: number) {
  return { size: byte & 7, big: (byte >> 3) & 3, roof: (byte >> 5) & 3, evidence: Boolean(byte & 128) }
}

// Half-open footprint area bands in square metres. Class 0 is reserved for absent footprints.
export const AREA_BOUNDS = [0, 60, 120, 220, 450, 1200, 5000] as const

/** Square-equivalent frontage at the geometric midpoint. Use 1 m² as the smallest whole square metre, and the lower bound for the open class. */
export const FRONT_M = [0, ...AREA_BOUNDS.slice(1).map((upper, i) =>
  Math.sqrt(Math.sqrt(Math.max(1, AREA_BOUNDS[i]) * upper))), Math.sqrt(AREA_BOUNDS[AREA_BOUNDS.length - 1])]

export function sizeClass(area: number) {
  const size = AREA_BOUNDS.findIndex((upper, i) => i > 0 && area < upper)
  return size < 0 ? AREA_BOUNDS.length : size
}
