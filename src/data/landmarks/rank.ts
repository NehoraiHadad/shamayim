import { fameBonus } from './fame'
import type { Candidate, Landmark } from './types'

const WEIGHTS: Record<Landmark['kind'], number> = {
  bridge: 9, cooling: 8, turbine: 8, chimney: 7, lighthouse: 7,
  minaret: 7, highrise: 6, waterTower: 7, church: 5, silo: 5, synagogue: 6,
  castle: 6, mast: 1, palms: 2, orchard: 2, vineyard: 2, solar: 2, homes: 1, custom: 6,
}

export type { Candidate } from './types'

/** Kind, height, nearness to the section line and to the place, a name, and fame (`fame.ts`). */
export function score(mark: Landmark, dx: number, dy: number, band: number): number {
  return WEIGHTS[mark.kind] + Math.min(mark.heightM, 200) / 20
    - 4 * Math.abs(dy) / band - Math.abs(dx) / 6 + (mark.nameHe ? 1 : 0) + fameBonus(mark)
}

/**
 * How the far ridge's marks are chosen: `kind`, the SVG scene's (60 m and up, or any chimney, cooling tower or turbine;
 * the overhead map's and the old pools'); `landmark`, the canvas scene's (CANVAS-SCENE-PLAN.md C5): the caller has kept only landmarks beyond
 * the place (`industrial.ts` `landmarkBeyond`), and the best two of them by score stand, no kind kept by its weight.
 */
export type FarRule = 'kind' | 'landmark'

/** Maximum near-layer landmarks kept for a figure of `width` px: 5 at the 375 px phone width, +1 per extra 150 px up to 8. */
export const nearLimit = (width: number) => Math.min(8, 5 + Math.max(0, Math.floor((width - 375) / 150)))
/** Score penalty per already-chosen OSM mark of the same kind, so a crowded skyline keeps kind variety. */
export const KIND_REPEAT_PENALTY = 3

export function select(candidates: Candidate[], width: number, large = false, farRule: FarRule = 'kind'): Candidate[] {
  const limit = nearLimit(width)
  const far = candidates.filter((c) => c.layer === 'far' && (farRule === 'landmark' ||
    c.mark.heightM >= 60 || ['chimney', 'cooling', 'turbine'].includes(c.mark.kind)
  )).sort(desc).slice(0, 2)
  const nearCandidates = candidates.filter((c) => c.layer === 'near')
  const reserved = large ? nearCandidates.filter((c) => c.mark.kind === 'highrise' && Math.hypot(c.dx, c.dy) <= 3)
    .sort((a, b) => b.mark.heightM - a.mark.heightM).slice(0, 2) : []
  const picked = pick(nearCandidates, limit, reserved, large ? 6 : 4)
  const near = picked.filter((candidate) => candidate.reserved || !picked.some((other) => other.reserved
    && Math.abs(other.x - candidate.x) < (other.width + candidate.width) / 2 + 6))
  const plain: Candidate[] = []
  for (const candidate of candidates.filter(c => c.layer === 'plain').sort(desc)) {
    if (plain.length >= 2) break
    if (plain.every(other => Math.abs(other.x - candidate.x) >= (other.width + candidate.width) / 2 + 2)) plain.push(candidate)
  }
  return [...far, ...plain, ...near]
}

const CAPS: Partial<Record<Landmark['kind'], number>> = { minaret: 2, mast: 1, orchard: 2, vineyard: 2, solar: 1 }

/** Best first, but OSM kinds are capped and each repeat of a kind costs 3 points, so the frame shows variety. */
function pick(candidates: Candidate[], limit: number, reserved: Candidate[] = [], highriseCap = 4): Candidate[] {
  const reservedSet = new Set(reserved)
  const pool = candidates.filter((candidate) => !reservedSet.has(candidate))
  const chosen: Candidate[] = reserved.map((candidate) => ({ ...candidate, reserved: true }))
  const counts = new Map<Landmark['kind'], number>()
  reserved.forEach((candidate) => counts.set(candidate.mark.kind, (counts.get(candidate.mark.kind) ?? 0) + 1))
  const value = (c: Candidate) => c.score - (c.mark.source === 'osm' ? KIND_REPEAT_PENALTY * (counts.get(c.mark.kind) ?? 0) : 0)
  let competitive = 0
  while (competitive < limit && pool.length) {
    pool.sort((a, b) => value(b) - value(a))
    const next = pool.shift()!
    const count = counts.get(next.mark.kind) ?? 0
    const cap = next.mark.source === 'osm' ? next.mark.kind === 'highrise' ? highriseCap : CAPS[next.mark.kind] : undefined
    if (cap != null && count >= cap) continue
    chosen.push(next)
    competitive++
    counts.set(next.mark.kind, count + 1)
  }
  return chosen
}

/** Fields lie on the face at their own depth (sceneLayout.ts): they may share a stretch of ridge with a building. */
const FIELDS = new Set<Landmark['kind']>(['orchard', 'vineyard', 'solar'])

export function spread(candidates: Candidate[], gap: number, blocked?: [number, number], scale = 1): Candidate[] {
  const placed: Candidate[] = []
  const originalX = new Map(candidates.map((candidate) => [candidate.mark, candidate.x]))
  for (const original of [...candidates].sort((a, b) => a.x - b.x)) {
    const item = { ...original }
    const prior = placed.at(-1)
    const curatedPair = prior?.mark.source === 'curated' && item.mark.source === 'curated'
    const overlap = curatedPair ? .3 * Math.min(prior.width, item.width) : 0
    const pairGap = curatedPair ? 0 : gap
    if (prior) item.x = Math.max(item.x, prior.x + (prior.width + item.width) / 2 + pairGap - overlap)
    if (blocked && item.x + item.width / 2 > blocked[0] && item.x - item.width / 2 < blocked[1]) {
      const left = blocked[0] - item.width / 2
      const right = blocked[1] + item.width / 2
      // To the nearer side, unless that runs into the mark already placed on the left.
      const leftFree = !prior || left - item.width / 2 >= prior.x + prior.width / 2 + pairGap - overlap
      // A portrait element never crosses to the other side of the village: its side is the one truth it keeps.
      const centre = (blocked[0] + blocked[1]) / 2
      item.x = item.portrait ? (original.x < centre ? left : right)
        : leftFree && Math.abs(item.x - left) <= Math.abs(right - item.x) ? left : right
      // Two portrait elements pushed to the same side of the village: the better one keeps the spot.
      if (item.portrait && item.x === left && !leftFree && !FIELDS.has(item.mark.kind) && !FIELDS.has(prior.mark.kind)) {
        if (prior.score >= item.score) continue
        placed.pop()
      }
    }
    const maxShift = item.mark.source === 'curated' ? 36 * scale : 24 * scale
    if (Math.abs(item.x - original.x) > maxShift) {
      const curatedCluster: Candidate[] = []
      if (curatedPair) {
        for (let i = placed.length - 1; i >= 0 && placed[i].mark.source === 'curated'; i--) {
          curatedCluster.push(placed[i])
        }
      }
      const sharedCuratedShift = curatedCluster.length > 0
        && curatedCluster.reduce((total, candidate) => (
          total + Math.abs(candidate.x - originalX.get(candidate.mark)!)
        ), Math.abs(item.x - original.x)) <= (curatedCluster.length + 1) * maxShift
      if (prior?.reserved && !item.reserved) continue
      if (item.reserved && prior && !prior.reserved) {
        placed.pop()
        placed.push(item)
        continue
      }
      if (sharedCuratedShift) placed.push(item)
      else if (prior && prior.score < item.score) placed.pop()
      else continue
      if (sharedCuratedShift) continue
    }
    placed.push(item)
  }
  return placed
}

export function avoid(candidate: Candidate, blocked: [number, number], scale = 1): Candidate | null {
  const half = candidate.width / 2
  if (candidate.x + half <= blocked[0] || candidate.x - half >= blocked[1]) return candidate
  const left = blocked[0] - half
  const right = blocked[1] + half
  const x = Math.abs(candidate.x - left) <= Math.abs(right - candidate.x) ? left : right
  const maxShift = candidate.mark.source === 'curated' ? 36 * scale : 24 * scale
  return Math.abs(x - candidate.x) <= maxShift ? { ...candidate, x } : null
}

function desc(a: Candidate, b: Candidate) { return b.score - a.score }
