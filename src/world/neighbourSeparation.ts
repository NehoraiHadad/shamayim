/** CSS-pixel separation from home roofs, with at most two gaps of bearing correction. */
export const HOME_GAP_PX = 6
export const MAX_NEIGHBOUR_SLIDE_PX = 2 * HOME_GAP_PX

/** One CSS pixel on either side keeps a glyph attached to its own town fabric. */
export const TOWN_SIDE_PX = 1

/** A far-town foot can snap by one raster row, measured in CSS pixels. */
export const FAR_TOWN_FOOT_TRAVEL_PX = .5

export interface RoofSpan { left: number; right: number }

export const homeGap = (left: number, right: number, home: RoofSpan) =>
  Math.max(home.left - right, left - home.right)

/** The home constraint in screen pixels, shared with the model's exact placement search. */
export function homeSeparation(x: number, w: number, home: RoofSpan) {
  return { direction: Math.sign(x - (home.left + home.right) / 2),
    left: home.left - HOME_GAP_PX - w / 2, right: home.right + HOME_GAP_PX + w / 2 }
}

/** Feasible centres moving only towards the source side of the home. */
export function separatedCentres(x: number, w: number, home: RoofSpan | null) {
  const lo = x - MAX_NEIGHBOUR_SLIDE_PX, hi = x + MAX_NEIGHBOUR_SLIDE_PX
  if (!home) return [[lo, hi] as const]
  const separation = homeSeparation(x, w, home)
  const { direction } = separation
  const left = Math.min(direction < 0 ? x : hi, separation.left)
  const right = Math.max(direction > 0 ? x : lo, separation.right)
  return [
    ...(direction <= 0 && lo <= left ? [[lo, left] as const] : []),
    ...(direction >= 0 && right <= hi ? [[right, hi] as const] : []),
  ]
}
