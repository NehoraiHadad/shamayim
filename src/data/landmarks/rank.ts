import type { Landmark } from './types'

const WEIGHTS: Record<Landmark['kind'], number> = {
  bridge: 9, cooling: 8, turbine: 8, chimney: 7, lighthouse: 7,
  minaret: 7, highrise: 6, waterTower: 7, church: 5, silo: 5, synagogue: 6,
  castle: 6, mast: 1, palms: 2, orchard: 2, vineyard: 2, solar: 2, homes: 1, custom: 6,
}

export interface Candidate {
  mark: Landmark
  dx: number
  dy: number
  x: number
  layer: 'near' | 'far'
  width: number
  score: number
}

export function score(mark: Landmark, dx: number, dy: number, band: number): number {
  return WEIGHTS[mark.kind] + Math.min(mark.heightM, 200) / 20
    - 4 * Math.abs(dy) / band - Math.abs(dx) / 6 + (mark.nameHe ? 1 : 0)
    + (mark.glyph === 'tel-aviv-azrieli' ? 1 : 0)
}

export function select(candidates: Candidate[], width: number): Candidate[] {
  const nearLimit = Math.min(8, 5 + Math.max(0, Math.floor((width - 375) / 150)))
  const far = candidates.filter((c) => c.layer === 'far' && (
    c.mark.heightM >= 60 || ['chimney', 'cooling', 'turbine'].includes(c.mark.kind)
  )).sort(desc).slice(0, 2)
  const near = pick(candidates.filter((c) => c.layer === 'near'), nearLimit)
  return [...far, ...near]
}

const CAPS: Partial<Record<Landmark['kind'], number>> = { minaret: 2, mast: 1, orchard: 2, vineyard: 2, solar: 1, highrise: 4 }

/** Best first, but OSM kinds are capped and each repeat of a kind costs 3 points, so the frame shows variety. */
function pick(candidates: Candidate[], limit: number): Candidate[] {
  const pool = [...candidates]
  const chosen: Candidate[] = []
  const counts = new Map<Landmark['kind'], number>()
  const value = (c: Candidate) => c.score - (c.mark.source === 'osm' ? 3 * (counts.get(c.mark.kind) ?? 0) : 0)
  while (chosen.length < limit && pool.length) {
    pool.sort((a, b) => value(b) - value(a))
    const next = pool.shift()!
    const count = counts.get(next.mark.kind) ?? 0
    const cap = next.mark.source === 'osm' ? CAPS[next.mark.kind] : undefined
    if (cap != null && count >= cap) continue
    chosen.push(next)
    counts.set(next.mark.kind, count + 1)
  }
  return chosen
}

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
      item.x = blocked[1] + item.width / 2
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
