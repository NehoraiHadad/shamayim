import type { AirPoint } from '../../domain/types'
import { column, DataError, numOrNull, obj, str } from './guards'

export function mapAir(input: unknown): AirPoint[] {
  const raw = obj(input, 'air')
  const h = obj(raw.hourly, 'air.hourly')
  const time = h.time
  if (!Array.isArray(time)) throw new DataError('air.hourly.time: missing')
  const n = time.length
  const pm10 = column(h, 'pm10', n, 'air.hourly')
  const dust = column(h, 'dust', n, 'air.hourly')
  const uv = column(h, 'uv_index', n, 'air.hourly')
  return time.map((t, i) => ({
    time: str(t, `air.hourly.time[${i}]`),
    pm10: numOrNull(pm10[i]),
    dust: numOrNull(dust[i]),
    uv: numOrNull(uv[i]),
  }))
}
