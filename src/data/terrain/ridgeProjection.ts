import { SCENE_CAMERA } from '../../domain/camera'
export const NEAR_RADIUS_KM = 12
export const FAR_RADIUS_KM = 30
export const RIDGE_WIDTH = 375

/** x of a point `dx` km east of the place on the old cross-section: east on the scene's own side (`SCENE_CAMERA`). */
export const ridgeX = (dx: number, radius: number, width = RIDGE_WIDTH) => width / 2 - SCENE_CAMERA.handed * width / (2 * radius) * dx

export const ridgeLongitudeKm = (lat: number) => 111.32 * Math.max(0.1, Math.cos(lat * Math.PI / 180))
