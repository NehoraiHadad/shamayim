import type { WorldMark } from '../../world/markGeometry'
import { markBoxAt } from '../../world/markGeometry'
import type { OutsideItem } from './types'

/** Six CSS px separate fixed-size glyph silhouettes at every width. Houses stretch horizontally with the scene;
 * this is a drawn-box gap, not a constant house count (the measured 1280 px house comparison is in REPORT.md). */
export const HOME_GAP_PX = 6
/** One whole CSS pixel of painted town on each side keeps even a thin spire attached to its own fabric. */
export const TOWN_SIDE_PX = 1
/** At most two grouping gaps (12 CSS px): a deliberate bounded departure from the source's true bearing. */
export const MAX_NEIGHBOUR_SLIDE_PX = 12
/** Below the 1e-6 px geometry assertion tolerance: resolves floating-point contact at an exact boundary. */
const CONTACT_EPS_PX = 1e-7

export interface HomeRoofline { left: number; right: number; hazeKm: number }
export interface NeighbourBlock { id?: string; x: number; w: number; top: number; foot: number; hazeKm: number }

/** Only roofs surviving the scene's final text cull define the home group and its most hazed row. */
export function homeRoofline(items: readonly OutsideItem[], kms: readonly number[]): HomeRoofline | null {
  const roofs = items.flatMap(item => item.kind === 'box' && !item.beyond
    ? [{ left: item.x - item.w / 2, right: item.x + item.w / 2, hazeKm: kms[item.tier] }]
    : item.kind === 'tower' ? [{ left: item.x - item.w / 2, right: item.x + item.w / 2, hazeKm: kms[item.tier] }] : [])
  return roofs.length ? { left: Math.min(...roofs.map(r => r.left)), right: Math.max(...roofs.map(r => r.right)),
    hazeKm: Math.max(...roofs.map(r => r.hazeKm)) } : null
}

export const homeGap = (left: number, right: number, home: HomeRoofline) =>
  Math.max(home.left - right, left - home.right)

/** Keep the source raster square as proof of ownership; never slide onto an unrelated town's screen overlap. */
export function placeNeighbour<T extends WorldMark>(mark: T, trueX: number, block: NeighbourBlock | null | undefined,
  home: HomeRoofline | null, visible: (bounds: ReturnType<typeof markBoxAt>) => boolean,
  boundaries: () => readonly number[] = () => []) {
  if (block === undefined) return null
  if (block && (block.w < mark.w + 2 * TOWN_SIDE_PX || block.top >= mark.base || block.foot < mark.base)) return null
  const side = block ? TOWN_SIDE_PX : 0
  const direction = home ? Math.sign(trueX - (home.left + home.right) / 2) : 0
  const half = mark.w / 2
  const edges = [trueX, trueX - MAX_NEIGHBOUR_SLIDE_PX, trueX + MAX_NEIGHBOUR_SLIDE_PX,
    ...(block ? [block.x - block.w / 2 + half + side, block.x + block.w / 2 - half - side] : []),
    ...(home ? [home.left - HOME_GAP_PX - half, home.right + HOME_GAP_PX + half] : []), ...boundaries()]
  // All constraints are intervals. Their endpoints and the true x contain the exact nearest feasible position.
  const candidates = [...new Set(edges.flatMap(x => [x, x - CONTACT_EPS_PX, x + CONTACT_EPS_PX]))]
    .filter(x => Math.abs(x - trueX) <= MAX_NEIGHBOUR_SLIDE_PX && (!direction || (x - trueX) * direction >= 0))
    .sort((a, b) => Math.abs(a - trueX) - Math.abs(b - trueX))
  for (const x of candidates) {
    const bounds = markBoxAt(mark, x)
    if (home && homeGap(bounds.left, bounds.right, home) < HOME_GAP_PX) continue
    if (block && (bounds.left - side < block.x - block.w / 2 || bounds.right + side > block.x + block.w / 2)) continue
    if (visible({ ...bounds, left: bounds.left - side, right: bounds.right + side })) return { mark, x, bounds }
  }
  return null
}
