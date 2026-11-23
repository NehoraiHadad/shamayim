import type { OutsideBox } from './outsideView'
import { houseRowPitch } from './fabricFrontage'

export interface FabricCandidate {
  box: OutsideBox
  /** The box has been widened beyond its mapped footprint. */
  expanded: boolean
  house?: boolean
}

type Contact = { box: OutsideBox; pitch: number }

const overlap = (a: Contact, b: Contact) =>
  Math.abs(a.box.x - b.box.x) < (a.box.w + b.box.w) / 2 &&
  Math.abs(a.box.foot - b.box.foot) < (a.pitch + b.pitch) / 2

/** Bucket ground contacts on one grid. Roofs on distinct rows may overlap in perspective. */
export function composeFabric(candidates: FabricCandidate[], slot: number): OutsideBox[] {
  const rows = new Map<number, Map<number, Contact[]>>()
  const kept: OutsideBox[] = []
  // Preserve mapped footprints first. For enlarged bodies the nearer site owns the overlap.
  candidates.sort((a, b) => Number(a.expanded) - Number(b.expanded) || b.box.near - a.box.near)
  for (const { box, expanded, house } of candidates) {
    // Built cells supply the sites and covered frontage. Short roofs need less vertical
    // separation to read as separate rows, even when the house has a legibility minimum.
    const pitch = house ? Math.min(slot, houseRowPitch(box.foot - box.top)) : slot
    const contact = { box, pitch }
    const left = Math.floor((box.x - box.w / 2) / slot), right = Math.ceil((box.x + box.w / 2) / slot)
    const top = Math.floor((box.foot - pitch / 2) / slot), bottom = Math.ceil((box.foot + pitch / 2) / slot)
    const buckets: Contact[][] = []
    for (let y = top; y < bottom; y++) {
      let row = rows.get(y)
      if (!row) rows.set(y, row = new Map())
      for (let x = left; x < right; x++) {
        let bucket = row.get(x)
        if (!bucket) row.set(x, bucket = [])
        buckets.push(bucket)
      }
    }
    if (expanded && buckets.some(bucket => bucket.some(other => overlap(contact, other)))) continue
    for (const bucket of buckets) bucket.push(contact)
    kept.push(box)
  }
  return kept
}

interface Span { top: number; foot: number }

/** Union of covered vertical spans in one column. Ground gaps are still open to farther rows. */
function cover(spans: Span[], box: OutsideBox) {
  let i = 0
  while (i < spans.length && spans[i].foot < box.top) i++
  if (spans[i]?.top <= box.top && spans[i].foot >= box.foot) return false
  let top = box.top, foot = box.foot, end = i
  while (end < spans.length && spans[end].top <= foot) {
    top = Math.min(top, spans[end].top)
    foot = Math.max(foot, spans[end].foot)
    end++
  }
  spans.splice(i, end - i, { top, foot })
  return true
}

/** Cull only where foreground bodies cover the exact silhouette, including subpixel gaps. */
export function visibleFabric(boxes: OutsideBox[], width: number): OutsideBox[] {
  const spans = boxes.map(box => ({ box, left: Math.max(0, box.x - box.w / 2),
    right: Math.min(Math.ceil(width) + 8, box.x + box.w / 2) })).filter(span => span.left < span.right)
  const edges = [...new Set(spans.flatMap(({ left, right }) => [left, right]))].sort((a, b) => a - b)
  const edge = new Map(edges.map((x, i) => [x, i]))
  const columns = Array.from({ length: edges.length - 1 }, (): Span[] => [])
  const visible: OutsideBox[] = []
  // The outside layer paints by ground contact, breaking ties by perspective depth.
  for (const { box, left, right } of spans.sort((a, b) =>
    (b.box.foot - .001 * b.box.near) - (a.box.foot - .001 * a.box.near))) {
    const start = edge.get(left)!, end = edge.get(right)!
    let shows = false
    for (let i = start; i < end; i++) {
      if (cover(columns[i], box)) shows = true
    }
    if (shows) visible.push(box)
  }
  return visible
}
