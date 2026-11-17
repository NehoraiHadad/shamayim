const SLOTS = 366
const RADIUS = 7
const OFFSETS = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]
const COLUMNS = ['temperature_2m_max', 'temperature_2m_min', 'wind_gusts_10m_max'] as const

export function normalsQuery(canonical: string): string {
  const query = new URLSearchParams(canonical)
  query.set('start_date', '1991-01-01')
  query.set('end_date', '2020-12-31')
  query.set('daily', COLUMNS.join(','))
  query.set('timezone', 'auto')
  query.set('wind_speed_unit', 'kmh')
  return query.toString()
}

/** Month/day on a leap calendar; March never shifts between years. */
function slotOf(date: unknown): number {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date')
  const month = Number(date.slice(5, 7)) - 1
  const day = Number(date.slice(8, 10))
  const slot = OFFSETS[month] + day - 1
  const end = OFFSETS[month + 1] ?? SLOTS
  if (month < 0 || month > 11 || day < 1 || slot >= end) throw new Error('Invalid date')
  return slot
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const circular = (i: number) => (i + SLOTS) % SLOTS
const round = (v: number) => Math.round(v * 10) / 10

/** One pass over samples, then one circular sliding pass over the 366 buckets. */
function aggregate(values: unknown[], slots: number[]): { mean: number[]; sd: number[] } {
  const sums = new Float64Array(SLOTS)
  const squares = new Float64Array(SLOTS)
  const counts = new Uint32Array(SLOTS)
  values.forEach((v, i) => {
    if (v === null) return
    if (!finite(v)) throw new Error('Invalid sample')
    const slot = slots[i]
    sums[slot] += v
    squares[slot] += v * v
    counts[slot]++
  })
  let sum = 0, square = 0, count = 0
  const add = (slot: number, sign: number) => {
    sum += sign * sums[slot]
    square += sign * squares[slot]
    count += sign * counts[slot]
  }
  for (let i = -RADIUS; i <= RADIUS; i++) add(circular(i), 1)
  const mean: number[] = [], sd: number[] = []
  for (let i = 0; i < SLOTS; i++) {
    if (!count) throw new Error('Empty climate window')
    const average = sum / count
    mean.push(round(average))
    sd.push(round(Math.sqrt(Math.max(0, square / count - average * average))))
    add(circular(i - RADIUS), -1)
    add(circular(i + RADIUS + 1), 1)
  }
  return { mean, sd }
}

export function reduceNormals(body: string): string {
  const raw = JSON.parse(body)
  const daily = raw?.daily
  if (!finite(raw?.elevation) || !Array.isArray(daily?.time) || !daily.time.length) throw new Error('Invalid archive')
  const slots = daily.time.map(slotOf)
  const [max, min, gust] = COLUMNS.map((key) => {
    const values = daily[key]
    if (!Array.isArray(values) || values.length !== slots.length) throw new Error('Invalid column')
    return aggregate(values, slots)
  })
  return JSON.stringify({
    period: [1991, 2020], windowDays: 15, elevation: round(raw.elevation),
    tempMax: max.mean, tempMaxSd: max.sd, tempMin: min.mean, gustMax: gust.mean, gustMaxSd: gust.sd,
  })
}
