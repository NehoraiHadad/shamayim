import type { Fame, Landmark, MarkKind } from './types'

/**
 * Fame, from OpenStreetMap's own links (docs/design/TRUE-SCENE-PLAN.md, step b): an object that has a Wikipedia
 * article (`wikipedia`, or a `wikipedia:<lang>` key) is famous (2); one that only has a Wikidata item is known (1);
 * one with neither is anonymous. Nothing is picked by hand: the rule ranks a famous water tower, church or chimney
 * above an anonymous one of its kind, and it is drawn with its kind's generic glyph.
 */
export function fameOf(tags: Record<string, string>): Fame | undefined {
  if (Object.keys(tags).some((key) => key === 'wikipedia' || key.startsWith('wikipedia:'))) return 2
  return tags.wikidata ? 1 : undefined
}

/** What fame adds to a mark's score (`rank.ts`): enough to beat an anonymous mark of the same kind and height. */
export const FAME_BONUS: Record<Fame, number> = { 1: 2, 2: 3 }

export const fameBonus = (mark: Pick<Landmark, 'fame'>) => mark.fame ? FAME_BONUS[mark.fame] : 0

/** Fields, groves and masts are no landmark of a place, famous or not. */
const NOT_LANDMARKS = new Set<MarkKind>(['palms', 'orchard', 'vineyard', 'solar', 'mast', 'homes'])

/**
 * Famous or hand-drawn, and a building or structure: a landmark of its place, not just a building in it. Within the
 * place's portrait it stands among its roofs (`markProjection.ts`, `placeMarks.ts`).
 */
export const isLandmark = (mark: Pick<Landmark, 'fame' | 'source' | 'kind'>) =>
  (mark.source === 'curated' || Boolean(mark.fame)) && !NOT_LANDMARKS.has(mark.kind)

/** Which of two duplicates (same kind, side by side) to keep: the more famous, then the taller. */
export function outranks(a: Pick<Landmark, 'fame' | 'heightM'>, b: Pick<Landmark, 'fame' | 'heightM'>) {
  const fa = a.fame ?? 0, fb = b.fame ?? 0
  return fa !== fb ? fa > fb : a.heightM > b.heightM
}
