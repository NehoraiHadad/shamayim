/** Stable ids → seeds and a seeded generator (mulberry32), so a place draws the same on every load. */
export function seeded(seed: number) {
  let state = seed >>> 0 || 1
  return () => {
    state = (state + STEP) >>> 0
    return drawOf(state)
  }
}

/** A seed's first draw (`seeded(seed)()`) alone. */
export const firstDraw = (seed: number) => drawOf(((seed >>> 0 || 1) + STEP) >>> 0)

const STEP = 0x6D2B79F5
function drawOf(state: number) {
  let t = Math.imul(state ^ (state >>> 15), state | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function hashId(id: string) { return [...id].reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) }
