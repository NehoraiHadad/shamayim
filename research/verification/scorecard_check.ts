// Used by `scorecard.py --check`: the app's own correction code on the rows it is given, so the Python replay can be
// compared with what the app computes. Run from the repository root: npx tsx research/verification/scorecard_check.ts rows.json
import { readFileSync } from 'node:fs'
import { dailyMaxAdd, hourlyTemperatureAdd } from '../../src/domain/correction/temperature'
import { correctGust, correctHumidity } from '../../src/domain/correction/windHumidity'

interface Row { time: string; now: string; lead: number; gust: number }
const rows: Row[] = JSON.parse(readFileSync(process.argv[2], 'utf8'))
console.log(JSON.stringify(rows.map((r) => [hourlyTemperatureAdd(r.time, r.now, 7200),
  correctGust(r.gust, 0, r.time, r.now, 7200) - r.gust, correctHumidity(50, r.time, r.now, 7200) - 50, dailyMaxAdd(r.lead)])))
