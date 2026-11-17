/** WCAG contrast helpers for tests. Colours are `#RRGGBB` or [r, g, b] in 0–255. */
export type Rgb = [number, number, number]

export const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb

/** CSS `color-mix(in srgb, a share%, b)`. */
export const mix = (a: Rgb, b: Rgb, share: number): Rgb => a.map((v, i) => v * share + b[i] * (1 - share)) as Rgb

function luminance(color: Rgb): number {
  const [r, g, b] = color.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
