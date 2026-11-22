import type { ReactNode } from 'react'
import { LRI, PDI, RLI } from '../text/isolate'

const TOKEN = new RegExp(`[${LRI}${RLI}${PDI}]|(?:(?<!\\d)[−-])?\\d+(?::\\d\\d)?°?`, 'g')

/** Wrap bare clocks and numbers while preserving existing text isolates. */
export function isolateNumbers(s: string) {
  let depth = 0
  let end = 0
  const parts: ReactNode[] = []
  for (const { 0: token, index } of s.matchAll(TOKEN)) {
    if (token === LRI || token === RLI) depth++
    else if (token === PDI) depth = Math.max(0, depth - 1)
    else if (depth === 0) {
      parts.push(s.slice(end, index), <bdi key={index}>{token.replace(/^-/, '−')}</bdi>)
      end = index + token.length
    }
  }
  return [...parts, s.slice(end)]
}
