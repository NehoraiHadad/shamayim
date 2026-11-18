export function skyHeight(m: number): number {
  return Math.min(34, Math.max(4, 2.2 * Math.sqrt(m)))
}
