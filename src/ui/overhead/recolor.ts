import { radarBand } from '../../data/overhead/radarBand'

export const RADAR_WASH = [
  [105, 132, 156, 0.48],
  [73, 81, 151, 0.65],
  [107, 43, 101, 0.82],
] as const

/**
 * Paints in place. The callback runs for each visible echo, in pixel order, so the map can report
 * absence of echoes in its viewport without sampling the WebGL canvas.
 */
export function recolorRadar(pixels: Uint8ClampedArray, echo: (pixel: number) => void): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]
    if (!a) continue
    const [r, g, b, opacity] = RADAR_WASH[radarBand(pixels[i], pixels[i + 1], pixels[i + 2], a)]
    pixels[i] = r
    pixels[i + 1] = g
    pixels[i + 2] = b
    pixels[i + 3] = a * opacity
    if (pixels[i + 3]) echo(i / 4)
  }
}

export function recolorClouds(pixels: Uint8ClampedArray, shadow = false): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const cloud = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) >= 245
    pixels[i] = shadow ? 27 : 252
    pixels[i + 1] = shadow ? 38 : 251
    pixels[i + 2] = shadow ? 55 : 246
    pixels[i + 3] = cloud ? pixels[i + 3] : 0
  }
}
