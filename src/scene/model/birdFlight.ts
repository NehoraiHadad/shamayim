//# allFunctionsCalledOnLoad
import type { BirdDesc, BirdKind, Pt } from './types'

/*
 * How a bird of a flock flies at `t` (s into its strip), in three dimensions, seen from the eye (the painter's half of
 * the sky's life; the flock's own way over the land is the layer's flight track). Its body moves round its place in the
 * flock by its kind's way of flying, and its pose (ahead, span and up) is projected for a flock seen `view` degrees up:
 * a level circle seen from near the horizon is a flat ellipse, a bird flying across is seen side-on (its wings stroke up
 * and down), one flying away or toward the eye shows its whole span. Everything is periodic over the strip (`loop`).
 *
 * Kinds (from field guides and flight studies; the beat rates are in `scene/model/life.ts` `LOOKS`):
 * - stork, raptor: thermalling, every bird of a kettle circling the same way, banked ~25° into the turn, wings held;
 * - pigeon: a wheeling flock turning as one, banked ~35°, swooping up and down through the turn;
 * - swift, bat: hawking, quick figure-eights with a rise and fall, banked hard (to ~45°) where they turn;
 * - gull: drifting on held wings with a lazy sway and roll of ~10°;
 * - crow, crane: flying straight on the flock's way; a crane's V is a V in the air (side-on it reads as a line), each
 *   bird rising a little on its down-stroke.
 */

const TAU = Math.PI * 2
const RAD = Math.PI / 180

export type V3 = [number, number, number]

/** A bird's pose: where it is on the sprite, and its ahead (`f`), right-wing (`w`) and back (`b`) unit axes as seen (px per px). */
export interface BirdPose { x: number; y: number; f: Pt; w: Pt; b: Pt; /** How much of its underside faces the eye (0–1). */ under: number }

/** Its world axes: x across the view (right), y up, z away from the eye. */
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

/** A world vector as seen from an eye looking `view` up (orthographic: a flock is small against its distance); y down. */
export function seen(v: V3, view: number): Pt {
  const e = view * RAD
  return [v[0], -(v[1] * Math.cos(e) - v[2] * Math.sin(e))]
}

/** The figure-eight's lateral acceleration per unit speed at `k` (rx = 1), and its peak: a banked bird's roll follows it. */
const eightTurn = (k: number) => {
  const du = Math.cos(k), ddu = -Math.sin(k), dv = 1.2 * Math.cos(2 * k), ddv = -2.4 * Math.sin(2 * k)
  return (du * ddv - dv * ddu) / Math.hypot(du, dv)
}
const EIGHT_PEAK = Math.max(...Array.from({ length: 720 }, (_, i) => Math.abs(eightTurn((i / 720) * TAU))))

/**
 * Where a bird is round its place (world px) at `t`; how far it is banked (rad; + into a turn from across toward away,
 * the way a kettle with `turn` 1 circles); and, for a bird holding the flock's way, how far its heading swings off it.
 */
export function bodyAt(b: BirdDesc, kind: BirdKind, t: number, loop: number, yaw: number): { p: V3; bank: number; sway?: number } {
  const a = TAU * (t / loop + b.lag) * b.turn
  const c = Math.cos(yaw), s = Math.sin(yaw)
  // Offsets in the flock's own frame (u along its way, v to its right, both level) turned to the world.
  const level = (u: number, v: number, up: number): V3 => [b.x + u * c - v * s, b.y + up, b.z + u * s + v * c]
  switch (kind) {
    case 'stork':
    case 'raptor':
      return { p: level(b.rx * Math.cos(a), b.rx * Math.sin(a), b.ry * Math.sin(a)), bank: 25 * RAD * b.turn }
    case 'pigeon':
      return { p: level(b.rx * Math.cos(a), b.rx * Math.sin(a), b.ry * Math.sin(2 * a)), bank: 35 * RAD * b.turn }
    case 'swift':
    case 'bat': {
      // Two turns a strip: a figure-eight, banked to ~45° where it turns hardest, level through the crossover.
      const k = 2 * a
      return { p: level(b.rx * Math.sin(k), 0.6 * b.rx * Math.sin(2 * k), b.ry * Math.sin(3 * k + b.lag * TAU)),
        bank: 45 * RAD * b.turn * eightTurn(k) / EIGHT_PEAK }
    }
    case 'gull': {
      // Hanging on the wind on the flock's way: a slow side-slip (its heading swings ~15° with the slip's speed),
      // rolled ~10° into each swing.
      const g = a + 1.3
      return { p: level(0.3 * b.rx * Math.sin(a), b.rx * Math.sin(g), b.ry * Math.sin(2 * a)), bank: -10 * RAD * Math.sin(g),
        sway: 15 * RAD * Math.cos(g) * b.turn }
    }
    default:
      return { p: level(0, 0, b.ry * Math.sin(a)), bank: 0 }
  }
}

/** The bird's pose at `t`: its place and axes as seen, its way the motion of its body (or the flock's, flying straight). */
export function poseAt(b: BirdDesc, kind: BirdKind, t: number, loop: number, yaw: number, view: number): BirdPose {
  const { p, bank, sway } = bodyAt(b, kind, t, loop, yaw)
  const dt = loop / 400
  const ahead = bodyAt(b, kind, t + dt, loop, yaw).p, back = bodyAt(b, kind, t - dt, loop, yaw).p
  // Its way: a circling or hawking bird's own motion round its place; one holding the flock's way (crow, crane, a gull
  // swinging off it by `sway`) heads along that.
  const way: V3 = [ahead[0] - back[0], 0, ahead[2] - back[2]]
  const own = Math.hypot(way[0], way[2])
  const held = kind === 'crow' || kind === 'crane' || kind === 'gull' || own < 1e-6
  const f: V3 = held ? [Math.cos(yaw + (sway ?? 0)), 0, Math.sin(yaw + (sway ?? 0))] : norm(way)
  // The span level and square to the way, then rolled by the bank about the way. In these axes (x right, y up, z away:
  // left-handed) f × up is the bird's left wing; a + bank lifts it, dropping the right wing into a turn toward +z.
  const level = norm(cross(f, [0, 1, 0]))
  const up = cross(level, f)
  const w = norm([level[0] * Math.cos(bank) - up[0] * Math.sin(bank), level[1] * Math.cos(bank) - up[1] * Math.sin(bank),
    level[2] * Math.cos(bank) - up[2] * Math.sin(bank)])
  const back3 = norm(cross(w, f))
  // The eye looks along (0, sin e, cos e): the underside faces it as much as the back's axis points away from it.
  const e = view * RAD
  const under = Math.max(0, back3[1] * Math.sin(e) + back3[2] * Math.cos(e))
  const [x, y] = seen(p, view)
  return { x, y, f: seen(f, view), w: seen(w, view), b: seen(back3, view), under }
}

/** A point of a bird in its own frame (`u` ahead, `v` along its right wing, `h` up its back), as seen. */
export const frameOf = (q: BirdPose) => (u: number, v: number, h = 0): Pt =>
  [q.x + u * q.f[0] + v * q.w[0] + h * q.b[0], q.y + u * q.f[1] + v * q.w[1] + h * q.b[1]]
