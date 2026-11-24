import { altitudeOf } from '../../world/field/project'
import type { Lattice } from '../../world/field/types'
import type { CloudLevel, FieldRainCell, WorldState } from '../../world/types'
import { acrossSpeed, pxPerRadAt } from './advect'
import { tonesAt, wrap } from './cloudLight'
import { sheetZ } from './cloudSheet'
import { coversOf, skyStops, type SkyGeom } from './sky'
import type { FallingCloud, Precip, RGB, SceneBox } from './types'

/*
 * The clouds rain and snow fall from (C7), projected straight from the world: the field's rain cells (`world.rain.cells`)
 * and the snowing banks (`world.snowfall.cells` naming the precipitating layer's banks), each at its true azimuth on the
 * band, its base on the dome at its altitude, as wide as the cloud it falls from looks. The shafts, the near rain and the
 * flashes stand under them and drift with the field's own carry, as the towers do. Pure: the world and the sky's geometry.
 */

/** The drawn cloud against its angular core: the shower spreads past the core the world's width names. */
const SPREAD: Record<CloudLevel, number> = { low: 1.5, mid: 1.6, high: 2.2 }
/** Height against width as drawn: heaped low cloud, flatter altocumulus, thin cirrus. */
const ASPECT: Record<CloudLevel, number> = { low: 0.4, mid: 0.26, high: 0.1 }
/** A level's place in the stack (the shafts stand just behind it). */
const Z: Record<CloudLevel, number> = { high: 6, mid: 7, low: 8 }
/** Strength of a falling cloud by level (a mid deck's rain shows through thinner cloud). */
const LEVEL_ALPHA: Record<CloudLevel, number> = { low: 1, mid: 0.85, high: 0.55 }
/** A rain cell's azimuth span is 0.6 of its core's (the world's `rainBanks` measure). */
const CORE = 0.6

/** A falling cloud before it is drawn: where it is, in degrees and km. */
interface Source { id: string; level: CloudLevel; azimuth: number; wDeg: number; altitude: number; distanceKm: number
  seed: number; share: number }

/** What falls, from which clouds, where it stands in the stack, and how fast the wind carries it across (px/s). */
export interface Falling { cells: FallingCloud[]; z: number; speed: number }

function rainSources(cells: readonly FieldRainCell[]): Source[] {
  return cells.map((cell) => {
    const distanceKm = Math.hypot(cell.cloudX, cell.cloudY)
    // The curtain hangs from the whole underside of its base: its top is the base's near edge, high over a near core.
    const altitude = altitudeOf(cell.baseKm, Math.max(0.3, distanceKm - cell.radiusKm))
    return { id: `${cell.level}:${cell.bank}`, level: cell.level, distanceKm, seed: cell.seed, share: cell.share,
      // Overhead cells rain round the eye; the rest are far curtains (`NEAR_ALT`).
      altitude: cell.atEye ? Math.max(30, altitude) : Math.min(29.999, altitude),
      azimuth: (cell.fromAzimuth + cell.toAzimuth) / 2, wDeg: (cell.toAzimuth - cell.fromAzimuth) / CORE }
  })
}

function snowSources(world: WorldState, level: CloudLevel): Source[] {
  const layer = world.clouds.find((l) => l.rains)
  const ids = new Set(world.snowfall?.cells.map((c) => c.bank) ?? [])
  return (layer?.banks ?? []).filter((b) => ids.has(b.id)).map((b) => ({ id: `${level}:${b.id}`, level, azimuth: b.azimuth,
    wDeg: b.w, altitude: b.altitude, distanceKm: b.distanceKm, seed: b.seed, share: b.share ?? 1 }))
}

/** A falling cloud as drawn: on the band at its azimuth, its base on the dome; low on the dome seen edge on (flatter). */
function drawn(world: WorldState, box: SceneBox, geom: SkyGeom, stops: [number, RGB][], union: number, s: Source): FallingCloud {
  const pxPerDeg = world.camera.pxPerDeg * geom.s
  const up = Math.sin((Math.min(80, s.altitude) * Math.PI) / 180)
  const w = Math.min(0.6 * geom.period, Math.max(14 * geom.s, s.wDeg * pxPerDeg * SPREAD[s.level]))
  const h = Math.max(s.level === 'high' ? 2 : 5, w * ASPECT[s.level] * (0.75 + 0.6 * up))
  const y = geom.dome(s.altitude)
  const tones = tonesAt(world, box, stops, s.level, y - h / 2, union, 1, s.distanceKm)
  // Tones in 1/64 steps: the soft wash shows no finer, and a scrub repaints less often.
  const snap = (rgb: RGB): RGB => [Math.round(rgb[0] * 64) / 64, Math.round(rgb[1] * 64) / 64, Math.round(rgb[2] * 64) / 64]
  return { id: s.id, x: wrap(geom.x(s.azimuth), geom.period), y, w, h, seed: s.seed, alpha: 0.88 * LEVEL_ALPHA[s.level] * s.share,
    body: snap(tones.body), shade: snap(tones.shade),
    altitude: s.altitude, distanceKm: s.distanceKm, share: s.share }
}

/** The z the shafts must stand over: the underside of the highest sheet drawn (they start below it). */
export function rainSheetZ(world: WorldState): number {
  return Math.max(0, ...(world.cloudField?.snapshot ?? []).map(({ layer, heightKm }) =>
    layer && heightKm > 0 && layer.cover > 0 ? sheetZ[layer.lattice] : 0))
}

/** The field's wind (east, north km/min) on a lattice; a low lattice falls back on the towers it shares the air with. */
function velOf(world: WorldState, lattice: Lattice): readonly [number, number] {
  const layers = (world.cloudField?.snapshot ?? []).map((s) => s.layer)
  const of = (l: Lattice) => layers.find((layer) => layer?.lattice === l)?.vel
  return of(lattice) ?? (lattice === 'low' ? of('tower') : undefined) ?? [0, 0]
}

/**
 * The carry across the view (px/s), the towers' (`acrossSpeed`) at the middle of the view and the clouds' median range:
 * the band drifts as one (per cloud it would shear), the way what stands round it is carried.
 */
function carryOf(geom: SkyGeom, sources: readonly Source[], vel: readonly [number, number]): number {
  const middle = geom.width / 2
  const az = (geom.azimuthAt(middle) * Math.PI) / 180
  const ranges = sources.map((s) => s.distanceKm).sort((a, b) => a - b)
  return acrossSpeed(vel, [Math.sin(az), Math.cos(az)], ranges[Math.floor(ranges.length / 2)] ?? 0, pxPerRadAt(geom.azimuthAt, middle))
}

/** The clouds `precip` falls from as drawn, their z and their carry; null when none falls. */
export function fallingOf(world: WorldState, box: SceneBox, geom: SkyGeom, precip: Precip): Falling | null {
  const layer = world.clouds.find((l) => l.rains)
  const sources = precip === 'rain' ? rainSources(world.rain?.cells ?? []) : layer ? snowSources(world, layer.level) : []
  if (!sources.length) return null
  const { low, mid, high } = coversOf(world)
  const union = 1 - (1 - low) * (1 - mid) * (1 - high)
  const stops = skyStops(world, box)
  const cells = sources.map((s) => drawn(world, box, geom, stops, union, s))
  const sheet = rainSheetZ(world) + 0.5
  if (precip === 'snow') return { cells, z: Math.max(Z[layer!.level], sheet), speed: carryOf(geom, sources, velOf(world, layer!.level)) }
  // Rain from the low cloud, the mid, or both (`midWeight`): its place and its wind between theirs.
  const weight = world.cloudField?.field.rain?.midWeight ?? Number(layer?.level === 'mid')
  const lowVel = velOf(world, 'low'), midVel = velOf(world, 'mid')
  const vel: [number, number] = [lowVel[0] + (midVel[0] - lowVel[0]) * weight, lowVel[1] + (midVel[1] - lowVel[1]) * weight]
  return { cells, z: Math.max(Z.low + (Z.mid - Z.low) * weight, sheet), speed: carryOf(geom, sources, vel) }
}
