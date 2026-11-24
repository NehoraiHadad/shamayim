import { projectCell } from '../../world/field/project'
import type { FieldCell } from '../../world/field/types'
import type { WorldState } from '../../world/types'
import type { CloudSprite, SpriteGenus } from './cloudSprite'
import { smoothstep } from '../../world/ridgeLighting'
import { HAZE_KM } from '../../world/sceneLight'
import { acrossSpeed, pxPerRadAt } from './advect'
import { litOf, tonesAt, type CloudLight } from './cloudLight'
import { sunlitTone } from './cloudSunlit'
import { sheetZ } from './cloudSheet'
import { beforeSheet, hideBehind, leanOf, oneStormEach, type Beyond, type Standing } from './towerStorms'
import { layerKey, skyBoxKey } from './keys'
import type { SkyGeom } from './sky'
import { mixRgb } from './tone'
import { towerAnvil } from './towerHeads'
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
 * Beyond this range (km) a tower is no longer seen as a column of its own: the haze between merges it with its
 * neighbours (15–25 km apart, a few px on the screen) into one soft mass along the horizon, at least this wide (px)
 * and no taller than wide.
 */
export const MERGE_KM = 40, MERGE_PX = 28
/** How much of the sky's stretch a tower's own shape takes (an exponent): all of it draws every far heap as a pillar. */
const STAND = 0.55
/** Quantum of a sprite's numbers in its key (px, tones 1/64): what shows, so a scrub repaints only on a visible step. */
const q = (v: number, step = 0.5) => Math.round(v / step)
const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 64))

export function towerLayerOf(world: WorldState, box: SceneBox, geom: SkyGeom, snapshot: Snapshot,
  light: CloudLight | null, stops: [number, RGB][], beyond: Beyond | null = null): LayerOf<'cloudCells'> | null {
  const { layer, cells } = snapshot
  if (!layer || layer.lattice !== 'tower' || !cells.length) return null
  const pxPerDeg = world.camera.pxPerDeg * geom.s
  const perRad = pxPerRadAt(geom.azimuthAt, geom.width / 2)
  const stretch = sceneStretch(geom, pxPerDeg) ** STAND
  const placed: (Placed & Standing & { top: number })[] = []
  for (const cell of cells) {
    const p = projectCell(cell)
    const seen = p.widthDeg * pxPerDeg
    if (p.aTop < TOP_MIN || p.aNear > NEAR_MAX || seen < W_MIN || cell.share <= 0.01) continue
    const merged = p.rangeKm > MERGE_KM
    const w = merged ? Math.max(seen, MERGE_PX) : seen
    const x = geom.x(p.az)
    if (x + w / 2 < 0 || x - w / 2 > geom.width) continue
    // The underside is as deep as its disc is foreshortened at the scale the tower is wide at, not at the dome's: a near
    // base spans a third of the sky's height there, and would hang as a bowl deeper than it is wide. Its sides stand
    // where they truly do, and only the far half past them curves in (`bowl`).
    const side = geom.dome(Math.max(0, p.aSide)), far = geom.dome(Math.max(0, p.aFar))
    const span = Math.max(0, far - geom.dome(Math.max(0, p.aNear)))
    const under = Math.min(span, (p.aNear - p.aFar) * pxPerDeg)
    const bowl = span > 0 ? (under / span) * (far - side) : 0
    const y = side + bowl - under
    // The scene's sky is taller than it is wide (`sceneStretch`), and the dome stretches it most near the horizon: a
    // tower stands to its top's altitude, but no taller than its true aspect at part of the scene's stretch, so a far one
    // is a heap and not a streak, and a near one keeps its height.
    const tall = Math.max(0, Math.min(y - geom.dome(p.aTop), seen * stretch * cell.vKm / (2 * cell.r), merged ? w : Infinity))
    const look: [number, number] = [cell.x / Math.hypot(cell.x, cell.y), cell.y / Math.hypot(cell.x, cell.y)]
    const sprite = spriteOf(world, box, stops, beyond, cell, light, x, y, w, under, tall)
    sprite.bowl = bowl
    const speed = acrossSpeed(layer.vel, look, p.rangeKm, perRad)
    sprite.lean = leanOf(speed, (Math.hypot(...layer.vel) / p.rangeKm / 60) * Math.abs(perRad))
    placed.push({ sprite, x, y, at: [cell.x, cell.y], r: cell.r, km: p.rangeKm, top: cell.baseKm + cell.vKm, speed })
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
  const drawn = placed.map(({ sprite, x, y, speed }) => ({ sprite, x, y, speed }))
  return {
    kind: 'cloudCells', id: 'cloudCells.tower', lattice: 'tower', surface: 'sky', z: sheetZ.tower, soft: true, cells: drawn,
    bounds: { x: 0, y: top, w: geom.width, h: Math.max(1, bottom - top) },
    key: layerKey('cloudCells', skyBoxKey(box, true), drawn.map(({ sprite: s, x, y }) => [s.seed, q(x), q(y), q(s.w), q(s.under), q(s.bowl ?? 0),
      q(s.tall), tone(s.body), tone(s.shade), tone(s.lit), q(s.litA, 0.05), q(s.silver, 0.05), q(s.glow, 0.05), q(s.share, 0.05), q(s.anvil ?? 0, 0.05), q(s.lean, 0.1)])),
  }
}

/** How much taller than wide the scene draws the sky on average: the dome's px per degree of altitude, horizon to
 *  zenith, against the panorama's px per degree of azimuth. */
export function sceneStretch(geom: SkyGeom, pxPerDeg: number): number {
  return Math.max(1, (geom.dome(0) - geom.dome(90)) / 90 / pxPerDeg)
}

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

function spriteOf(world: WorldState, box: SceneBox, stops: [number, RGB][], beyond: Beyond | null, cell: FieldCell, light: CloudLight | null,
  x: number, y: number, w: number, under: number, tall: number): CloudSprite {
  const rains = cell.rainWeight > 0.3
  const genus = GENUS[cell.genus] ?? 'cg'
  // A tower stands in its own gap of the sky (union 0): its body is lit as a fair-weather cloud's.
  const range = Math.hypot(cell.x, cell.y)
  // Dust shortens air.fade's visibility and colours the sky stops it fades toward.
  const tones = beforeSheet(tonesAt(world, box, stops, 'low', y - tall / 2, 0, 0, hazePath(range, cell.baseKm + cell.vKm / 2)), beyond, x, y - tall / 2)
  const lit = litOf(light, x, y - tall / 2, w, tall + under, 1, cell.seed)
  const day = smoothstep(-8, 3, world.bodies.sun.altitude)
  const base = mixRgb(mixRgb(BASE[genus], RAIN_BASE, rains ? cell.rainWeight : 0), tones.behind,
    0.85 * world.air.fade(hazePath(range, cell.baseKm)))
  const shade = mixRgb(tones.shade, base, day)
  const twilight = light ? mixRgb(light.rgb, tones.behind, tones.fade) : tones.body
  const beam = light?.sun ? sunlitTone(world, cell.baseKm + cell.vKm / 2, 1 - tones.fade, tones.body, twilight) : twilight
  // A low sun lights a whole tower's height from the side, as it does the sheet's underside round it.
  const glow = light ? light.under * light.strength * lit.through : 0
  return {
    genus, seed: cell.seed, w, under, tall, lean: 0, tau: cell.tau0,
    body: mixRgb(mixRgb(tones.body, beam, GLOWING * glow), shade, 0.5 * lit.backlit), shade, lit: beam, litA: lit.litA, toward: lit.toward,
    silver: Math.max(lit.silver, 0.9 * lit.front), glow,
    rains, share: cell.share,
  }
}
