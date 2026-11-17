/** WCAG contrast helpers, shared by the theme test and the QA report (docs/design/qa/contrast-report.ts). */

function channels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** sRGB mix, as a CSS gradient blends: `share` of `b` into `a`. */
export function mix(a: string, b: string, share: number): string {
  const [ca, cb] = [channels(a), channels(b)]
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * share).toString(16).padStart(2, '0')).join('')}`
}

/** Hex custom properties declared in a CSS block whose selector matches, e.g. `:root` or `.dark-sheet`. */
export function cssTokens(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) return {}
  const block = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]))
}
