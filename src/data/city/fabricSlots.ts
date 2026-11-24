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
  const slots = new Map<string, { site: FabricSite; off: number }>()
  for (const site of sites) {
    if (!site.slotW) { standing.push(site); continue }
    const { x, top, foot } = site.box
    const slotW = site.slotW * 1.1, slotH = Math.max(1.2, .6 * (foot - top))
    const sx = Math.round(x / slotW), sy = Math.round(foot / slotH)
    const off = Math.hypot((x - sx * slotW) / slotW, (foot - sy * slotH) / slotH)
    const key = `${sx}:${sy}`
    const held = slots.get(key)
    if (held && held.off <= off) continue
    slots.set(key, { off, site })
  }
  for (const { site } of slots.values()) standing.push(site)
  return standing
}

/** Whether `body` covers `other`: within one row, and so near its middle that only a strip of `other` would show. */
const covers = (body: OutsideBox, other: OutsideBox, pitch: number) =>
  Math.abs(body.x - other.x) < body.w / 4 && Math.abs(body.foot - other.foot) < pitch

/**
 * The standing sites' bodies, where a block drawn wider than its site takes the ground it covers: a widened block that a
 * nearer one (or one at its own width) covers within one row (`pitch` px of ground) is left out. Houses keep their
 * sites (the painter's order hides what stands behind a block), so a low-rise place keeps its layout.
 */
export function composeBodies(sites: readonly FabricSite[], pitch: number, houseTopM: number): OutsideBox[] {
  const columns = new Map<number, OutsideBox[]>()
  const span = (box: OutsideBox) => [Math.floor((box.x - box.w / 2) / pitch), Math.floor((box.x + box.w / 2) / pitch)]
  const lay = (box: OutsideBox) => {
    const [from, to] = span(box)
    for (let c = from; c <= to; c++) {
      const column = columns.get(c)
      if (column) column.push(box)
      else columns.set(c, [box])
    }
  }
  const taken = (box: OutsideBox) => columns.get(Math.floor(box.x / pitch))?.some(other => covers(other, box, pitch))
  const blocks = sites.filter(({ body }) => (body.heightM ?? 0) >= houseTopM)
  const widened = blocks.filter(({ box, body }) => body.w > box.w).sort((a, b) => b.body.near - a.body.near)
  for (const { box, body } of blocks) if (body.w <= box.w) lay(body)
  const covered = new Set<OutsideBox>()
  for (const { body } of widened) {
    if (taken(body)) covered.add(body)
    else lay(body)
  }
  return sites.flatMap(({ body }) => covered.has(body) ? [] : [body])
}
