export function encodeForm(size: number, big: number, roof: number, evidence: boolean) {
  return (size & 7) | ((big & 3) << 3) | ((roof & 3) << 5) | (Number(evidence) << 7)
}

export function decodeForm(byte: number) {
  return { size: byte & 7, big: (byte >> 3) & 3, roof: (byte >> 5) & 3, evidence: Boolean(byte & 128) }
}

// Half-open footprint area bands in square metres. Class 0 is reserved for absent footprints.
export function sizeClass(area: number) {
  return area < 60 ? 1 : area < 120 ? 2 : area < 220 ? 3 : area < 450 ? 4 :
    area < 1200 ? 5 : area < 5000 ? 6 : 7
}
