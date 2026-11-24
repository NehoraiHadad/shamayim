import { projectCell } from '../../world/field/project'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { acrossSpeed, pxPerRadAt } from './advect'
import { cloudTransmission, dustVeilWeight } from './cloudDust'
import { MIN_TOWER_SHARE } from './cloudSprite'
import type { CloudLight } from './cloudLight'
import { sheetZ } from './cloudSheet'
import { DOME_ALT } from './dome'
import { hideBehind, leanOf, oneStormEach, type Beyond, type Standing } from './towerStorms'
import { layerKey, skyBoxKey } from './keys'
import type { SkyGeom } from './sky'
import { SLENDEREST, towerAnvil } from './towerHeads'
import { towerSpriteOf } from './towerSprite'
import type { LayerOf, RGB, SceneBox } from './types'

/*
 * The field's towers (SPEC §6: cumulus congestus and cumulonimbus, the cells a sheet cannot show standing) as sprites, each
 * where its cell stands in true perspective: its base's sides on the dome at their altitude, its underside as deep as its
 * disc is foreshortened, its top up to the top's, as wide as its disc looks from here. Far to near, so the near ones stand in
 * front. Pure: the field's snapshot, the light and the sky's geometry.
 */

type Snapshot = NonNullable<WorldState['cloudField']>['snapshot'][number]
type Placed = LayerOf<'cloudCells'>['cells'][number]

/** A tower's top below this altitude (deg) is behind the horizon's haze: not drawn. */
const TOP_MIN = 0.4
/** A cell whose near edge stands higher than this (deg) is right overhead: the sheet under it is what shows. */
const NEAR_MAX = 70
/** Anvils in view at most: only the most mature cells of a storm line have spread theirs. */
const ANVILS = 2
/** Narrower than this (px) a tower is a speck in the haze. */
const W_MIN = 1.5
/**
 * Look. Beyond `MERGE_KM` a tower is no longer seen as a column of its own: the haze between merges it with its
 * neighbours (15–25 km apart, a few px on the screen) into one soft mass along the horizon, at least this wide (px)
 * and no taller than wide. It is brought in over the range before it, so a tower drifting out widens as it goes.
 */
const MERGE_FROM_KM = 30
export const MERGE_KM = 40, MERGE_PX = 28
/** How much of the sky's stretch a near tower's own shape takes (an exponent): all of it draws a pillar. */
const STAND = 0.55
/** The altitude (deg) of a top from which the tower leans over the place, nearer than it is high. */
const NEAR_TOP = 45
/** Quantum of a sprite's numbers in its key (px, tones 1/64): what shows, so a scrub repaints only on a visible step. */
const q = (v: number, step = 0.5) => Math.round(v / step)
const legacyTone = (rgb: RGB) => rgb.map((c) => Math.round(c * 64))

export function towerLayerOf(world: WorldState, box: SceneBox, geom: SkyGeom, snapshot: Snapshot,
  light: CloudLight | null, stops: [number, RGB][], beyond: Beyond | null = null): LayerOf<'cloudCells'> | null {
  const { layer, cells } = snapshot
  if (!layer || layer.lattice !== 'tower' || !cells.length) return null
  const pxPerDeg = world.camera.pxPerDeg * geom.s
  const perRad = pxPerRadAt(geom.azimuthAt, geom.width / 2)
  const stretch = sceneStretch(geom, pxPerDeg) ** STAND
  const placed: (Placed & Standing & { top: number; through: number })[] = []
  for (const cell of cells) {
    const p = projectCell(cell)
    const seen = p.widthDeg * pxPerDeg
    if (p.aTop < TOP_MIN || p.aNear > NEAR_MAX || seen < W_MIN || cell.share <= 0.01) continue
    const x = geom.x(p.az)
    // The underside is as deep as its disc is foreshortened at the scale the tower is wide at, not at the dome's: a near
    // base spans a third of the sky's height there, and would hang as a bowl deeper than it is wide. Its sides stand
    // where they truly do, and only the far half past them curves in (`bowl`).
    const side = geom.dome(Math.max(0, p.aSide)), far = geom.dome(Math.max(0, p.aFar))
    const span = Math.max(0, far - geom.dome(Math.max(0, p.aNear)))
    const under = Math.min(span, (p.aNear - p.aFar) * pxPerDeg)
    const bowl = span > 0 ? (under / span) * (far - side) : 0
    const y = side + bowl - under
    // A far tower stands on the relief in its true aspect, whole (`share` grows and wanes its radius alone). The sky over
    // it is drawn taller than wide (`sceneStretch`): as its top climbs the dome it takes part of that stretch.
    const over = smoothstep(DOME_ALT, NEAR_TOP, p.aTop), merged = smoothstep(MERGE_FROM_KM, MERGE_KM, p.rangeKm)
    const shape = cell.vKm / (2 * cell.r) * (Math.sqrt(cell.share) * (1 - over) + stretch * over)
    const least = seen + merged * Math.max(0, MERGE_PX - seen)
    const column = Math.max(0, Math.min(y - geom.dome(p.aTop), seen * shape))
    const tall = column + merged * Math.min(0, least - column)
    const w = Math.max(least, tall / SLENDEREST)
    if (x + w / 2 < 0 || x - w / 2 > geom.width) continue
    const look: [number, number] = [cell.x / Math.hypot(cell.x, cell.y), cell.y / Math.hypot(cell.x, cell.y)]
    const sprite = towerSpriteOf(world, box, stops, beyond, cell, light, x, y, w, under, tall)
    sprite.bowl = bowl
    const speed = acrossSpeed(layer.vel, look, p.rangeKm, perRad)
    sprite.lean = leanOf(speed, (Math.hypot(...layer.vel) / p.rangeKm / 60) * Math.abs(perRad))
    const through = cloudTransmission(world.air, cell.baseKm, world.bodies.sun.altitude)(p.aSide)
    placed.push({ sprite, x, y, at: [cell.x, cell.y], r: cell.r, km: p.rangeKm, top: cell.baseKm + cell.vKm, speed, through })
  }
  if (!placed.length) return null
  oneStormEach(placed)
  hideBehind(placed)
  // The anvils: the largest mature Cb in view, spread as far as their tops reach the tropopause, and only over a
  // column that stands taller than it is wide (a cap on a squat body reads as a disc floating in the sky).
  const mature = ({ sprite, top }: (typeof placed)[number]) => towerAnvil(sprite.genus === 'cb', top, sprite.w, sprite.tall)
  placed.filter((c) => mature(c) > 0).sort((a, b) => mature(b) * b.sprite.w - mature(a) * a.sprite.w).slice(0, ANVILS)
    .forEach((c) => { c.sprite.anvil = mature(c) })
  placed.sort((a, b) => b.km - a.km)
  const top = Math.max(0, Math.floor(Math.min(...placed.map((c) => c.y - c.sprite.tall)) - 12))
  const bottom = Math.min(box.skyHeight, Math.ceil(Math.max(...placed.map((c) => c.y + c.sprite.under)) + 8))
  const bandWeight = dustVeilWeight(world, 0)
  const drawn = placed.map(({ sprite, x, y, speed, through }) => {
    // Occlusion was resolved with undimmed cloud cover. Dust attenuates the remaining sprite.
    if (through < 1) sprite.share *= through
    return { sprite, x, y, speed }
  })
  if (bandWeight && drawn.every(({ sprite }) => sprite.share <= MIN_TOWER_SHARE)) return null
  return {
    kind: 'cloudCells', id: 'cloudCells.tower', lattice: 'tower', surface: 'sky', z: sheetZ.tower, soft: true, cells: drawn,
    bounds: { x: 0, y: top, w: geom.width, h: Math.max(1, bottom - top) },
    key: layerKey('cloudCells', skyBoxKey(box, true), drawn.map(({ sprite: s, x, y }) => [s.seed, q(x), q(y), q(s.w), q(s.under), q(s.bowl ?? 0),
      q(s.tall), legacyTone(s.body), legacyTone(s.shade), legacyTone(s.lit), q(s.litA, 0.05), q(s.silver, 0.05), q(s.glow, 0.05),
      s.share <= MIN_TOWER_SHARE ? 'hidden' : q(s.share, 0.05), q(s.anvil ?? 0, 0.05), q(s.lean, 0.1),
      s.toward ? q(Math.atan2(s.toward[1], s.toward[0]), 0.1) : 9])),
  }
}

/** How much taller than wide the scene draws the sky on average: the dome's px per degree of altitude, horizon to
 *  zenith, against the panorama's px per degree of azimuth. */
export function sceneStretch(geom: SkyGeom, pxPerDeg: number): number {
  return Math.max(1, (geom.dome(0) - geom.dome(90)) / 90 / pxPerDeg)
}
