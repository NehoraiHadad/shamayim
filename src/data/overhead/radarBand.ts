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
