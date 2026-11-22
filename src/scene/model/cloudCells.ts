import { projectCell } from '../../world/field/project'
import type { FieldCell } from '../../world/field/types'
import type { WorldState } from '../../world/types'
import type { CloudSprite, SpriteGenus } from '../paint/cloudSprite'
import { smoothstep } from '../../world/ridgeLighting'
import { acrossSpeed, pxPerRadAt } from './advect'
import { litOf, tonesAt, type CloudLight } from './cloudLight'
import { sheetZ } from './cloudSheet'
import { layerKey, skyBoxKey } from './keys'
import type { SkyGeom } from './sky'
import { mixRgb } from './tone'
import type { LayerOf, RGB, SceneBox } from './types'

/*
 * The field's towers (SPEC §6: cumulus congestus and cumulonimbus, the cells a sheet cannot show standing) as sprites, each
 * where its cell stands in true perspective: its near base edge on the dome at that edge's altitude, its underside down to
 * the far edge's, its top up to the top's, as wide as its disc looks from here. Far to near, so the near ones stand in
 * front. Pure: the field's snapshot, the light and the sky's geometry.
 */

type Snapshot = NonNullable<WorldState['cloudField']>['snapshot'][number]
type Placed = LayerOf<'cloudCells'>['cells'][number]

/** A tower's top below this altitude (deg) is behind the horizon's haze: not drawn. */
const TOP_MIN = 0.4
/** A cell whose near edge stands higher than this (deg) is overhead: its base, not its column, is what shows. */
const NEAR_MAX = 25
/** The tropopause over the Levant in the cool season (km): a Cb whose top reaches it spreads into an anvil. */
const TROPOPAUSE_KM = 11
/** Anvils in view at most: only the most mature cells of a storm line have spread theirs. */
const ANVILS = 2
/** Narrower than this (px) a tower is a speck in the haze. */
const W_MIN = 1.5
/** Quantum of a sprite's numbers in its key (px, tones 1/64): what shows, so a scrub repaints only on a visible step. */
const q = (v: number, step = 0.5) => Math.round(v / step)
const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 64))

export function towerLayerOf(world: WorldState, box: SceneBox, geom: SkyGeom, snapshot: Snapshot,
  light: CloudLight | null, union: number, stops: [number, RGB][]): LayerOf<'cloudCells'> | null {
  const { layer, cells } = snapshot
  if (!layer || layer.lattice !== 'tower' || !cells.length) return null
  const pxPerDeg = world.camera.pxPerDeg * geom.s
  const perRad = pxPerRadAt(geom.azimuthAt, geom.width / 2)
  const stretch = sceneStretch(geom, pxPerDeg)
  const placed: (Placed & { km: number; top: number })[] = []
  for (const cell of cells) {
    const p = projectCell(cell)
    const w = p.widthDeg * pxPerDeg
    if (p.aTop < TOP_MIN || p.aNear > NEAR_MAX || w < W_MIN || cell.share <= 0.01) continue
    const x = geom.x(p.az)
    if (x + w / 2 < 0 || x - w / 2 > geom.width) continue
    const y = geom.dome(Math.max(0, p.aNear))
    const under = Math.max(0, geom.dome(Math.max(0, p.aFar)) - y)
    // The scene's sky is taller than it is wide (`sceneStretch`), and the dome stretches it most near the horizon: a
    // tower stands to its top's altitude, but no taller than its true aspect at the scene's stretch, so a far one is a
    // heap and not a streak, and a near one keeps its height.
    const tall = Math.max(0, Math.min(y - geom.dome(p.aTop), w * stretch * cell.vKm / (2 * cell.r)))
    const look: [number, number] = [cell.x / Math.hypot(cell.x, cell.y), cell.y / Math.hypot(cell.x, cell.y)]
    const sprite = spriteOf(world, box, stops, cell, light, union, x, y, w, under, tall)
    placed.push({ sprite, x, y, km: p.rangeKm, top: cell.baseKm + cell.vKm, speed: acrossSpeed(layer.vel, look, p.rangeKm, perRad) })
  }
  if (!placed.length) return null
  // The anvils: the largest mature Cb in view, spread as far as their tops reach the tropopause.
  const mature = (c: (typeof placed)[number]) => c.sprite.genus === 'cb' ? smoothstep(TROPOPAUSE_KM - 1.5, TROPOPAUSE_KM, c.top) : 0
  placed.filter((c) => mature(c) > 0).sort((a, b) => mature(b) * b.sprite.w - mature(a) * a.sprite.w).slice(0, ANVILS)
    .forEach((c) => { c.sprite.anvil = mature(c) })
  placed.sort((a, b) => b.km - a.km)
  const top = Math.max(0, Math.floor(Math.min(...placed.map((c) => c.y - c.sprite.tall)) - 12))
  const bottom = Math.min(box.skyHeight, Math.ceil(Math.max(...placed.map((c) => c.y + c.sprite.under)) + 8))
  const drawn = placed.map(({ km: _km, top: _top, ...c }) => c)
  return {
    kind: 'cloudCells', id: 'cloudCells.tower', lattice: 'tower', surface: 'sky', z: sheetZ.tower, soft: true, cells: drawn,
    bounds: { x: 0, y: top, w: geom.width, h: Math.max(1, bottom - top) },
    key: layerKey('cloudCells', skyBoxKey(box, true), drawn.map(({ sprite: s, x, y }) => [s.seed, q(x), q(y), q(s.w), q(s.under),
      q(s.tall), tone(s.body), tone(s.shade), tone(s.lit), q(s.litA, 0.05), q(s.silver, 0.05), q(s.glow, 0.05), q(s.share, 0.05), q(s.anvil ?? 0, 0.05)])),
  }
}

/** How much taller than wide the scene draws the sky on average: the dome's px per degree of altitude, horizon to
 *  zenith, against the panorama's px per degree of azimuth. */
export function sceneStretch(geom: SkyGeom, pxPerDeg: number): number {
  return Math.max(1, (geom.dome(0) - geom.dome(90)) / 90 / pxPerDeg)
}

const GENUS: Partial<Record<FieldCell['genus'], SpriteGenus>> = { cu: 'cu', cg: 'cg', cb: 'cb' }

function spriteOf(world: WorldState, box: SceneBox, stops: [number, RGB][], cell: FieldCell, light: CloudLight | null,
  union: number, x: number, y: number, w: number, under: number, tall: number): CloudSprite {
  const rains = cell.rainWeight > 0.3
  const tones = tonesAt(world, box, stops, 'low', y - tall / 2, union, cell.rainWeight, Math.hypot(cell.x, cell.y))
  const lit = litOf(light, x, y - tall / 2, w, tall + under, 1, cell.seed)
  return {
    genus: GENUS[cell.genus] ?? 'cg', seed: cell.seed, w, under, tall, lean: 0, tau: cell.tau0,
    body: mixRgb(tones.body, tones.shade, 0.5 * lit.backlit), shade: tones.shade,
    lit: light ? mixRgb(light.rgb, tones.behind, tones.fade) : tones.body, litA: lit.litA, toward: lit.toward,
    silver: Math.max(lit.silver, 0.9 * lit.front), glow: light ? light.under * light.strength * lit.through : 0,
    rains, share: cell.share,
  }
}
