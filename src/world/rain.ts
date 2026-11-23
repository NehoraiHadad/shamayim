import type { WorldCloudField } from './cloudField'
import { isHere } from './field/hereCell'
import { altitudeOf, projectCell } from './field/project'
import type { AirInput } from '../atmo/airTypes'
import type { FieldWeather } from '../atmo/fieldWeather'
import { rainRate } from './airParts'
import { seeded } from '../data/landmarks/hash'
import { smoothstep } from '../domain/smoothstep'
import type { Covers } from './clouds'
import type { Lattice } from './field/types'
import type { SnowFall } from './snowLine'
import type { CloudLayer, CloudLevel, Rain, Snowfall, Wind } from './types'

/** A layer this thick or more can be the one that rains. */
const RAIN_COVER = 0.3
/** When the forecast rains under thinner cloud than that, the low layer is raised to this (marked in `sources`). */
const RAISED_COVER = 0.6

/** Rain rate (mm/h) of the shown air: rain only (snow at or below 2 °C is snow), drizzle on a rain code with ~0 mm. */
export const rainOf = (shown: AirInput) => rainRate(shown)

/**
 * Which layer makes the rain: the low cloud when it is thick enough, else the mid (rain from altostratus); when neither
 * is, the low layer is raised so the rain has a cloud to fall from (the forecast's rain is the truth; its cover per
 * layer, blended from two models, may not agree with it).
 */
export function rainingLayer(covers: Covers, rateMmH: number): { level: CloudLevel | null; covers: Covers; raised: boolean; midWeight: number } {
  if (rateMmH <= 0) return { level: null, covers, raised: false, midWeight: 0 }
  const midWeight = (1 - smoothstep(0.25, RAIN_COVER, covers.low)) * smoothstep(0.25, RAIN_COVER, covers.mid)
  if (covers.low >= RAIN_COVER) return { level: 'low', covers, raised: false, midWeight }
  if (covers.mid >= RAIN_COVER) return { level: 'mid', covers, raised: false, midWeight }
  // The extra cover grows with the shower and tapers as an existing layer becomes thick enough to rain.
  const weight = smoothstep(0, 0.2, rateMmH) * (1 - smoothstep(0.25, RAIN_COVER, Math.max(covers.low, covers.mid)))
  return { level: 'low', covers: { ...covers, low: covers.low + (RAISED_COVER - covers.low) * weight }, raised: true, midWeight }
}

/** Rank the actual on-cells. Low candidates are the individually drawn cells within 10 km. Towers reach 80 km, beyond their raster. */
export function rainFrom(cloud: WorldCloudField, rateMmH: number, wind: Wind,
  { steadyRain, fallMs, dryVirga }: Pick<FieldWeather, 'steadyRain' | 'fallMs' | 'dryVirga'>,
  thunderWeight: number, groundAboveEyeKm: number | ((eastKm: number, northKm: number) => number)): Rain | null {
  const rain = cloud.field.rain
  if (rateMmH <= 0 || !rain) return null
  const candidates = cloud.snapshot
    .flatMap(({ cells, layer }) => cells.filter(cell => cell.rainWeight > 0).map(cell => ({ cell, layer: layer!, area: cell.r * (cell.rMinor ?? cell.r),
      score: cell.rainWeight * cell.tau0 * cell.r ** 2 })))
    .sort((a, b) => Number(isHere(b.cell)) - Number(isHere(a.cell))
      || Number(b.cell.lattice === 'tower') - Number(a.cell.lattice === 'tower')
      || b.score - a.score)
  const groupOf = (lattice: Lattice): CloudLevel => lattice === 'tower' ? 'low' : lattice
  const total = new Map<CloudLevel, number>()
  for (const { layer, area } of candidates) {
    const group = groupOf(layer.lattice)
    total.set(group, (total.get(group) ?? 0) + area)
  }
  const fraction = rainAreaShare(steadyRain, rateMmH)
  const toward = wind.towardDeg * Math.PI / 180
  const groundWind = [Math.sin(toward) * wind.ms * 0.06, Math.cos(toward) * wind.ms * 0.06]
  const cumulative = new Map<CloudLevel, number>()
  const cells: Rain['cells'] = []
  for (const { cell, layer, area } of candidates) {
    const group = groupOf(layer.lattice)
    const previous = cumulative.get(group) ?? 0
    const areaSum = total.get(group)!
    const start = previous / areaSum, end = (previous + area) / areaSum
    cumulative.set(group, previous + area)
    if (end <= start || start >= fraction + 0.05) continue
    const levelWeight = rain.midWeight === undefined ? 1 : group === 'mid' ? rain.midWeight : 1 - rain.midWeight
    const share = levelWeight * (rainRankIntegral(end, fraction) - rainRankIntegral(start, fraction)) / (end - start)
    if (share <= 0) continue
    const vx = layer.vel[0] - groundWind[0], vy = layer.vel[1] - groundWind[1]
    let x = cell.x, y = cell.y, virga = 1
    // Solve for the ground at the displaced foot. Successive estimates stop
    // at a horizontal residual of at most 1 m, with a 12-sample cap.
    for (let i = 0; i < 12; i++) {
      const footAboveEyeKm = typeof groundAboveEyeKm === 'number' ? groundAboveEyeKm : groundAboveEyeKm(x, y)
      const depth = Math.max(0, cell.baseKm - footAboveEyeKm)
      virga = Math.min(depth > 2.5 ? 2.5 / depth : 1, dryVirga)
      const trail = virga ** 2 * depth / (2 * fallMs * 0.06)
      const nextX = cell.x - vx * trail, nextY = cell.y - vy * trail
      const residual = Math.hypot(nextX - x, nextY - y)
      x = nextX
      y = nextY
      if (residual <= 0.001 || typeof groundAboveEyeKm === 'number') break
    }
    const radiusKm = 0.6 * cell.r
    const atEye = virga === 1 && Math.hypot(x, y) <= radiusKm
    const projected = projectCell(cell)
    const half = Math.atan2(radiusKm, projected.rangeKm) * 180 / Math.PI
    cells.push({ level: group, x, y, radiusKm, share, virga, fromAzimuth: projected.az - half, toAzimuth: projected.az + half,
      bank: String(cell.id), atEye, baseKm: cell.baseKm, cloudX: cell.x, cloudY: cell.y, seed: cell.seed })
  }
  return { rateMmH, cells, near: cells.some(cell => cell.atEye), slant: Math.atan(wind.ms * wind.across / fallMs),
    thunder: thunderWeight > 0, thunderWeight }
}

export function rainAreaShare(steadyWeight: number, rate: number) {
  const showers = Math.max(0.08, Math.min(0.6, rate / (4 + 2 * rate)))
  return showers + (0.9 - showers) * steadyWeight
}

// Integral of the descending smoothstep over a symmetric 0.1-wide area ramp.
function rainRankIntegral(rank: number, fraction: number) {
  const start = fraction - 0.05
  const u = Math.max(0, Math.min(1, (rank - start) / 0.1))
  return Math.min(rank, start) + 0.1 * (u - u ** 3 + u ** 4 / 2)
}

/** Provide bank IDs to the existing shaft painter until it can consume physical shaft geometry. */
export function rainBanks(rain: Rain) {
  return rain.cells.map(cell => {
    const distanceKm = Math.hypot(cell.cloudX, cell.cloudY)
    const altitude = altitudeOf(cell.baseKm, distanceKm)
    return { level: cell.level, id: cell.bank, distanceKm, altitude: cell.atEye ? Math.max(30, altitude) : Math.min(29.999, altitude),
      azimuth: (cell.fromAzimuth + cell.toAzimuth) / 2, w: (cell.toAzimuth - cell.fromAzimuth) / 0.6,
      h: 1, puffs: 3, seed: cell.seed, share: cell.share }
  })
}
/**
 * Snow falling (C7): like the rain, only from the banks of the layer that precipitates (`rainingLayer` chose it from the
 * snowfall), at their true azimuths, slanted by the one wind: flakes fall slowly (~1 m/s), so the wind carries them far
 * more than it slants the rain. Null unless snow is falling now (lying snow is the caps' alone).
 */
export function snowFrom(layers: readonly CloudLayer[], snow: SnowFall | null, wind: Wind, seed: number): Snowfall | null {
  const layer = layers.find((l) => l.rains)
  if (!snow?.falling || !layer || !layer.banks.length) return null
  const r = seeded(seed)
  const share = Math.min(1, Math.max(0.3, snow.fallAmount))
  const banks = layer.banks.filter((bank) => !bank.seen)
  let falling = banks.filter(() => r() < share)
  if (!falling.length) falling = banks.slice(0, 1)
  if (!falling.length) return null
  const slant = Math.min((65 * Math.PI) / 180, Math.atan((wind.ms * Math.abs(wind.across)) / 1.2))
  return {
    amount: snow.fallAmount,
    cells: falling.map((bank) => ({ fromAzimuth: bank.azimuth - bank.w / 2, toAzimuth: bank.azimuth + bank.w / 2, bank: bank.id })),
    slant: Math.sign(wind.across) * slant,
  }
}
