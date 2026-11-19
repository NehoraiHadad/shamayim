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

/**
 * The rain: falls only from the banks of the layer that rains, at their true azimuths (steady rain from most of them,
 * a shower from a few), slanted by the one wind toward where it goes. Null when nothing falls.
 */
export function rainFrom(layers: readonly CloudLayer[], rateMmH: number, wind: Wind, weatherCode: number, preview: boolean,
  seed: number): Rain | null {
  const layer = layers.find((l) => l.rains)
  if (rateMmH <= 0 || !layer || !layer.banks.length) return null
  const share = Math.min(1, Math.max(0.3, rateMmH / 2))
  const r = seeded(seed)
  let raining = layer.banks.filter(() => r() < share)
  if (!raining.length) raining = [layer.banks[0]]
  // Apparent fall speed (km/h-equivalent), as the WebGL rain: drizzle drifts, heavy rain stays near upright.
  const fall = rateMmH < 0.5 ? 20 : 60
  const slant = Math.min((50 * Math.PI) / 180, Math.atan((wind.ms * 3.6 * Math.abs(wind.across)) / fall))
  return {
    rateMmH,
    cells: raining.map((bank) => ({ fromAzimuth: bank.azimuth - bank.w / 2, toAzimuth: bank.azimuth + bank.w / 2, bank: bank.id })),
    slant: Math.sign(wind.across) * slant,
    thunder: weatherCode >= 95 && !preview,
  }
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
