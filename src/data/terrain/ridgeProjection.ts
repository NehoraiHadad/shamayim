export const NEAR_RADIUS_KM = 12
export const FAR_RADIUS_KM = 30
export const RIDGE_WIDTH = 375

export const ridgeLongitudeKm = (lat: number) => 111.32 * Math.max(0.1, Math.cos(lat * Math.PI / 180))
