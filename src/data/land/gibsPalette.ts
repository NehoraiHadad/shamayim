/**
 * Published NASA GIBS `MODIS_NDVI.xml` 143-entry RGB palette (`ref 0..142`).
 * Provenance: `https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_NDVI.xml` (verified 143/143
 * unique RGB entries against live `MODIS_Terra_NDVI_8Day` PNG tiles on 2026-11-20).
 *
 * Matching tile `PLTE` entries by exact `(R, G, B)` color ensures a reordered palette still maps
 * to the true scientific bin while an alien/corrupted colormap is rejected instead of emitting
 * bogus NDVI tagged `gibs:<date>`.
 */

const MODIS_NDVI_PALETTE_B64 =
  'ABpp4eHh4eHi8ezs8ezt7+fn7+fo7OLi7OLj4tjY4tjZ4dnU4dnV4NrS4NrT3dXL3dXM5dvN5dvO4dLF4dLG387B387C3cm83cm9'
  + '18Sz18S00cCr0cCszbqezbqfyLWlyLWmwLCWwLCXuaubuauctKWVtKWWsJ+OsJ+PsJuJsJuKsZiDsZiEsJV9sJV+sJJ4sJJ5rI1z'
  + 'rI10qYluqYlvpYRopYRpoYBjoYBknXxenXxfmm5Zmm5allpGllpHv953v954sM9osM9pp8xLp8xMpMY9pMY+oMAwoMAxlroglroh'
  + 'j7cVj7cWh7MKh7MLgLAFgLAGeK0AeK0BbqoAbqoBZKYAZKYBXaMAXaMBVqEAVqEBUpgAUpgBU5cAU5cBTpQATpQBSJAASJABQ40A'
  + 'Q40BPooAPooBOYcAOYcBM4MAM4MBLoAALoABKX0AKX0BIXgAIXgBHXUAHXUBGXMAGXMBEm4AEm4BCmkACmkBCGcACGcBBWQABWQB'
  + 'AGQAAGQBAGAAAGABAFoAAFoBAFQAAFQBAEgAAEgBADwAADwBADYAADYBACQAACQBABgAABgB'

/** Maps a `MODIS_Terra_NDVI_8Day` colormap ref index (0..142) to bin midpoint NDVI, or NaN for nodata. */
export function modisNdviRefToValue(ref: number): number {
  if (ref === 1) return -0.15
  if (ref === 2) return -0.05
  if (ref >= 3 && ref <= 62) return 0.0001 + (ref - 3 + 0.5) * 0.005
  if (ref >= 63 && ref <= 102) return 0.3001 + (ref - 63 + 0.5) * 0.0075
  if (ref >= 103 && ref <= 142) return 0.6001 + (ref - 103 + 0.5) * 0.01
  return Number.NaN
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** 143×3 published RGB bytes for refs `0..142`. */
export const MODIS_NDVI_RGB = decodeBase64(MODIS_NDVI_PALETTE_B64)

const RGB_TO_REF = new Map<number, number>()
for (let ref = 0; ref < MODIS_NDVI_RGB.length / 3; ref++) {
  const o = ref * 3
  RGB_TO_REF.set((MODIS_NDVI_RGB[o] << 16) | (MODIS_NDVI_RGB[o + 1] << 8) | MODIS_NDVI_RGB[o + 2], ref)
}

/** Sentinel marking an opaque palette entry whose RGB is not in the published `MODIS_NDVI.xml` table. */
export const UNKNOWN_COLOR = -99

/**
 * Builds a per-palette-index NDVI lookup table by matching each `PLTE` RGB triplet against
 * `MODIS_NDVI.xml`. Transparent entries (`tRNS[i] === 0`) decode as nodata (`NaN`) except refs
 * 1 and 2 (negative NDVI, rendered transparent on map overlays); opaque unrecognized entries are
 * marked `UNKNOWN_COLOR` so referenced alien pixels reject the tile.
 */
export function buildModisNdviLut(plte: Uint8Array, trns: Uint8Array): Float32Array {
  const len = Math.floor(plte.length / 3)
  const lut = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const o = i * 3
    const ref = RGB_TO_REF.get((plte[o] << 16) | (plte[o + 1] << 8) | plte[o + 2])
    const transparent = i < trns.length && trns[i] === 0
    if (transparent) {
      lut[i] = ref === 1 || ref === 2 ? modisNdviRefToValue(ref) : Number.NaN
    } else if (ref === undefined) {
      lut[i] = UNKNOWN_COLOR
    } else {
      lut[i] = modisNdviRefToValue(ref)
    }
  }
  return lut
}
