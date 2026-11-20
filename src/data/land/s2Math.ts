/**
 * Sentinel-2 L2A radiometry, Scene Classification Layer (SCL) masking and spectral indices.
 *
 * Provenance:
 * - ESA Sentinel-2 L2A Product Definition (S2-PDGS-MPC-L2A-PDD-V2.11):
 *   QUANTIFICATION_VALUE = 10000 (`L2A_SCALE = 1e-4`). Processing Baseline >= 04.00 (2022-01-25)
 *   adds +1000 DN (`BOA_ADD_OFFSET = -1000 DN`, `-0.1` reflectance) to unharmonised ESA products.
 * - Element84 Earth Search `sentinel-2-l2a` v1 (github.com/Element84/earth-search/issues/71,
 *   verified live on `S2B_36SXB_20261115_1_L2A` PB 05.13): when `earthsearch:boa_offset_applied` is
 *   `true`, Earth Search has ALREADY subtracted 1000 DN in the COG pixels (open sea B04 reads DN 1–21,
 *   land ~700), even though `raster:bands[0].offset` still reports `-0.1` from ESA metadata. Do NOT
 *   subtract `-0.1` a second time when `boa_offset_applied === true`.
 * - SCL classes (Sen2Cor ATBD): 0 NO_DATA, 1 SATURATED, 2 DARK/SHADOW, 3 CLOUD_SHADOW, 4 VEGETATION,
 *   5 BARE, 6 WATER, 7 UNCLASSIFIED, 8 CLOUD_MED, 9 CLOUD_HIGH, 10 CIRRUS, 11 SNOW/ICE.
 *   Valid ground keeps `{4, 5, 6, 7, 11}`; snow fraction is SCL 11 over valid non-water `{4, 5, 7, 11}`.
 * - NDVI = (B08 - B04) / (B08 + B04) (Rouse et al. 1974); NDSI = (B03 - B11) / (B03 + B11) (Hall et al. 1995).
 */
export const SCL_VALID: ReadonlySet<number> = new Set([4, 5, 6, 7, 11])
export const L2A_SCALE = 1 / 10_000
export const PB04_OFFSET = -1000 * L2A_SCALE
const PB04_START_DATE = '2022-01-25'

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

/**
 * Resolves `rho = DN * scale + offset` for the actual COG pixel representation.
 * Returns `null` when metadata is contradictory or ambiguous so callers skip unreliable items.
 */
export function bandScalingOf(props: StacItemProps, band?: StacBandMeta): BandScaling | null {
  const nodata = typeof band?.nodata === 'number' ? band.nodata : 0
  const scale = typeof band?.scale === 'number' && band.scale > 0 ? band.scale : L2A_SCALE
  const boaApplied = props['earthsearch:boa_offset_applied']
  const baseline = Number.parseFloat(String(props['s2:processing_baseline'] ?? ''))
  const hasBaseline = Number.isFinite(baseline)
  const isPb04 = hasBaseline && baseline >= 4

  // Earth Search harmonized COGs already have the -1000 DN offset applied in pixel values.
  if (boaApplied === true) return { scale, offset: 0, nodata }

  if (boaApplied === false) {
    if (typeof band?.offset === 'number') {
      return isPb04 && band.offset === 0 ? null : { scale, offset: band.offset, nodata }
    }
    if (typeof props['s2:boa_add_offset'] === 'number') {
      return { scale, offset: props['s2:boa_add_offset'] * scale, nodata }
    }
    if (hasBaseline) return { scale, offset: isPb04 ? PB04_OFFSET : 0, nodata }
    const day = props.datetime?.slice(0, 10)
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
    return { scale, offset: day >= PB04_START_DATE ? PB04_OFFSET : 0, nodata }
  }

  // Non-Earth-Search / unspecified `boa_offset_applied`:
  if (hasBaseline && !isPb04) {
    return typeof band?.offset === 'number' && band.offset !== 0 ? null : { scale, offset: 0, nodata }
  }
  if (typeof band?.offset === 'number') return { scale, offset: band.offset, nodata }
  if (typeof props['s2:boa_add_offset'] === 'number') return { scale, offset: props['s2:boa_add_offset'] * scale, nodata }
  if (isPb04) return { scale, offset: PB04_OFFSET, nodata }
  const day = props.datetime?.slice(0, 10)
  return day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day < PB04_START_DATE ? { scale, offset: 0, nodata } : null
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

export { aggregatePatch, type GridBuffers, type GridTransform, type PatchBands } from './s2Aggregate'
