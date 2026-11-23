import type { CogWindow } from './cogReader'
import { fromUtm, toUtm } from './utm'

/**
 * Aligns a Sentinel-2 spectral or visual COG window onto the SCL pixel lattice.
 * Fast path (zero-copy) when CRS, origin, pixel spacing and shape match identically; otherwise
 * samples each SCL pixel center in the band's own georeferenced lattice and emits `0` (nodata)
 * outside the band's clipped extent so shifted or partial bands never stretch onto wrong pixels.
 */
const EPS_M = 1e-3

export function sameLattice(a: CogWindow, b: CogWindow): boolean {
  return a.zone === b.zone
    && a.south === b.south
    && a.width === b.width
    && a.height === b.height
    && Math.abs(a.west - b.west) <= EPS_M
    && Math.abs(a.north - b.north) <= EPS_M
    && Math.abs(a.resX - b.resX) <= EPS_M
    && Math.abs(a.resY - b.resY) <= EPS_M
}

export function alignBandToScl(band: CogWindow, scl: CogWindow, channels: 1): ArrayLike<number>
export function alignBandToScl(band: CogWindow, scl: CogWindow, channels: 3): Uint8Array
export function alignBandToScl(band: CogWindow, scl: CogWindow, channels: 1 | 3): ArrayLike<number> {
  if (sameLattice(band, scl)) {
    return channels === 3 ? (band.data as Uint8Array) : band.data
  }
  const n = scl.width * scl.height
  // Fill single-channel spectral bands with NaN so clipped pixels outside the band's extent are
  // unconditionally rejected by `dnToReflectance`, even when STAC declares a nonzero nodata DN.
  const out = channels === 3 ? new Uint8Array(n * 3) : new Float32Array(n).fill(Number.NaN)
  const sameCrs = band.zone === scl.zone && band.south === scl.south

  for (let py = 0; py < scl.height; py++) {
    const sn = scl.north - (py + 0.5) * scl.resY
    for (let px = 0; px < scl.width; px++) {
      const se = scl.west + (px + 0.5) * scl.resX
      let be = se, bn = sn
      if (!sameCrs) {
        const ll = fromUtm(se, sn, scl.zone, scl.south)
        const p = toUtm(ll.lat, ll.lon, band.zone, band.south)
        be = p.e; bn = p.n
      }
      const bx = Math.floor((be - band.west) / band.resX)
      const by = Math.floor((band.north - bn) / band.resY)
      if (bx < 0 || by < 0 || bx >= band.width || by >= band.height) continue
      const dst = (py * scl.width + px) * channels
      const src = (by * band.width + bx) * channels
      if (channels === 3) {
        out[dst] = band.data[src]
        out[dst + 1] = band.data[src + 1]
        out[dst + 2] = band.data[src + 2]
      } else {
        out[dst] = band.data[src]
      }
    }
  }
  return out
}
