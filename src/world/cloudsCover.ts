import type { HourPoint } from '../domain/types'
import { smoothstep } from './ridgeLighting'
import type { WorldSources } from './types'

export interface Covers { low: number; mid: number; high: number }

/** The share of the sky the three layers cover together, taken as independent (as `thickCloud` does). */
export const unionOf = ({ low, mid, high }: Covers) => 1 - (1 - low) * (1 - mid) * (1 - high)

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export interface CoverInput {
  /** The shown cover (0–100), satellite-corrected for now. */
  cloudCover: number
  /** The shown low + mid cloud (0–100), when known. */
  thickCloud?: number | null
  /** The hour's layers (0–100 each), when the forecast gives them. */
  hour?: Pick<HourPoint, 'cloudLow' | 'cloudMid' | 'cloudHigh'>
}

/**
 * The cover of each layer (0–1). From the forecast's layers when it gives all three, scaled so together they make the
 * shown cover (which the satellite may have corrected for now). Else a marked fallback: from the thick (low + mid) cloud
 * and the cover (the rest is high cloud), or from the cover alone (all of it counted thick). Thick cloud is split evenly
 * between low and mid.
 */
export function layerCovers(input: CoverInput): { covers: Covers; source: WorldSources['cloudLayers'] } {
  const total = clamp01(input.cloudCover / 100)
  const { cloudLow, cloudMid, cloudHigh } = input.hour ?? {}
  if (cloudLow != null && cloudMid != null && cloudHigh != null) {
    const covers = { low: cloudLow / 100, mid: cloudMid / 100, high: cloudHigh / 100 }
    const union = unionOf(covers)
    if (union <= 0) return { covers: { low: 0, mid: 0, high: 0 }, source: 'forecast' }
    // Raising each clear share to the same power matches the target union up to 0.95.
    // Clamp each individual clear share at 1e-4 so reported 100% layers can still scale down.
    const clearLog = (c: number) => Math.log1p(-Math.min(c, 0.9999))
    const low = clearLog(covers.low), mid = clearLog(covers.mid), high = clearLog(covers.high)
    const k = Math.log1p(-Math.min(total, 0.95)) / (low + mid + high)
    // Above 0.95, both requested and modeled union lie in [0.95, 1].
    // The cubic's slope is at most 1.5 / 0.05, so a 0.001 step moves a layer by at most 0.03 in this span.
    const closure = smoothstep(0.95, 1, total)
    const scale = (log: number) => log < 0 ? 1 - Math.exp(k * log) * (1 - closure) : 0
    return { covers: { low: scale(low), mid: scale(mid), high: scale(high) }, source: 'forecast' }
  }
  const knownThick = input.thickCloud != null
  const thick = clamp01(Math.min(knownThick ? input.thickCloud! / 100 : total, total))
  const high = thick >= 1 ? 0 : clamp01(1 - (1 - total) / (1 - thick))
  const each = 1 - Math.sqrt(1 - thick)
  return { covers: { low: each, mid: each, high }, source: knownThick ? 'thickCloud' : 'cover' }
}
