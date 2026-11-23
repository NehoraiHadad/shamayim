import type { WorldState } from '../../world/types'
import { smoothstep } from '../../world/ridgeLighting'
import { againstLight } from './drawnTones'
import { drawnAerialFor as aerialFor, drawnHazeOf as hazeOf } from './drawnHaze'
import { skyAt } from './sky'
import { lightness, mixRgb, scaleLight } from './tone'
import type { SceneBox, Tones, RGB } from './types'

/** How much sky light reaches the drawn town, its brighter side, and the colour at each tier. */
export interface SkyForm { strength: number; side: number; tiers: { top: RGB; face: RGB; foot: RGB }[] }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * A wall's sky light (C9 defect 1): what a plaster or stone face gives back of the sky it sees, its albedo times the
 * share of that sky it faces (a Lambert wall's luminance: albedo × view factor × the sky's), in linear light. A wall is
 * never as light as the sky it faces.
 */
const WALL_ALBEDO = 0.45
const VIEW = { top: 0.62, face: 0.55 }

/**
 * The light the place's mass takes from the sky (C5b item 4), under any cloud: a roof sees the whole sky, a wall
 * half of
 * it and the foot of a wall among others less (the mass shades itself), and the face turned toward the sun's part of
 * the
 * sky sees its brighter half. Strongest as the direct light fades (overcast: the form is the sky's), none by night.
 * C9: by albedo, not by mixing toward the sky's own tone (a wall gives back less than half the sky it sees); and the
 * walls the eye sees face the sky behind the eye, so against the light (`againstLight`: a low sun beyond the land) they
 * see its dim half and the mass reads as a dark silhouette, its tops and rims alone catching the bright sky beyond.
 */
export function skyFormOf(world: WorldState, box: SceneBox, kms: number[], tiers: Tones[], sx: number): SkyForm {
  const { light, night } = world
  const day = 1 - night.dark
  const strength = day * (0.35 + 0.65 * (1 - clamp01(light.direct)))
  const sun = world.bodies.sun
  const across = (sun.x * sx - box.width / 2) / (box.width / 2)
  // The brighter half of an overcast sky is the sun's: its side on the screen while it is up, by how far to that
  // side it
  // stands (the living light: it eases in as the sun leaves the middle and as it rises, never a step).
  const side = -Math.sign(across) * smoothstep(0.02, 0.3, Math.abs(across)) * smoothstep(-8, 0, sun.altitude)
  const sky = skyAt(world, box)
  const aerial = aerialFor(world, hazeOf(world))
  const against = againstLight(world)
  // The sky the walls face: the view's own, but against the light the dim half behind the eye.
  const mean = scaleLight(mixRgb(sky(35), sky(8), 0.4), 1 - 0.55 * against)
  const lighter = (wall: RGB, c: RGB) => (lightness(c) > lightness(wall) ? c : wall)
  return { strength, side, tiers: kms.map((km, i) => {
    const t = tiers[i]
    const lit = aerial(scaleLight(mean, WALL_ALBEDO * VIEW.top), km)
    // The brighter half of the sky round the sun takes the sun's own colour through the cloud.
    const bright = aerial(scaleLight(mixRgb(mean, light.colour, 0.35 * day),
      WALL_ALBEDO * VIEW.face * (1 + 0.6 * (1 - against))), km)
    return { top: lighter(t.wall, mixRgb(t.wall, lit, 0.62)), face: lighter(t.wall, mixRgb(t.wall, bright, 0.38)),
      foot: mixRgb(t.wall, t.deep, 0.7) }
  }) }
}
