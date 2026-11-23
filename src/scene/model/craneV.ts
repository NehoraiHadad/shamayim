//# allFunctionsCalledOnLoad
import type { BirdDesc } from './types'

/*
 * A flock of cranes in the air: a V trailing from its leader, every bird in the wingtip wash of the one ahead. Places are
 * in wingspans AS DRAWN, so the spacing grows with the birds when they are enlarged to be legible: cranes never overlap in
 * flight, and drawn closer than their own span they read as one tangle of crosses (a cluster of planes) instead of a V.
 */

/** Across the way, centre to centre: wingtip beside wingtip (spans; the follower's tip rides the leader's outer wash). */
const ACROSS = 1.1
/** Behind the bird ahead (spans; ~3 m for a 2.2 m span): with `ACROSS` an arm ~37° off the way, an open V of ~75°. */
const BEHIND = 1.45

/**
 * The birds round the middle of their V (world px; x across, y up, z away), flying along `yaw`: the two arms unequal, each
 * bird a little off its place from the one ahead of it (the arm wavers as a real one does, and never folds onto itself).
 */
export function craneV(count: number, span: number, k: number, yaw: number, rise: number, r: () => number): BirdDesc[] {
  const S = span * k, c = Math.cos(yaw), s = Math.sin(yaw)
  const longArm = Math.round((count - 1) * (0.5 + 0.2 * r())), side = r() < 0.5 ? 1 : -1
  const arms = [longArm, count - 1 - longArm]
  const at: { back: number; across: number; rank: number }[] = [{ back: 0, across: 0, rank: 0 }]
  arms.forEach((n, i) => {
    let back = 0, across = 0
    for (let rank = 1; rank <= n; rank++) {
      back += BEHIND * S * (0.85 + 0.4 * r())
      across += ACROSS * S * (0.9 + 0.3 * r())
      at.push({ back, across: (i ? -side : side) * across, rank })
    }
  })
  // The flock's track runs through its middle, not its leader.
  const mid = at.reduce((sum, p) => ({ back: sum.back + p.back / count, across: sum.across + p.across / count }), { back: 0, across: 0 })
  return at.map(({ back, across, rank }) => {
    const u = mid.back - back, v = across - mid.across
    return { x: u * c - v * s, y: 0.15 * S * (r() - 0.5), z: u * s + v * c, rx: 0, ry: rise * k, turn: 1, lag: r(),
      size: S * (0.9 + 0.2 * r()), beat: (rank * 0.08) % 1 }
  })
}
