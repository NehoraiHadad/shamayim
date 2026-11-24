// V2b: what it costs to read a tile of 3-byte footprints at run time (gunzip and decode, and the rows of one place).
//   node scripts/v2b/decode.mjs <tilesDir> <footprintsDir>
import fs from 'node:fs'
import zlib from 'node:zlib'
import { chooseFootprints } from '../../src/dev/v2b/chooseFootprints.ts'

const [tiles, places] = process.argv.slice(2)
const files = fs.readdirSync(tiles).filter(f => f.endsWith('.bin')).map(f => fs.readFileSync(`${tiles}/${f}`)).sort((a, b) => b.length - a.length)
const time = (run, n = 200) => {
  for (let i = 0; i < 20; i++) run()
  const from = performance.now()
  for (let i = 0; i < n; i++) run()
  return +((performance.now() - from) / n).toFixed(3)
}
const decode = (bytes) => {
  const n = Math.floor(bytes.length / 3), x = new Float32Array(n), y = new Float32Array(n), kind = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const word = bytes[i] | bytes[n + i] << 8 | bytes[2 * n + i] << 16
    x[i] = (word & 1023) * 2; y[i] = (word >> 10 & 1023) * 2; kind[i] = word >> 20
  }
  return x[0] + y[0] + kind[0]
}
for (const [name, raw] of [['largest', files[0]], ['median', files[files.length >> 1]]]) {
  const gz = zlib.gzipSync(raw, { level: 9 })
  console.log(name, 'tile bytes', raw.length, 'gz', gz.length, 'gunzip ms', time(() => zlib.gunzipSync(gz)), 'decode ms', time(() => decode(raw)))
}
for (const f of fs.readdirSync(places).filter(f => f.endsWith('.json'))) {
  const all = JSON.parse(fs.readFileSync(`${places}/${f}`, 'utf8')).map(([x, y, long, short, angle]) => ({ dx: x / 1000, dy: y / 1000, long, short, angle }))
  console.log(f, all.length, 'rows and thinning ms', time(() => chooseFootprints(all, 1.6), 20))
}
