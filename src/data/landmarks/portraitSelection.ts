import { isLandmark } from './fame'
import type { Candidate } from './types'

/** How many famous landmarks a portrait shows: its few best known, not all of them (a city has dozens). */
export const PORTRAIT_LANDMARKS = 4

/** Which of two marks a crowded spot keeps: a hand-drawn icon first, then the better score. */
export const byPriority = (a: Candidate, b: Candidate) =>
  Number(b.mark.source === 'curated') - Number(a.mark.source === 'curated') || b.score - a.score

/** The portrait's landmarks beyond its few are left out (`byPriority`), once placing has dropped what did not fit. */
export function fewLandmarks(candidates: Candidate[], few = PORTRAIT_LANDMARKS): Candidate[] {
  const ranked = candidates.filter((item) => item.portrait && isLandmark(item.mark)).sort(byPriority)
  const dropped = new Set(ranked.slice(few))
  return candidates.filter((item) => !dropped.has(item))
}

