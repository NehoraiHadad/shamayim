import type { WorldCloudField } from './cloudField'
import { altitudeOf, projectCell } from './field/project'
import type { AirInput } from '../atmo/airTypes'
import { rainRate } from './airParts'
import { seeded } from '../data/landmarks/hash'
import type { Covers } from './clouds'
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
export function rainingLayer(covers: Covers, rateMmH: number): { level: CloudLevel | null; covers: Covers; raised: boolean } {
  if (rateMmH <= 0) return { level: null, covers, raised: false }
  if (covers.low >= RAIN_COVER) return { level: 'low', covers, raised: false }
  if (covers.mid >= RAIN_COVER) return { level: 'mid', covers, raised: false }
  return { level: 'low', covers: { ...covers, low: RAISED_COVER }, raised: true }
}

/** Rank the actual on-cells. The tower list reaches 80 km even where cellAt has left its raster. */
export function rainFrom(cloud: WorldCloudField, rateMmH: number, wind: Wind, weatherCode: number, preview: boolean,
  humidity: number | null, groundAboveEyeKm: number): Rain | null {
  const level = cloud.field.rain?.level
  if (rateMmH <= 0 || !level) return null
  const candidates = cloud.snapshot
    .filter(({ layer }) => layer?.lattice === level || (level === 'low' && layer?.lattice === 'tower'))
    .flatMap(({ cells, layer }) => cells.map(cell => ({ cell, layer: layer!, area: cell.r * (cell.rMinor ?? cell.r) })))
    .sort((a, b) => Number(b.cell.lattice === 'tower') - Number(a.cell.lattice === 'tower')
      || b.cell.tau0 * b.cell.r ** 2 - a.cell.tau0 * a.cell.r ** 2)
  const total = candidates.reduce((sum, item) => sum + item.area, 0)
  const fraction = rainAreaShare(weatherCode, rateMmH)
  const fallMs = weatherCode >= 71 && weatherCode <= 77 ? 1 : rateMmH < 0.5 ? 1.5 : rateMmH < 2.5 ? 4 : rateMmH < 8 ? 6 : 8
  const toward = wind.towardDeg * Math.PI / 180
  const groundWind = [Math.sin(toward) * wind.ms * 0.06, Math.cos(toward) * wind.ms * 0.06]
  let cumulative = 0, near = false
  const cells: Rain['cells'] = []
  for (const { cell, layer, area } of candidates) {
    const start = cumulative / total
    cumulative += area
    const end = cumulative / total
    const share = (rainRankIntegral(end, fraction) - rainRankIntegral(start, fraction)) / (end - start)
    if (share <= 0) break
    const depth = Math.max(0, cell.baseKm - groundAboveEyeKm)
    const dry = rateMmH < 0.2 && humidity !== null && humidity < 45
    const virga = Math.min(1, depth > 2.5 ? 2.5 / depth : 1, dry ? humidity / 45 : 1)
    const trail = virga ** 2 * depth / (2 * fallMs * 0.06)
    const x = cell.x - (layer.vel[0] - groundWind[0]) * trail
    const y = cell.y - (layer.vel[1] - groundWind[1]) * trail
    const radiusKm = 0.6 * cell.r
    const atEye = virga === 1 && Math.hypot(x, y) <= radiusKm
    near ||= atEye
    const projected = projectCell(cell)
    const half = Math.atan2(radiusKm, projected.rangeKm) * 180 / Math.PI
    cells.push({ x, y, radiusKm, share, virga, fromAzimuth: projected.az - half, toAzimuth: projected.az + half,
      bank: String(cell.id), atEye, baseKm: cell.baseKm, cloudX: cell.x, cloudY: cell.y, seed: cell.seed })
  }
  return { rateMmH, cells, near, slant: Math.atan(wind.ms * wind.across / fallMs), thunder: weatherCode >= 95 && !preview }
}

export function rainAreaShare(code: number, rate: number) {
  if ((code >= 51 && code <= 65) || (code >= 71 && code <= 75)) return 0.9
  return Math.max(0.08, Math.min(0.6, rate / (4 + 2 * rate)))
}

// Integral of the descending smoothstep over a symmetric 0.1-wide area ramp.
function rainRankIntegral(rank: number, fraction: number) {
  const start = fraction - 0.05
  const u = Math.max(0, Math.min(1, (rank - start) / 0.1))
  return Math.min(rank, start) + 0.1 * (u - u ** 3 + u ** 4 / 2)
}

/** Provide bank IDs to the existing shaft painter until it can consume physical shaft geometry. */
export function rainBanks(rain: Rain): CloudLayer['banks'] {
  return rain.cells.map(cell => {
    const distanceKm = Math.hypot(cell.cloudX, cell.cloudY)
    const altitude = altitudeOf(cell.baseKm, distanceKm)
    return { id: cell.bank, distanceKm, altitude: cell.atEye ? Math.max(30, altitude) : Math.min(29.999, altitude),
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
  const share = Math.min(1, Math.max(0.3, snow.amount))
  let falling = layer.banks.filter(() => r() < share)
  if (!falling.length) falling = [layer.banks[0]]
  const slant = Math.min((65 * Math.PI) / 180, Math.atan((wind.ms * Math.abs(wind.across)) / 1.2))
  return {
    amount: snow.amount,
    cells: falling.map((bank) => ({ fromAzimuth: bank.azimuth - bank.w / 2, toAzimuth: bank.azimuth + bank.w / 2, bank: bank.id })),
    slant: Math.sign(wind.across) * slant,
  }
}
