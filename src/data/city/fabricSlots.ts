import { shownBlocks } from './fabricCover'
import type { FabricCell, OutsideBox } from './outsideView'

/** Where a site stands: what the slots and the mass ask of it. */
export type SiteBox = Pick<OutsideBox, 'x' | 'w' | 'top' | 'foot' | 'near'>

/** A built cell on the screen: where its body stands (its true roof, on the frontage its own height needs), and its site. */
export interface FabricSite extends SiteBox {
  heightM: number
  /** The box the place's sites are laid out by: its cell's own width, or the legible house's where that is wider. */
  siteW: number
  siteTop: number
  /** The legible house's width where the cell is narrower than it: one such house stands in a slot of that size. */
  slotW: number
  cell: FabricCell
}

/** A site as it is laid out. */
export const siteBox = (site: FabricSite): SiteBox => site.siteW === site.w && site.siteTop === site.top ? site
  : { x: site.x, w: site.siteW, top: site.siteTop, foot: site.foot, near: site.near }

/** The body that stands on a site. */
export const siteBody = ({ x, w, top, foot, near, heightM, cell }: FabricSite, kind: OutsideBox['kind']): OutsideBox =>
  ({ x, w, top, foot, near, kind, heightM, seed: cell.seed, dx: cell.dx, dy: cell.dy })

/**
 * The sites that stand: a house cell narrower on screen than the smallest legible house is not shrunk; the houses are
 * composed fewer and larger inside the footprint, one per slot of that size on the screen (the cell nearest the slot's
 * middle keeps it, at its own spot). Every other cell stands.
 */
export function standingSites(sites: readonly FabricSite[]): FabricSite[] {
  const standing: FabricSite[] = []
  const slots = new Map<number, { site: FabricSite; off: number }>()
  for (const site of sites) {
    if (!site.slotW) { standing.push(site); continue }
    const { x, siteTop: top, foot } = site
    const slotW = site.slotW * 1.1, slotH = Math.max(1.2, .6 * (foot - top))
    const sx = Math.round(x / slotW), sy = Math.round(foot / slotH)
    const off = Math.hypot((x - sx * slotW) / slotW, (foot - sy * slotH) / slotH)
    const key = sx * 1e6 + sy
    const held = slots.get(key)
    if (held && held.off <= off) continue
    slots.set(key, { off, site })
  }
  for (const { site } of slots.values()) standing.push(site)
  return standing
}

/**
 * The standing sites whose bodies are drawn, without the blocks drawn wider than their sites that nearer ones hide but for
 * a sliver (`shownBlocks`): the houses as they stand, so a low-rise place keeps its layout, then the blocks in their own order.
 */
export function composeBodies(sites: readonly FabricSite[], houseTopM: number): FabricSite[] {
  const houses: FabricSite[] = [], blocks: FabricSite[] = []
  for (const site of sites) (site.heightM >= houseTopM ? blocks : houses).push(site)
  return blocks.length ? [...houses, ...shownBlocks(blocks)] : houses
}
