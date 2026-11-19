import type { Cluster } from '../city/clusterTypes'
import { homeCluster } from '../city/homeCluster'
import type { SkylineData } from '../city/skylineData'

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

export function portraitReach(clusters: readonly Cluster[] | undefined): number {
  const home = clusters?.length ? homeCluster([...clusters]) : null
  if (!home) return DEFAULT_KM
  const farthest = Math.max(...home.dx.flatMap(dx => home.dy.map(dy => Math.hypot(dx, dy))))
  return Math.min(MAX_KM, Math.max(MIN_KM, farthest + PORTRAIT_MARGIN_KM))
}

/** The widest a portrait reaches: what the landmark shortlist keeps in every direction (north too). */
export const PORTRAIT_MAX_KM = MAX_KM

/**
 * A village's own houses are its portrait, so the data skyline (built squares at their true angle, made for a city's
 * towers) keeps only what lies beyond it: other towns. Within it, on the vertical stretch, a village's houses read
 * as grey pillars hanging off the ridge.
 */
export function beyondPortrait(skyline: SkylineData, reachKm: number): SkylineData {
  return { ...skyline, columns: skyline.columns.map(column => ({ ...column,
    faces: column.faces.map(face => face && face.km < reachKm ? null : face) as typeof column.faces })) }
}

/**
 * A city is its own portrait: its built squares fill the view near it (more than one face a column within the portrait,
 * Tel Aviv, Jerusalem, Haifa), and the data skyline already reads as the city. A village or a town is not.
 */
export function skylineIsCity(skyline: SkylineData, reachKm: number): boolean {
  const near = skyline.columns.reduce((sum, column) => sum + column.faces.filter(face => face && face.km < Math.max(reachKm, 3)).length, 0)
  return near >= 1.2 * skyline.columns.length
}
