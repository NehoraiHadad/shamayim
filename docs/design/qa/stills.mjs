// Dev-only QA: 375 px stills of the app for a set of places, via headless Chrome and `place.html`.
// Usage: node docs/design/qa/stills.mjs <out-prefix> [port] [at] [wx] [places,comma,separated]
// e.g.   node docs/design/qa/stills.mjs docs/design/qa/round/before 5180 2026-11-18T12:00
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const [prefix = 'docs/design/qa/still', port = '5179', at = '2026-11-18T12:00', wx = '', only = ''] = process.argv.slice(2)

const il = (id, nameHe, lat, lon, extra = {}) => ({ id, nameHe, regionHe: '', lat, lon, timezone: 'Asia/Jerusalem', ...extra })
const PLACES = {
  shadmot: il('shadmot-mehola', 'שדמות מחולה', 32.348, 35.535, { regionHe: 'בקעת הירדן' }),
  karmeitzur: il('osm:way:462664109', 'כרמי צור', 31.6092, 35.1009,
    { regionHe: 'יהודה ושומרון', usesOsm: true, featureCode: 'PPL', settlementType: 'village' }),
  ramon: il('qa-ramon', 'מצפה רמון', 30.6103, 34.8013, { regionHe: 'נגב', population: 5500 }),
  telaviv: il('qa-telaviv', 'תל אביב-יפו', 32.0809, 34.7806, { population: 460000, settlementType: 'city' }),
  jerusalem: il('qa-jerusalem', 'ירושלים', 31.7767, 35.2345, { population: 980000, settlementType: 'city' }),
  haifa: il('qa-haifa', 'חיפה', 32.8156, 34.9892, { population: 290000, settlementType: 'city' }),
  tiberias: il('qa-tiberias', 'טבריה', 32.7922, 35.5312, { population: 48000, settlementType: 'city' }),
}

const query = `at=${at}${wx ? `&wx=${wx}` : ''}`
mkdirSync(dirname(resolve(prefix)), { recursive: true })
for (const [key, place] of Object.entries(PLACES)) {
  if (only && !only.split(',').includes(key)) continue
  const url = `http://localhost:${port}/docs/design/qa/place.html?w=375&h=700&p=${encodeURIComponent(JSON.stringify(place))}`
    + `&to=${encodeURIComponent(`/?${query}`)}`
  const out = resolve(`${prefix}-${key}.png`)
  execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--window-size=375,700', '--force-device-scale-factor=2',
    '--virtual-time-budget=9000', `--user-data-dir=${join(tmpdir(), 'shamayim-qa-chrome', key)}`, `--screenshot=${out}`, url],
  { stdio: 'ignore' })
  console.log(out)
}
