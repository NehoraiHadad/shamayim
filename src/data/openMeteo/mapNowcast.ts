import { blendNumber, iconWeight } from '../../domain/blend'
import type { NowcastPoint } from '../../domain/types'
import { column, obj } from './guards'
import { pairs } from './mapHelpers'
import { MODELS } from './suffix'

/** Optional data must never prevent the main forecast from rendering. */
export function mapNowcast(input: unknown): NowcastPoint[] | null {
  try {
    const raw = obj(input, 'forecast')
    if (raw.minutely_15 === undefined || raw.minutely_15 === null) return null
    const block = obj(raw.minutely_15, 'minutely_15')
    const times = block.time
    if (!Array.isArray(times)) throw new Error('Missing nowcast time axis')
    if (!times.length) return null
    for (const model of MODELS) {
      const key = `precipitation_${model}`
      if (block[key] !== undefined && column(block, key, times.length, 'minutely_15')
        .some((v) => v !== null && (typeof v !== 'number' || !Number.isFinite(v) || v < 0))) throw new Error('Invalid precipitation')
    }
    const values = pairs(block, 'precipitation', times.length, 'minutely_15')
    return times.map((time, i) => {
      const precipitation = blendNumber(values[i], iconWeight(0))
      if (typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time)
        || !Number.isFinite(Date.parse(`${time}Z`)) || (i > 0 && Date.parse(`${time}Z`) - Date.parse(`${times[i - 1]}Z`) !== 900_000)
        || precipitation === null || precipitation < 0) throw new Error('Invalid nowcast slot')
      return { time, precipitation }
    })
  } catch (err) {
    console.warn('[shamayim] nowcast data ignored', err)
    return null
  }
}
