import { formatTemp } from './format'

/** Start an isolate whose content reads left to right. */
export const LRI = '\u2066'

/** Start an isolate whose content reads right to left. */
export const RLI = '\u2067'

/** End the isolate so surrounding text keeps its direction. */
export const PDI = '\u2069'

/** Keep left-to-right text together in a mixed-direction sentence. */
export const ltr = (s: string): string => LRI + s + PDI

/** Keep right-to-left text together even in a left-to-right container. */
export const rtl = (s: string): string => RLI + s + PDI

/** Keep the sign, digits and degree mark in the same left-to-right run. */
export const tempText = (n: number): string => ltr(formatTemp(n))

/** Keep the signed number together and place the Hebrew unit to its left. */
export const heightText = (m: number): string => rtl(ltr(formatTemp(m, false)) + '\u00A0מ׳')

/** Keep each clock readable while letting RTL place the earlier time on the right. */
export const clockRange = (a: string, b: string): string => ltr(a) + '–' + ltr(b)

const NUMBER_TOKEN = new RegExp(`[${LRI}${RLI}${PDI}]|(?:(?<!\\d)[−-])?\\d+(?::\\d\\d)?[°%]?`, 'g')

/** Isolate bare clocks, counts, temperatures and percentages with `ltr`, preserving existing isolates. */
export function isolateText(s: string): string {
  let depth = 0
  return s.replace(NUMBER_TOKEN, (token) => {
    if (token === LRI || token === RLI) { depth++; return token }
    if (token === PDI) { depth = Math.max(0, depth - 1); return token }
    return depth === 0 ? ltr(token.replace(/^-/, '−')) : token
  })
}
