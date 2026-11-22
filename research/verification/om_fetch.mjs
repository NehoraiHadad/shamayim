#!/usr/bin/env node
// Downloads what Open-Meteo's models forecast in the past, at every IMS station, for the forecast-verification study.
//
// Run it on a machine with its own IP address (the free tier allows 10,000 weighted calls a day per IP):
//   node research/verification/om_fetch.mjs            # all passes, resumes where it stopped
//   node research/verification/om_fetch.mjs --pass 1   # only one pass
//   node research/verification/om_fetch.mjs --shard 2/3  # only every third station (start 1/3, 2/3, 3/3 on three
//                                                       # machines with different IPs to split the work)
// It needs Node 18+ and no packages. It paces itself, waits out Open-Meteo's minute/hour/day limits on its own and
// can be stopped (Ctrl+C) and started again at any time: finished pieces are never fetched twice.
//
// Source: the Previous Runs API (https://open-meteo.com/en/docs/previous-runs-api). For every hour it returns the
// latest forecast (`temperature_2m`) and what the runs from N days earlier said for that same hour
// (`temperature_2m_previous_dayN`), so the error can be measured per lead time. Same models and the same default
// elevation handling as the app's own request (src/data/openMeteo/request.ts).

import { mkdir, readFile, rename, writeFile, access } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'om-archive')
const MODELS = 'icon_seamless,ecmwf_ifs025'
const START = '2024-01-01'

// Each pass is ≤ 5 variables × 2 models = 10, so a request weighs one call per two weeks of data.
const PASSES = {
  1: ['temperature_2m', 'temperature_2m_previous_day1', 'temperature_2m_previous_day2',
    'temperature_2m_previous_day4', 'temperature_2m_previous_day6'],
  2: ['wind_gusts_10m', 'wind_gusts_10m_previous_day1', 'relative_humidity_2m',
    'relative_humidity_2m_previous_day1', 'precipitation_previous_day1'],
}

const HOURLY_BUDGET = 4000 // stay under Open-Meteo's 5,000/hour
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const exists = (p) => access(p).then(() => true, () => false)
const ymd = (d) => d.toISOString().slice(0, 10)
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

function chunks() {
  const end = new Date(Date.now() - 2 * 864e5) // the archive settles a day or two after the fact
  const out = []
  for (let y = Number(START.slice(0, 4)); y <= end.getUTCFullYear(); y++) {
    const from = y === Number(START.slice(0, 4)) ? START : `${y}-01-01`
    const to = y === end.getUTCFullYear() ? ymd(end) : `${y}-12-31`
    out.push({ year: y, from, to })
  }
  return out
}

function weight(vars, from, to) {
  const days = (Date.parse(to) - Date.parse(from)) / 864e5 + 1
  return Math.max(1, (vars.length * 2) / 10) * Math.max(1, days / 14)
}

function msUntilNextUtc(unit) {
  const now = new Date()
  const next = new Date(now)
  if (unit === 'hour') next.setUTCHours(now.getUTCHours() + 1, 1, 0, 0)
  else next.setUTCHours(24, 5, 0, 0)
  return next - now
}

let spent = [] // [timestamp, weight] in the last hour
async function pace(w) {
  for (;;) {
    const hourAgo = Date.now() - 3600e3
    spent = spent.filter(([t]) => t > hourAgo)
    const used = spent.reduce((s, [, x]) => s + x, 0)
    if (used + w <= HOURLY_BUDGET) break
    await sleep(30e3)
  }
  spent.push([Date.now(), w])
}

async function fetchOne(st, vars, c) {
  const p = new URLSearchParams({
    latitude: String(st.lat), longitude: String(st.lon), timezone: 'GMT', models: MODELS,
    wind_speed_unit: 'kmh', start_date: c.from, end_date: c.to, hourly: vars.join(','),
  })
  const url = `https://previous-runs-api.open-meteo.com/v1/forecast?${p}`
  for (let attempt = 0; ; attempt++) {
    let res, body
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(180e3) })
      body = await res.text()
    } catch (e) {
      const wait = Math.min(600e3, 15e3 * 2 ** attempt)
      log(`network error (${e.message}); retrying in ${Math.round(wait / 1e3)} s`)
      await sleep(wait)
      continue
    }
    if (res.ok) return body
    let reason = body
    try { reason = JSON.parse(body).reason ?? body } catch {}
    if (res.status === 429) {
      const unit = /daily/i.test(reason) ? 'day' : /hourly/i.test(reason) ? 'hour' : 'minute'
      const wait = unit === 'minute' ? 65e3 : msUntilNextUtc(unit)
      log(`Open-Meteo limit (${reason}); waiting ${Math.round(wait / 60e3)} min. Leave it running, or stop and rerun later.`)
      await sleep(wait)
      continue
    }
    if (res.status >= 500 && attempt < 6) {
      await sleep(15e3 * 2 ** attempt)
      continue
    }
    throw new Error(`${res.status} for station ${st.id} ${c.from}..${c.to}: ${reason}`)
  }
}

async function main() {
  const only = process.argv.includes('--pass') ? Number(process.argv[process.argv.indexOf('--pass') + 1]) : null
  const stations = JSON.parse(await readFile(join(HERE, 'om_stations.json'), 'utf8'))
  // Spread the order over the country, so a partial download still covers every region.
  stations.sort((a, b) => ((a.id * 7919) % 101) - ((b.id * 7919) % 101) || a.id - b.id)
  if (process.argv.includes('--shard')) {
    const [k, n] = process.argv[process.argv.indexOf('--shard') + 1].split('/').map(Number)
    if (!(n >= 1 && k >= 1 && k <= n)) throw new Error('--shard takes k/n, e.g. 1/3')
    const mine = stations.filter((_, i) => i % n === k - 1)
    stations.length = 0
    stations.push(...mine)
    log(`shard ${k}/${n}: ${stations.length} stations`)
  }
  const shard = process.argv.includes('--shard') ? process.argv[process.argv.indexOf('--shard') + 1] : null
  const branch = shard ? `verification-data-${shard.split('/')[0]}` : 'verification-data'
  const failures = []
  for (const [pass, vars] of Object.entries(PASSES)) {
    if (only && Number(pass) !== only) continue
    const dir = join(OUT, `pass${pass}`)
    await mkdir(dir, { recursive: true })
    const jobs = []
    for (const st of stations) for (const c of chunks()) jobs.push({ st, c, file: join(dir, `${st.id}_${c.year}.json.gz`) })
    let done = 0
    for (const { st, c, file } of jobs) {
      done++
      if (await exists(file)) continue
      await pace(weight(vars, c.from, c.to))
      try {
        const body = await fetchOne(st, vars, c)
        await writeFile(`${file}.tmp`, gzipSync(body))
        await rename(`${file}.tmp`, file)
        log(`pass ${pass}  ${done}/${jobs.length}  station ${st.id} ${st.name} ${c.year}`)
      } catch (e) {
        failures.push(e.message)
        log(`FAILED: ${e.message}`)
      }
      await sleep(1500)
    }
    log(`pass ${pass} finished`)
  }
  if (failures.length) {
    console.log(`\n${failures.length} pieces failed (rerun to retry them):\n${failures.join('\n')}`)
  } else {
    console.log(`\nAll done. Send the data back (from the repository root):
  git switch --orphan ${branch}
  git add research/verification/om-archive
  git commit -m "Open-Meteo previous-runs archive at IMS stations"
  git push -u origin ${branch}
  git switch -`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
