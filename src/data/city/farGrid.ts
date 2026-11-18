const KM_PER_DEGREE = 111.32
// A regular geographic grid with metric dimensions at the national reference latitude.
export const FAR_LAT_STEP = 1 / KM_PER_DEGREE
export const FAR_LON_STEP = .5 / (KM_PER_DEGREE * Math.cos(31.5 * Math.PI / 180))
export const FAR_SOUTH = 29.4
export const FAR_WEST = 34.1
export const FAR_ROWS = 450
export const FAR_COLS = 370
export const FAR_BUDGET = 60_000

export type FarTower = [lat: number, lon: number, heightM: number]
export type FarFile = { v: 1; r: string; t: FarTower[] }

// Each run stores a 24-bit flat start index, an 8-bit length, then the nonzero bytes.
export function encodeFarRuns(bytes: Uint8Array): string {
  const runs: string[] = []
  for (let i = 0; i < bytes.length;) {
    if (!bytes[i]) { i++; continue }
    const start = i
    while (i - start < 255 && bytes[i]) i++
    runs.push(String.fromCharCode(start >> 16, (start >> 8) & 255, start & 255, i - start,
      ...bytes.subarray(start, i)))
  }
  return btoa(runs.join(''))
}

export function decodeFarRuns(encoded: string): Uint8Array {
  const raw = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
  const bytes = new Uint8Array(FAR_ROWS * FAR_COLS)
  let end = 0
  for (let i = 0; i < raw.length;) {
    const start = (raw[i] << 16) | (raw[i + 1] << 8) | raw[i + 2]
    const length = raw[i + 3]
    i += 4
    if (!length || start < end || start + length > bytes.length || i + length > raw.length) {
      throw new Error('Invalid far city grid run')
    }
    bytes.set(raw.subarray(i, i + length), start)
    end = start + length
    i += length
  }
  return bytes
}
