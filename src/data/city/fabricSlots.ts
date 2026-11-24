import { shownBlocks } from './fabricCover'
import type { OutsideBox } from './outsideView'

/** A built cell on the screen. */
export interface FabricSite {
  /** The box the place's sites are laid out by: its cell's own width, or the legible house's where that is wider. */
  box: OutsideBox
  /** The legible house's width where the cell is narrower than it: one such house stands in a slot of that size. */
  slotW: number
  /** What stands there: its true roof, on the frontage its own height needs. */
  body: OutsideBox
}

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
    const { x, top, foot } = site.box
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
 * The standing sites' bodies, without the blocks drawn wider than their sites that nearer ones hide but for a sliver
 * (`shownBlocks`): the houses as they stand, so a low-rise place keeps its layout, then the blocks in an order of their own.
 */
export function composeBodies(sites: readonly FabricSite[], houseTopM: number): OutsideBox[] {
  const houses: OutsideBox[] = [], blocks: FabricSite[] = []
  for (const site of sites) {
    if ((site.body.heightM ?? 0) >= houseTopM) blocks.push(site)
    else houses.push(site.body)
  }
  return [...houses, ...shownBlocks(blocks)]
}
