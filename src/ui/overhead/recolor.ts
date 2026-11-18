export const RADAR_WASH = [
  [105, 132, 156, 0.48],
  [73, 81, 151, 0.65],
  [107, 43, 101, 0.82],
] as const

/** The Universal Blue ramps cross over at dark blue, yellow and red. Dim, near-neutral tan is a weak return. */
export function radarBand(r: number, g: number, b: number, a: number): 0 | 1 | 2 {
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (r > 45 && g < r * 0.35 && b < r * 0.4) return 2 // orange/red
  if (r > 190 && b > 190 && Math.abs(r - b) < 45 && a > 225) return 2 // pink/white core
  if (g > 220 && r < 30 && b < 30) return 2 // green at the top of the rain scale
  if (r > 200 && g > 65 && b < 75) return 1 // yellow and amber
  if (b > r + 70 && luminance < 94) return r < 25 && b > 220 ? 2 : 1 // dark rain / deep-blue snow
  if (b > 240 && r < 85 && g < 150) return 1 // medium snow
  return 0
}

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
