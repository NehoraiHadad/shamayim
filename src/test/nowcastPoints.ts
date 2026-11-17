import type { NowcastPoint } from '../domain/types'

/** Twelve end-of-interval samples; values can cross midnight. */
export function nowcastPoints(firstEnd: string, precipitation: (i: number) => number): NowcastPoint[] {
  const start = Date.parse(`${firstEnd}Z`)
  return Array.from({ length: 12 }, (_, i) => ({
    time: new Date(start + i * 900_000).toISOString().slice(0, 16), precipitation: precipitation(i),
  }))
}
