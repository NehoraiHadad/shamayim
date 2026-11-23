import type { BirdKind } from '../../../world/life'
import type { Pt, RGB } from '../../../world/types'
import type { ContrailMotion } from '../contrailMotion'
import type { LayerBase } from './base'
import type { Star } from './sky'

/*
 * Sky life and optics (C10). Everything here comes from the world's `life`, `nightSky` and `optics`.
 */

/** A bird of a flock round its middle (world px: x across, y up, z away), its own flight's radius and rise, its way round, phase, span, wing phase. */
export interface BirdDesc { x: number; y: number; z: number; rx: number; ry: number; turn: 1 | -1; lag: number; size: number; beat: number }
/** A planet as drawn (sky px): a steady point (`r`), its colour, how plainly it shows, a faint glow round the brightest. */
export interface PlanetDot { name: string; x: number; y: number; r: number; rgb: RGB; alpha: number; glow: number }
/** A sun dog (sky px): where it stands, its size, strength, and which side of the sun it is on (−1 left, +1 right). */
export interface SunDog { x: number; y: number; r: number; alpha: number; side: -1 | 1 }

export type SkyLifeLayers =
  /**
   * C10: a flock (or a lone bird) in the sky, painted round its middle and laid where it is (`placed`), a strip of frames
   * (`animated.frames`: its wing beats and its own wheeling, periodic over the strip's `loop` s) and a slow sway round its
   * place (`animated.flight`, a closed loop); `flap` beats a second, `soar` 0–1 the
   * share of time the wings are held (storks, raptors), the flock's tones (`rgb` its dark, `lit` the sunlit underside).
   */
  | LayerBase & { kind: 'birds'; bird: BirdKind; birds: BirdDesc[]; loop: number; flap: number; soar: number; rgb: RGB; lit: RGB;
      litA: number
      /** The flock's way in the eye's frame (rad from across-right toward away) and how far up it is seen (deg). */
      yaw: number; view: number; seed: number }
  /**
   * C10: an aircraft (sky px): a small plane at (`x`, `y`) heading `angle` (rad on screen), `size` its span, its body's tones,
   * its lights by night (`lights` 0–1: the landing light, the strobe and the beacon, a strip of frames), the short trail
   * behind it (`trail`: px, 0 for none).
   */
  | LayerBase & { kind: 'aircraft'; x: number; y: number; angle: number; size: number; rgb: RGB; lit: RGB; lights: number; landing: boolean
      trail: number; trailRgb: RGB; seed: number }
  /** C10: a contrail's dated emissions, composed as a ribbon with age-dependent width and opacity. */
  | LayerBase & { kind: 'contrail'; trail: ContrailMotion; rgb: RGB; shade: RGB }
  /** C10: a meteor's streak from `x0`, `y0` to its end, laid with its pulse (`animated.pulse`, the meteor look). */
  | LayerBase & { kind: 'meteor'; x0: number; y0: number; x1: number; y1: number; width: number; rgb: RGB }
  /** C10: the planets, steady points (they do not twinkle). */
  | LayerBase & { kind: 'planets'; planets: PlanetDot[] }
  /** C10: a star that twinkles (a strip of frames: its light flickering, seeded, periodic over the strip). */
  | LayerBase & { kind: 'twinkle'; star: Star; amp: number; seed: number; loop: number }
  /**
   * C10: the Milky Way's band (sky px): its spine and edges at its true place, and along it its brightness, the dark rift,
   * the bright star clouds (Sagittarius, Scutum, Cygnus), its colour and strength.
   */
  | LayerBase & { kind: 'milkyWay'; spine: Pt[]; upper: Pt[]; lower: Pt[]; bright: number[]; rift: number[]; clouds: number[]; rgb: RGB
      alpha: number; seed: number }
  /**
   * C10: a rainbow round the antisolar point or a 22° halo round the sun, each a true circle in the sky's tangent frame at
   * its centre (`cx`, `cy`; `k` px per degree), hidden under the land by `clip` (the sky's outline down to the land). The
   * rainbow's strength round its circle is `mask` (alphas at equal screen angles from +x, clockwise on screen); the halo
   * has its sun dogs.
   */
  | LayerBase & { kind: 'bow'; look: 'rainbow' | 'halo'; cx: number; cy: number; k: number; strength: number; secondary: number; mask: number[]
      dogs: SunDog[]; clip: Pt[] }
