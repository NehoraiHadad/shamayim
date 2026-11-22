// Records a real day as a forecast fixture (track D: the review stills are real moments, not forced weather): Open-Meteo's
// historical-forecast archive answered for one place and a week round the day, with the app's own fields and models
// (`src/data/openMeteo/request.ts`) plus CAPE and the freezing level, shaped as the live forecast answer the app maps.
// The archive has no `current`: it is the day's noon hour of the first model, as `rollForward` rewrites it per hour anyway.
// Usage: npx tsx scripts/fixtures/recordForecast.ts <lat> <lon> <YYYY-MM-DD> <out.json> [note]
import fs from 'node:fs'
import { CURRENT, DAILY, FORECAST_MODELS, HOURLY, SCENE_HOURLY } from '../../src/data/openMeteo/request'

const [lat, lon, day, out, note = ''] = process.argv.slice(2)
if (!lat || !lon || !/^\d{4}-\d{2}-\d{2}$/.test(day ?? '') || !out) throw new Error('usage: <lat> <lon> <YYYY-MM-DD> <out.json> [note]')
const shift = (d: string, days: number) => new Date(Date.parse(`${d}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10)
/** Fields the live answer has in `current` but the hourly request does not ask for: asked here to fill it, then dropped. */
const FOR_CURRENT = CURRENT.filter((f) => !HOURLY.includes(f) && !SCENE_HOURLY.includes(f as never))
const EXTRA = ['cape', 'freezing_level_height']
const hourly = [...HOURLY, ...SCENE_HOURLY, ...EXTRA]
const q = new URLSearchParams({ latitude: lat, longitude: lon, timezone: 'Asia/Jerusalem', models: FORECAST_MODELS,
  start_date: shift(day, -1), end_date: shift(day, 6), wind_speed_unit: 'kmh',
  hourly: [...hourly, ...FOR_CURRENT].join(','), daily: DAILY.join(',') })
const res = await fetch(`https://historical-forecast-api.open-meteo.com/v1/forecast?${q}`)
if (!res.ok) throw new Error(`archive ${res.status}: ${await res.text()}`)
const answer = await res.json() as Record<string, any>
const model = FORECAST_MODELS.split(',')[0]
const at = answer.hourly.time.indexOf(`${day}T12:00`)
const current: Record<string, unknown> = { time: `${day}T12:00`, interval: 900 }
for (const f of CURRENT) current[f] = answer.hourly[`${f}_${model}`]?.[at] ?? null
for (const f of FOR_CURRENT) for (const m of FORECAST_MODELS.split(',')) {
  delete answer.hourly[`${f}_${m}`]
  delete answer.hourly_units[`${f}_${m}`]
}
const unit = (f: string) => answer.hourly_units[`${f}_${model}`] ?? ''
fs.writeFileSync(out, JSON.stringify({
  _recorded: `REAL Open-Meteo historical-forecast answer for ${lat},${lon}, ${shift(day, -1)} to ${shift(day, 6)} (models ${FORECAST_MODELS}), `
    + `recorded by scripts/fixtures/recordForecast.ts. current = ${day} 12:00 of ${model}. ${note}`.trim(),
  ...answer, current, current_units: Object.fromEntries(Object.keys(current).map((f) => [f, f === 'time' ? 'iso8601' : f === 'interval' ? 'seconds' : unit(f)])),
}, null, 1))
console.log(out, answer.hourly.time.length, 'hours')
