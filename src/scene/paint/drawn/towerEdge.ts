import type { CloudSprite } from '../../model/cloudSprite'
import { rng } from '../shared/base/core'
import { css, type Ctx2D } from '../shared/base/hand'
import type { CloudInks } from './cloudInks'
import { whitened } from './cloudLight'
import { carve, type P } from './kit/carve'
import type { Frame } from './kit/contour'
import type { TowerMass } from './towerMass'

/* A printed tower's edge on its own sheet: the level cuts of its foot, its silver rim and key line, and the foot let go into the air and the rain. */

/** The key line (px, half of it under the body) and its strength; the silver rim of a tower before the sun. */
const LINE = 1.1, STRONG = 0.5, SILVER = { least: 0.05, wide: 2.2, alpha: 0.6 } as const
/** The width of a tower whose foot is cut; a cut (px), its strength, how high the cuts climb (of the height). */
const CUT_FROM = 40, CUT = 0.6, CUT_STRONG = 0.32, CLIMB = 0.22
/** The steps of the foot's fade. */
const STEPS = 16

/** A few level cuts in the foot. */
export function footCuts(c: Ctx2D, s: CloudSprite, mass: TowerMass, t: CloudInks): void {
  if (s.w < CUT_FROM) return
  const r = rng(s.seed + 3), many = Math.min(8, 2 + Math.round(s.w / 40))
  c.beginPath()
  for (let n = 0; n < many; n++) {
    const y = mass.depth * 0.6 - CLIMB * s.tall * (n / many) ** 1.3, long = s.w * (0.12 + 0.24 * r()), x = (r() - 0.5) * (s.w - long) - long / 2
    carve(c, [0, 0.25, 0.5, 0.75, 1].map((u): P => [x + u * long, y + Math.sin(u * 3 + n) * 0.5]), CUT, s.seed + n, 0.9)
  }
  c.fillStyle = css(t.key, CUT_STRONG * t.line)
  c.fill()
}

/** The silver rim inside the mass's own edge, under its caps. */
export function silverTower(c: Ctx2D, path: Path2D, s: CloudSprite): void {
  if (s.silver > SILVER.least) {
    c.strokeStyle = css(whitened(s.lit), SILVER.alpha * s.silver)
    c.lineWidth = SILVER.wide
    c.stroke(path)
  }
}

/** The key line outside the caps and the mass. */
export function keyTower(c: Ctx2D, path: Path2D, t: CloudInks, line: number): void {
  c.strokeStyle = css(t.key, STRONG * line)
  c.lineWidth = LINE
  c.globalCompositeOperation = 'destination-over'
  c.stroke(path)
}

/** What the air and the rain take of the foot. */
export function fadeFoot(c: Ctx2D, f: Frame, mass: TowerMass): void {
  const gone = c.createLinearGradient(0, f.y, 0, f.y + f.h)
  for (let n = 0; n <= STEPS; n++) gone.addColorStop(n / STEPS, css([0, 0, 0], 1 - mass.footAt(f.y + (n / STEPS) * f.h)))
  c.globalCompositeOperation = 'destination-out'
  c.fillStyle = gone
  c.fillRect(f.x, f.y, f.w, f.h)
}
