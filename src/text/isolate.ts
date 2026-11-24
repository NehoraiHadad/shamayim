import { formatTemp } from './format'

/** Start an isolate whose content reads left to right. */
export const LRI = '\u2066'

/** Start an isolate whose content reads right to left. */
export const RLI = '\u2067'

/** End the isolate so surrounding text keeps its direction. */
export const PDI = '\u2069'

/** Keep left-to-right text together in a mixed-direction sentence. */
export const ltr = (s: string): string => LRI + s + PDI

/** Keep the sign, digits and degree mark in the same left-to-right run. */
export const tempText = (n: number): string => ltr(formatTemp(n))

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
