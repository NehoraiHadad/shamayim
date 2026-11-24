// node s0/table.mjs <dir with perf-<pair>-<machine>/>: every row of the perf logs, tree a beside tree b, as Markdown.
// d: median b against median a (%); spread: (max − min) / median of tree a's runs (%); a first, b first: d in the rounds where
// a, then b, ran first.
import fs from 'node:fs'
import path from 'node:path'

const PLACES = ['haifa', 'tel-aviv', 'shadmot-mehola']
const median = (list) => {
  const s = [...list].sort((a, b) => a - b), m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const sum = (text) => text.split('/').reduce((t, v) => t + (Number(v) || 0), 0)

/** A log's rows: `place row` → number. */
function rowsOf(text) {
  const rows = new Map()
  let place = ''
  const put = (name, value) => { if (place && Number.isFinite(value)) rows.set(`${place}|${name}`, value) }
  for (const line of text.split('\n')) {
    const at = line.match(/^(\S+)\s+\(CPU ×/)
    if (at) { place = at[1]; continue }
    if (/^app living-land/.test(line)) place = ''
    let m = line.match(/^ {2}([\w.]+|anim frame)\s+p50\s+([\d.]+)\s+p95\s+([\d.]+) ms/)
    if (m) { put(`${m[1]} p50`, +m[2]); put(`${m[1]} p95`, +m[3]); continue }
    if ((m = line.match(/^ {2}memory\s+([\d.]+) MB/))) put('memory MB', +m[1])
    if ((m = line.match(/^ {2}memory \(thunder\) ([\d.]+) MB/))) put('memory thunder MB', +m[1])
    if ((m = line.match(/worker cold {2}\(.*?\): sky ([\d./-]+), land ([\d./-]+)/))) { put('worker cold sky', sum(m[1])); put('worker cold land', sum(m[2])) }
    if ((m = line.match(/worker scrub .*?: sky p50 ([\d.]+) p95 ([\d.]+).*?land p50 ([\d.]+) p95 ([\d.]+)/))) {
      put('worker scrub sky p50', +m[1]); put('worker scrub sky p95', +m[2]); put('worker scrub land p50', +m[3]); put('worker scrub land p95', +m[4])
    }
    if ((m = line.match(/cold batch at thunder \(ms\): sky ([\d./-]+), land ([\d./-]+)/))) { put('thunder batch sky', sum(m[1])); put('thunder batch land', sum(m[2])) }
    if ((m = line.match(/^ {2}(loading|arrive)\s+world.*frame p50 ([\d.]+) p95 ([\d.]+) ms/))) put(`${m[1]} frame p95`, +m[3])
  }
  return rows
}

const [dir] = process.argv.slice(2)
for (const name of fs.readdirSync(dir).sort()) {
  const folder = path.join(dir, name)
  const runs = fs.readdirSync(folder).filter((f) => f.endsWith('.log')).map((file) => {
    const text = fs.readFileSync(path.join(folder, file), 'utf8')
    const head = text.match(/^@@ tree=(\w) commit=(\w+) round=(\d) turn=(\d)/)
    return { tree: head[1], commit: head[2], round: +head[3], rows: rowsOf(text), over: [...text.matchAll(/^ {2}(\S+ .* > .*)$/gm)].map((m) => m[1]) }
  })
  const commits = (tree) => [...new Set(runs.filter((r) => r.tree === tree).map((r) => r.commit.slice(0, 8)))].join(',')
  const cpu = path.join(folder, 'machine.txt')
  console.log(`\n## ${name}\n\na = ${commits('a')}, b = ${commits('b')}; ${runs.length} runs; ${fs.existsSync(cpu) ? fs.readFileSync(cpu, 'utf8').trim() : ''}\n`)
  for (const tree of ['a', 'b']) {
    const over = runs.filter((r) => r.tree === tree).flatMap((r) => r.over.map((o) => o.replace(/ [\d.]+ ms > .*| [\d.]+ > .*/, '')))
    console.log(`Over budget in ${tree}: ${[...new Set(over)].map((o) => `${o} ×${over.filter((v) => v === o).length}`).join('; ') || 'none'}\n`)
  }
  console.log('| place | row | a | b | d % | spread a % | spread b % | a first d % | b first d % |\n|---|---|---|---|---|---|---|---|---|')
  const keys = [...new Set(runs.flatMap((r) => [...r.rows.keys()]))].sort((x, y) => PLACES.indexOf(x.split('|')[0]) - PLACES.indexOf(y.split('|')[0]))
  for (const key of keys) {
    const of = (tree, keep = () => true) => runs.filter((r) => r.tree === tree && keep(r) && r.rows.has(key)).map((r) => r.rows.get(key))
    const a = of('a'), b = of('b')
    if (!a.length || !b.length) continue
    const pct = (x, y) => (y ? ((x / y - 1) * 100).toFixed(1) : '-')
    const spread = (l) => (median(l) ? (((Math.max(...l) - Math.min(...l)) / median(l)) * 100).toFixed(0) : '-')
    const odd = (r) => r.round % 2 === 1, even = (r) => r.round % 2 === 0
    const half = (keep) => (of('a', keep).length && of('b', keep).length ? pct(median(of('b', keep)), median(of('a', keep))) : '-')
    console.log(`| ${key.replace('|', ' | ')} | ${median(a).toFixed(1)} | ${median(b).toFixed(1)} | ${pct(median(b), median(a))} | ${spread(a)} | ${spread(b)} | ${half(odd)} | ${half(even)} |`)
  }
}
