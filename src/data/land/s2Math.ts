/**
 * Sentinel-2 L2A radiometry, Scene Classification Layer (SCL) masking and spectral indices.
 *
 * Provenance:
 * - ESA Sentinel-2 L2A Product Definition (S2-PDGS-MPC-L2A-PDD-V2.11):
 *   QUANTIFICATION_VALUE = 10000 (scale = 1e-4). Processing Baseline >= 04.00 (2022-01-25) adds
 *   +1000 DN to BOA reflectance bands (BOA_ADD_OFFSET = -1000 DN, reflectance offset = -0.1):
 *   rho = (DN + BOA_ADD_OFFSET) / 10000 = DN * 0.0001 - 0.1. DN = 0 is NO_DATA.
 * - SCL classes: 0 NO_DATA, 1 SATURATED/DEFECTIVE, 2 DARK/CAST_SHADOW, 3 CLOUD_SHADOW,
 *   4 VEGETATION, 5 BARE, 6 WATER, 7 UNCLASSIFIED, 8 CLOUD_MED, 9 CLOUD_HIGH, 10 CIRRUS, 11 SNOW.
 *   Valid ground keeps {4, 5, 6, 7, 11}; masks out {0, 1, 2, 3, 8, 9, 10}.
 * - NDVI = (B08 - B04) / (B08 + B04) (Rouse et al. 1974); NDSI = (B03 - B11) / (B03 + B11) (Hall et al. 1995).
 */
export const SCL_VALID: ReadonlySet<number> = new Set([4, 5, 6, 7, 11])
export const L2A_SCALE = 1 / 10_000
export const PB04_OFFSET = -1000 * L2A_SCALE

export interface BandScaling { scale: number; offset: number; nodata: number }
export interface StacBandMeta { scale?: number; offset?: number; nodata?: number }

export interface StacItemProps {
  datetime: string
  's2:processing_baseline'?: string | number
  'earthsearch:boa_offset_applied'?: boolean
  's2:boa_add_offset'?: number
  'view:sun_elevation'?: number
  'view:sun_azimuth'?: number
}

export const isValidScl = (code: number): boolean => SCL_VALID.has(code)

/** Resolves `rho = DN * scale + offset` from asset `raster:bands[0]` or STAC item baseline properties. */
export function bandScalingOf(props: StacItemProps, band?: StacBandMeta): BandScaling {
  const nodata = typeof band?.nodata === 'number' ? band.nodata : 0
  const scale = typeof band?.scale === 'number' && band.scale > 0 ? band.scale : L2A_SCALE
  if (typeof band?.offset === 'number') return { scale, offset: band.offset, nodata }
  if (typeof props['s2:boa_add_offset'] === 'number') return { scale, offset: props['s2:boa_add_offset'] * scale, nodata }
  const baseline = Number.parseFloat(String(props['s2:processing_baseline'] ?? ''))
  const hasOffset = props['earthsearch:boa_offset_applied'] === true || (Number.isFinite(baseline) && baseline >= 4)
  return { scale, offset: hasOffset ? PB04_OFFSET : 0, nodata }
}

/** Converts a raw L2A uint16 DN to surface reflectance clamped to >= 0, or null for nodata. */
export function dnToReflectance(dn: number, scaling: BandScaling): number | null {
  if (!Number.isFinite(dn) || dn === scaling.nodata) return null
  return Math.max(0, dn * scaling.scale + scaling.offset)
}

/** Normalized difference `(a - b) / (a + b)` on reflectance, clamped to `[-1, 1]`, null if dark/invalid. */
export function normalizedDiff(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null
  const sum = a + b
  return sum < 1e-4 ? null : Math.max(-1, Math.min(1, (a - b) / sum))
}

export const computeNdvi = (redDn: number, nirDn: number, redS: BandScaling, nirS: BandScaling): number | null =>
  normalizedDiff(dnToReflectance(nirDn, nirS), dnToReflectance(redDn, redS))

export const computeNdsi = (greenDn: number, swirDn: number, greenS: BandScaling, swirS: BandScaling): number | null =>
  normalizedDiff(dnToReflectance(greenDn, greenS), dnToReflectance(swirDn, swirS))

export interface PatchBands {
  width: number
  height: number
  visual: Uint8Array
  red: ArrayLike<number>
  nir: ArrayLike<number>
  scl: Uint8Array
  redScale: BandScaling
  nirScale: BandScaling
  green?: ArrayLike<number>
  swir?: ArrayLike<number>
  greenScale?: BandScaling
  swirScale?: BandScaling
}

export interface GridBuffers {
  size: number
  rgb: Uint8Array
  ndvi: Float32Array
  ndsi: Float32Array
  valid: Float32Array
}

/** Aggregates aligned patch pixels into `size × size` cells, masking by SCL; prefers higher valid fraction. */
export function aggregatePatch(patch: PatchBands, out: GridBuffers): void {
  const { size } = out
  const { width, height, visual, red, nir, scl, redScale, nirScale, green, swir, greenScale, swirScale } = patch
  const hasNdsi = Boolean(green && swir && greenScale && swirScale)
  const stepX = width / size, stepY = height / size

  for (let row = 0; row < size; row++) {
    const y0 = Math.floor(row * stepY), y1 = Math.max(y0 + 1, Math.floor((row + 1) * stepY))
    for (let col = 0; col < size; col++) {
      const x0 = Math.floor(col * stepX), x1 = Math.max(x0 + 1, Math.floor((col + 1) * stepX))
      let r = 0, g = 0, b = 0, rgbN = 0, ndviSum = 0, ndviN = 0, ndsiSum = 0, ndsiN = 0, validN = 0, totalN = 0
      for (let y = y0; y < y1 && y < height; y++) {
        for (let x = x0; x < x1 && x < width; x++) {
          const p = y * width + x
          totalN++
          if (!isValidScl(scl[p])) continue
          validN++
          const v = p * 3
          if (visual[v] || visual[v + 1] || visual[v + 2]) {
            r += visual[v]; g += visual[v + 1]; b += visual[v + 2]; rgbN++
          }
          const ndvi = computeNdvi(red[p], nir[p], redScale, nirScale)
          if (ndvi !== null) { ndviSum += ndvi; ndviN++ }
          if (hasNdsi) {
            const ndsi = computeNdsi(green![p], swir![p], greenScale!, swirScale!)
            if (ndsi !== null) { ndsiSum += ndsi; ndsiN++ }
          }
        }
      }
      const frac = totalN > 0 ? validN / totalN : 0
      const idx = row * size + col
      if (frac <= out.valid[idx] || rgbN === 0) continue
      out.valid[idx] = frac
      const o = idx * 3
      out.rgb[o] = Math.round(r / rgbN)
      out.rgb[o + 1] = Math.round(g / rgbN)
      out.rgb[o + 2] = Math.round(b / rgbN)
      out.ndvi[idx] = ndviN > 0 ? ndviSum / ndviN : Number.NaN
      out.ndsi[idx] = ndsiN > 0 ? ndsiSum / ndsiN : Number.NaN
    }
  }
}
