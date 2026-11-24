import type { FieldCell } from '../../world/field/types'
import { smoothstep } from '../../world/ridgeLighting'
import { HAZE_KM } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { cloudHazeFade, inDust } from './cloudDust'
import { litOf, tonesAt, type CloudLight } from './cloudLight'
import type { CloudSprite, SpriteGenus } from './cloudSprite'
import { sunlitTone } from './cloudSunlit'
import { mixRgb } from './tone'
import { beforeSheet, type Beyond } from './towerStorms'
import type { RGB, SceneBox } from './types'

type TowerGenus = Extract<SpriteGenus, 'cu' | 'cg' | 'cb'>
const GENUS: Partial<Record<FieldCell['genus'], TowerGenus>> = { cu: 'cu', cg: 'cg', cb: 'cb' }
/** A tower's flat base by day, in the shadow of the column above it: the deeper the column, the darker (a Cb's tau runs
 *  to hundreds); darker still where it rains. Its sunlit body is fair-weather white whatever the cover round it. */
const BASE: Record<TowerGenus, RGB> = { cu: [0.52, 0.56, 0.62], cg: [0.38, 0.42, 0.47], cb: [0.25, 0.28, 0.32] }
const RAIN_BASE: RGB = [0.2, 0.23, 0.27]
/** The length of the line of sight (by ground range, km) that runs through the haze to a point `heightKm` up. */
export const hazePath = (rangeKm: number, heightKm: number) => rangeKm * Math.min(1, HAZE_KM / Math.max(0.01, heightKm))

/** How far a low sun takes a tower's body to its own colour. */
const GLOWING = 0.6

export function towerSpriteOf(world: WorldState, box: SceneBox, stops: [number, RGB][], beyond: Beyond | null, cell: FieldCell, light: CloudLight | null,
  x: number, y: number, w: number, under: number, tall: number): CloudSprite {
  const rains = cell.rainWeight > 0.3
  const genus = GENUS[cell.genus] ?? 'cg'
  // A tower stands in its own gap of the sky (union 0): its body is lit as a fair-weather cloud's.
  const range = Math.hypot(cell.x, cell.y)
  const tones = beforeSheet(tonesAt(world, box, stops, 'low', y - tall / 2, 0, 0, hazePath(range, cell.baseKm + cell.vKm / 2)), beyond, x, y - tall / 2)
  const lit = litOf(light, x, y - tall / 2, w, tall + under, 1, cell.seed)
  const day = smoothstep(-8, 3, world.bodies.sun.altitude)
  const base = mixRgb(mixRgb(BASE[genus], RAIN_BASE, rains ? cell.rainWeight : 0), tones.behind,
    0.85 * cloudHazeFade(world, hazePath(range, cell.baseKm)))
  const shade = inDust(world, mixRgb(tones.shade, base, day), cell.baseKm)
  const diffuse = inDust(world, tones.body, cell.baseKm)
  const twilight = light ? mixRgb(light.rgb, tones.behind, tones.fade) : tones.body
  const beam = light?.sun ? sunlitTone(world, cell.baseKm + cell.vKm / 2, 1 - tones.fade, diffuse, twilight) : twilight
  // A low sun lights a whole tower's height from the side, as it does the sheet's underside round it.
  const glow = light ? light.under * light.strength * lit.through : 0
  return {
    genus, seed: cell.seed, w, under, tall, lean: 0, tau: cell.tau0,
    body: mixRgb(mixRgb(diffuse, beam, GLOWING * glow), shade, 0.5 * lit.backlit), shade, lit: beam, litA: lit.litA, toward: lit.toward,
    silver: Math.max(lit.silver, 0.9 * lit.front), glow,
    rains, share: cell.share,
  }
}
