import type { SkylineData } from '../city/skylineData'

/**
 * The place's portrait (docs/design/TRUE-SCENE-PLAN.md): everything within this distance (km) belongs to the
 * illustration round the dot, composed by side, not drawn at its true angle. Beyond it the scene is true.
 */
export const PORTRAIT_KM = 3

/**
 * A village's own houses are its portrait, so the data skyline (built squares at their true angle, made for a city's
 * towers) keeps only what lies beyond it: other towns. Within it, on the vertical stretch, a village's houses read
 * as grey pillars hanging off the ridge.
 */
export function beyondPortrait(skyline: SkylineData): SkylineData {
  return { ...skyline, columns: skyline.columns.map(column => ({ ...column,
    faces: column.faces.map(face => face && face.km < PORTRAIT_KM ? null : face) as typeof column.faces })) }
}

/**
 * A city is its own portrait: its built squares fill the view near it (more than one face a column within the portrait,
 * Tel Aviv, Jerusalem, Haifa), and the data skyline already reads as the city. A village or a town is not.
 */
export function skylineIsCity(skyline: SkylineData): boolean {
  const near = skyline.columns.reduce((sum, column) => sum + column.faces.filter(face => face && face.km < PORTRAIT_KM).length, 0)
  return near >= 1.2 * skyline.columns.length
}
