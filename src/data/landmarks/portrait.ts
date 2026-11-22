import type { Cluster } from '../city/clusterTypes'
import { clusterReach, homeCluster } from '../city/homeCluster'

/**
 * The place's portrait (docs/design/TRUE-SCENE-PLAN.md): what lies within its reach belongs to the illustration round
 * the dot, composed by side, not drawn at its true angle. Beyond it the scene is true.
 *
 * The reach comes from the data: the place's own built-up area (its home cluster in the built-up map: the squares
 * joined to it, ~118 × 232 m each) out to its farthest corner, and its fields and groves around it (`PORTRAIT_MARGIN_KM`).
 * Without that data, a small village's reach (`DEFAULT_KM`).
 */
export const PORTRAIT_MARGIN_KM = 1
const DEFAULT_KM = 1.5
const MIN_KM = 1
const MAX_KM = 5

export function portraitReach(clusters: readonly Cluster[] | undefined, name?: string): number {
  const home = homeCluster(clusters ?? [], name)
  if (!home) return DEFAULT_KM
  return Math.min(MAX_KM, Math.max(MIN_KM, clusterReach(home) + PORTRAIT_MARGIN_KM))
}

/** The widest a portrait reaches: what the landmark shortlist keeps in every direction (north too). */
export const PORTRAIT_MAX_KM = MAX_KM
