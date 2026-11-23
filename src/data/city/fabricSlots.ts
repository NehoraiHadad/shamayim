import type { OutsideBox } from './outsideView'

interface Candidate {
  box: OutsideBox
  /** The box has been widened beyond its mapped footprint. */
  expanded: boolean
}

const overlap = (a: OutsideBox, b: OutsideBox) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 && a.top < b.foot && b.top < a.foot

/** Bucket ground contacts on one grid. Roofs on distinct rows may overlap in perspective. */
export function composeFabric(candidates: Candidate[], slot: number): OutsideBox[] {
  const rows = new Map<number, Map<number, OutsideBox[]>>()
  const kept: OutsideBox[] = []
  // Preserve mapped footprints first. For enlarged bodies the nearer site owns the overlap.
  candidates.sort((a, b) => Number(a.expanded) - Number(b.expanded) || b.box.near - a.box.near)
  for (const { box, expanded } of candidates) {
    const left = Math.floor((box.x - box.w / 2) / slot), right = Math.ceil((box.x + box.w / 2) / slot)
    // A contact spans one minimum house width in screen space, centred on the foot.
    const top = Math.floor(box.foot / slot - .5), bottom = Math.ceil(box.foot / slot + .5)
    const buckets: OutsideBox[][] = []
    for (let y = top; y < bottom; y++) {
      let row = rows.get(y)
      if (!row) rows.set(y, row = new Map())
      for (let x = left; x < right; x++) {
        let bucket = row.get(x)
        if (!bucket) row.set(x, bucket = [])
        buckets.push(bucket)
      }
    }
    if (expanded && buckets.some(bucket => bucket.some(other => Math.abs(box.foot - other.foot) < slot && overlap(box, other)))) continue
    for (const bucket of buckets) bucket.push(box)
    kept.push(box)
  }
  return kept
}

/** Cull only where nearer roofs cover the exact horizontal interval, including subpixel gaps. */
export function visibleFabric(boxes: OutsideBox[], width: number): OutsideBox[] {
  const spans = boxes.map(box => ({ box, left: Math.max(0, box.x - box.w / 2),
    right: Math.min(Math.ceil(width) + 8, box.x + box.w / 2) })).filter(span => span.left < span.right)
  const edges = [...new Set(spans.flatMap(({ left, right }) => [left, right]))].sort((a, b) => a - b)
  const edge = new Map(edges.map((x, i) => [x, i]))
  const roof = new Float64Array(edges.length).fill(Infinity)
  const visible: OutsideBox[] = []
  for (const { box, left, right } of spans.sort((a, b) => b.box.near - a.box.near)) {
    const start = edge.get(left)!, end = edge.get(right)!
    let shows = false
    for (let i = start; i < end; i++) {
      if (box.top < roof[i]) { roof[i] = box.top; shows = true }
    }
    if (shows) visible.push(box)
  }
  return visible
}
