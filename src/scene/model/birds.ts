//# allFunctionsCalledOnLoad
import { seeded } from '../../data/landmarks/hash'
import { lateral, toward } from '../../domain/camera'
import type { BirdKind, Flock } from '../../world/life'
import type { WorldState } from '../../world/types'
import { seen } from './birdFlight'
import { craneV } from './craneV'
import { layerKey, skyBoxKey } from './keys'
import { placedInDepth, q, tone } from './life'
import { birdPoses, flightInView, LIFE_START, poseTrack, RAD, trackBaseAlpha } from './lifeTracks'
import { skyAt, skyGeom, type SkyGeom } from './sky'
import { mixRgb } from './tone'
import type { BirdDesc, LayerOf, LifeClock, RGB, SceneBox } from './types'

/* Birds: a flock's birds in the air round its middle, each flying its kind's way (`birdFlight.ts`) on a strip. */

interface KindLook {
  /** Strip: frames a second and how many (the loop, s: one thermal circle, one wheel, two figure-eights); wing beats a second; share of the time on held wings. */
  fps: number
  count: number
  flap: number
  soar: number
  /** Wingspan (px at the reference width). */
  span: number
  /** Each bird's own flight round its place (px): its turn's radius, how far it rises and falls. */
  loop: [number, number]
  /** The flock in the air (px): across its level disc, and the spread of its heights. */
  spread: [number, number]
}

// Field figures: storks and eagles circle a thermal in ~12–20 s, wings held; a pigeon flock wheels in a few seconds;
// swifts hawk in quick eights; gulls hang on the wind; crows row and cranes beat slowly in a V.
const LOOKS: Record<BirdKind, KindLook> = {
  stork: { fps: 4, count: 48, flap: 0, soar: 1, span: 8, loop: [9, 1.5], spread: [26, 20] },
  crane: { fps: 12, count: 12, flap: 2, soar: 0.2, span: 4.4, loop: [0, 0.5], spread: [0, 0] },
  swift: { fps: 15, count: 30, flap: 7.5, soar: 0.45, span: 4.5, loop: [9, 3], spread: [22, 12] },
  gull: { fps: 12, count: 48, flap: 2.5, soar: 0.5, span: 7, loop: [3, 2], spread: [26, 6] },
  raptor: { fps: 4, count: 48, flap: 0, soar: 1, span: 10, loop: [9, 1.5], spread: [16, 8] },
  crow: { fps: 12, count: 12, flap: 3, soar: 0, span: 6, loop: [0, 0.6], spread: [16, 4] },
  pigeon: { fps: 12, count: 48, flap: 5, soar: 0.15, span: 4.2, loop: [8, 3], spread: [16, 5] },
  bat: { fps: 12, count: 24, flap: 5, soar: 0, span: 4, loop: [8, 3], spread: [24, 10] },
}

/**
 * The flock's way in the eye's frame (rad from straight across to the right, toward +away), against the eye's own line
 * to the flock: in a 250° view a flock off to the side is seen along its own bearing, not the camera's heading.
 */
function yawOf(flock: Flock, world: WorldState) {
  const sight = { ...world.camera, heading: flock.azimuth }
  return Math.atan2(toward(flock.headingDeg, sight), lateral(flock.headingDeg, sight))
}

/** The birds of a flock round its middle (world px; x across, y up, z away): a kettle, a V, a loose party, a wheeling flock. */
function flockBirds(flock: Flock, look: KindLook, k: number, yaw: number): BirdDesc[] {
  const r = seeded(flock.seed)
  if (flock.kind === 'crane') return craneV(flock.count, look.span, k, yaw, look.loop[1], r)
  const out: BirdDesc[] = []
  for (let i = 0; i < flock.count; i++) {
    const size = look.span * k * (0.85 + 0.3 * r())
    // On a level disc round the middle, more of them near it, at their own heights; a kettle circles one way.
    const a = r() * 2 * Math.PI, d = Math.sqrt(r())
    const sameWay = flock.kind === 'stork' || flock.kind === 'raptor' || flock.kind === 'pigeon'
    out.push({ x: Math.cos(a) * d * look.spread[0] * k, y: (r() - 0.5) * look.spread[1] * k, z: Math.sin(a) * d * look.spread[0] * k,
      rx: look.loop[0] * k * (0.6 + 0.4 * r()), ry: look.loop[1] * k * (0.6 + 0.4 * r()), turn: sameWay ? 1 : r() < 0.5 ? 1 : -1,
      lag: flock.kind === 'pigeon' ? 0.06 * r() : r(), size, beat: r() })
  }
  return out
}

/** The furthest a bird's body goes from its place across the level (px), by how its kind flies its loop (`bodyAt`). */
function levelReach(kind: BirdKind, rx: number) {
  if (kind === 'swift' || kind === 'bat') return Math.hypot(1, 0.6) * rx
  if (kind === 'gull') return Math.hypot(0.3, 1) * rx
  return kind === 'crow' || kind === 'crane' ? 0 : rx
}

/**
 * The strip's extent (px): the envelope of its birds' bodies over the whole loop seen from `view` degrees up, and their
 * span round them. Across, a body keeps within its level reach; up, within its rise and fall plus that reach
 * foreshortened by the view (a bound: against a 400-sample sweep of the fixtures it never falls short and is at most 3 px looser).
 */
function boundsOf(birds: BirdDesc[], kind: BirdKind, view: number) {
  const e = view * RAD, ce = Math.cos(e), se = Math.abs(Math.sin(e))
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const b of birds) {
    const h = levelReach(kind, b.rx), [x, y] = seen([b.x, b.y, b.z], view)
    const dx = h + b.size, dy = b.ry * ce + h * se + b.size
    x0 = Math.min(x0, x - dx); x1 = Math.max(x1, x + dx); y0 = Math.min(y0, y - dy); y1 = Math.max(y1, y + dy)
  }
  return { x0, x1, y0, y1 }
}

/**
 * The flocks under way at the shown minute (sky; over the land they are nearer than): each painted once round its own
 * middle at its full size (its closest distance), and laid at composite time where its path has brought it, smaller and
 * fainter by its distance (`placed`, `animated.flight`); its birds' flight and wing beats on a strip.
 */
export function birdLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box), life: LifeClock = LIFE_START): LayerOf<'birds'>[] {
  const sky = skyAt(world, box)
  const out: LayerOf<'birds'>[] = []
  const k = Math.max(0.85, Math.min(1.4, geom.s))
  for (const flock of world.life.birds) {
    const look = LOOKS[flock.kind], loop = look.count / look.fps
    // Its way and how far up it is seen, in the steps its strip is painted in (a turn of ~3°, a degree up).
    const yaw = q(yawOf(flock, world), 0.05) * 0.05, view = Math.round(flock.altitude)
    const birds = flockBirds(flock, look, k, yaw)
    const { x0, x1, y0, y1 } = boundsOf(birds, flock.kind, view)
    const bounds = { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1 - x0) + 2, h: Math.ceil(y1 - y0) + 2 }
    const poses = birdPoses(world, geom, flock), first = poses[0]
    if (!flightInView(poses, bounds, geom.width, Math.max(box.skyHeight, box.landTop + box.landHeight))) continue
    const placed = { ...first, alpha: trackBaseAlpha(first) }
    // Their tones at their closest: dark against the sky, hazed by that distance; the pale parts in the sky's light, lit by the sun.
    const behind = sky(flock.altitude), nearFade = world.air.fade(flock.nearM / 1000)
    const ink: RGB = flock.kind === 'bat' ? [0.08, 0.07, 0.08] : [0.13, 0.13, 0.15]
    const rgb = mixRgb(ink, behind, Math.min(0.75, nearFade + 0.12))
    const direct = world.light.source === 'sun' ? world.light.direct : 0
    const pale = mixRgb(mixRgb([0.95, 0.95, 0.93], world.light.ambient, 0.35), world.light.colour, 0.25 * direct)
    const lit = mixRgb(pale, behind, Math.min(0.75, nearFade))
    const flapHz = look.flap ? Math.max(1, Math.round(look.flap * loop)) / loop : 0
    const id = `birds.${flock.id}`
    const layer: LayerOf<'birds'> = {
      kind: 'birds', id, surface: 'sky', z: 9.5, bird: flock.kind, birds, loop, flap: flapHz,
      soar: look.soar, rgb, lit, litA: direct, yaw, view, seed: flock.seed, bounds, placed,
      animated: { mode: 'frames', frames: { count: look.count, fps: look.fps }, flight: poseTrack(poses, life, geom.azimuthRange) },
      key: layerKey(id, skyBoxKey(box), flock.kind, flock.seed, q(yaw, 0.05), view, bounds.x, bounds.y, bounds.w, bounds.h, tone(rgb), tone(lit), q(direct, 1 / 24)),
    }
    out.push(...placedInDepth(world, box, geom, layer, flock.distanceM / 1000, flock.blockedKm))
  }
  return out
}
