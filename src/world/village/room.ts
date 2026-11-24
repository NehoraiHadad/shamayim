/** Up to this wide (km), a settlement is drawn at one scale; it is then given this share of the scene's width. */
const SMALL_KM = .6, SMALL_SHARE = 1 / 3
/** …growing evenly to this share of it at a city's width. */
const CITY_KM = 10, CITY_SHARE = .9
/** The most either side of the place may be given, share of the width (as a city's: `frameOfBox`). */
const SIDE_SHARE = .45

/** The width (px) of a settlement `wideKm` wide, whose farther side is `sideKm` from the place, in a scene this wide. */
export function widthOf(wideKm: number, sideKm: number, sceneW: number): number {
  const grown = Math.max(0, Math.min(1, (wideKm - SMALL_KM) / (CITY_KM - SMALL_KM)))
  const share = wideKm < SMALL_KM ? SMALL_SHARE * wideKm / SMALL_KM : SMALL_SHARE + (CITY_SHARE - SMALL_SHARE) * grown
  return sceneW * Math.min(share, SIDE_SHARE * wideKm / sideKm)
}