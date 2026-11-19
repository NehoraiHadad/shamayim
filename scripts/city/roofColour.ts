// Prototype, not wired in: can roofs be read from satellite colour (red clay tiles reddish from above, concrete
// white-grey)? Samples EOX Sentinel-2 cloudless 2017 (10 m; "Sentinel-2 cloudless - https://s2maps.eu by EOX IT
// Services GmbH (Contains modified Copernicus Sentinel data 2017)", CC BY 4.0) over each place's built squares in the
// shipped city cells, and prints the share of reddish pixels against places whose roofs we know.
//
// Result (2026-11-19, z14, 231 tiles): it does not separate tile from flat. On the first ten places a cut at 0.54
// separates them, and it ranks a second set right too, but on a third set (Negev and Sharon suburbs of red tiles;
// Triangle towns of flat roofs on red hamra soil) it is wrong on 9 of 18. At 10 m a pixel is mostly garden, road and
// soil, so the share follows the soil and region, not the roofs. Kept for the record; see TRUE-SCENE-PLAN.md Status.
//
// Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/city/roofColour.ts <tile cache dir>
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { splitByPlace } from '../../src/data/city/clusters'
import type { BuiltSquare } from '../../src/data/city/clusterTypes'
import { COLS, decodeRuns, ROWS, squareCentre } from '../../src/data/city/grid'
import type { CityCell, CityIndex, PlaceRow } from '../../src/data/city/types'
// geotiff's baseline/progressive JPEG decoder (from pdf.js); it returns YCbCr, converted below.
// @ts-expect-error: not in the package's exports or types
import JpegDecoder from '../../node_modules/geotiff/dist-module/compression/jpeg.js'

const ROOT = 'public/data/city/il/'
const ZOOM = 14
const TILE = (x: number, y: number) =>
  `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2017_3857/default/g/${ZOOM}/${y}/${x}.jpg`
const CUT = .54

/** Roofs known on the ground: [name, near lat, truth]. Sets 1 and 2 agreed with the colour; set 3 did not. */
const KNOWN: [name: string, lat: number, truth: 'tile' | 'flat', set: 1 | 2 | 3][] = [
  ['נהלל', 32.69, 'tile', 1], ['שדמות מחולה', 32.35, 'tile', 1], ['ראש פינה', 32.97, 'tile', 1],
  ['זכרון יעקב', 32.57, 'tile', 1], ['כפר תבור', 32.69, 'tile', 1],
  ['דלית אל-כרמל', 32.69, 'flat', 1], ['טמרה', 32.85, 'flat', 1], ['אום אל-פחם', 32.52, 'flat', 1],
  ['סכנין', 32.86, 'flat', 1], ['דימונה', 31.07, 'flat', 1],
  ['כפר ויתקין', 32.38, 'tile', 2], ['בת שלמה', 32.6, 'tile', 2], ['גבעת עדה', 32.52, 'tile', 2],
  ['בית שערים', 32.7, 'tile', 2], ['בית לחם הגלילית', 32.73, 'tile', 2], ['יסוד המעלה', 33.06, 'tile', 2],
  ['מטולה', 33.28, 'tile', 2], ['עספיא', 32.72, 'flat', 2], ['ריינה', 32.72, 'flat', 2], ['כפר כנא', 32.75, 'flat', 2],
  ['כאבול', 32.87, 'flat', 2], ['כפר מנדא', 32.81, 'flat', 2], ['עראבה', 32.85, 'flat', 2],
  ["מג'ד אל-כרום", 32.92, 'flat', 2], ['דבוריה', 32.69, 'flat', 2],
  ['עומר', 31.27, 'tile', 3], ['להבים', 31.37, 'tile', 3], ['מיתר', 31.33, 'tile', 3], ['כפר שמריהו', 32.19, 'tile', 3],
  ['סביון', 32.05, 'tile', 3], ['כפר ורדים', 33, 'tile', 3], ['כפר יחזקאל', 32.57, 'tile', 3], ['כפר קיש', 32.67, 'tile', 3],
  ['מושב מרחביה', 32.6, 'tile', 3], ['רהט', 31.39, 'flat', 3], ['טייבה', 32.27, 'flat', 3], ['קלנסווה', 32.28, 'flat', 3],
  ['כפר קרע', 32.5, 'flat', 3], ["ג'לג'וליה", 32.15, 'flat', 3], ['כפר קאסם', 32.12, 'flat', 3],
  ['באקה אל-גרביה', 32.42, 'flat', 3], ['שעב', 32.89, 'flat', 3], ['מסעדה', 33.23, 'flat', 3],
]

/** Each place row's built squares, split between places as the app splits them. */
async function placeSquares() {
  const index = JSON.parse(await readFile(ROOT + 'index.json', 'utf8')) as CityIndex
  const squares = new Map<string, BuiltSquare>()
  const rows: PlaceRow[] = []
  for (const cell of index.cells) {
    const data = JSON.parse(await readFile(ROOT + cell + '.json', 'utf8')) as CityCell
    if (data.v === 2) rows.push(...data.p)
    const bytes = decodeRuns(data.r, 3)
    const [south, west] = cell.split('_').map(Number)
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const i = (row * COLS + col) * 3, meta = bytes[i]
      if (!(meta >> 4)) continue
      const x = west * COLS + col, y = south * ROWS + row
      squares.set(`${x}_${y}`, { x, y, ...squareCentre({ cell, row, col }), meta, upper: bytes[i + 1], form: bytes[i + 2] })
    }
  }
  const byPlace = new Map<PlaceRow, BuiltSquare[]>()
  for (const [start, first] of squares) {
    squares.delete(start)
    const component = [first]
    for (const { x, y } of component) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const key = `${x + dx}_${y + dy}`, next = squares.get(key)
      if (!next) continue
      squares.delete(key)
      component.push(next)
    }
    for (const { node, squares: part } of splitByPlace(component, rows)) if (node) byPlace.set(node, part)
  }
  return byPlace
}

const tiles = new Map<string, Uint8Array>()
async function tile(cache: string, x: number, y: number) {
  const key = `${ZOOM}_${y}_${x}`
  const known = tiles.get(key)
  if (known) return known
  const path = join(cache, key + '.jpg')
  let bytes: Uint8Array
  try {
    bytes = await readFile(path)
  } catch {
    const response = await fetch(TILE(x, y), { headers: { 'User-Agent': 'roof-colour-prototype' } })
    if (!response.ok) throw new Error(`Tile ${key}: ${response.status}`)
    bytes = new Uint8Array(await response.arrayBuffer())
    await writeFile(path, bytes)
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  const ycc = new Uint8Array(new JpegDecoder({}).decodeBlock(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length)))
  const rgb = new Uint8Array(ycc.length)
  for (let i = 0; i < ycc.length; i += 3) {
    const [yy, cb, cr] = [ycc[i], ycc[i + 1] - 128, ycc[i + 2] - 128]
    rgb[i] = Math.max(0, Math.min(255, yy + 1.402 * cr))
    rgb[i + 1] = Math.max(0, Math.min(255, yy - .344136 * cb - .714136 * cr))
    rgb[i + 2] = Math.max(0, Math.min(255, yy + 1.772 * cb))
  }
  tiles.set(key, rgb)
  return rgb
}

/** Web-Mercator pixel of a point at ZOOM. */
function pixel(lat: number, lon: number) {
  const n = 2 ** ZOOM * 256, phi = lat * Math.PI / 180
  return { x: (lon + 180) / 360 * n, y: (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2 * n }
}

/** Share of the pixels over the built squares that are reddish ((R − G) / (R + G + B) > .08) and neither dark nor glare. */
async function reddish(cache: string, squares: BuiltSquare[]) {
  let red = 0, all = 0
  for (const { lat, lon } of squares) {
    const a = pixel(lat - .05 / ROWS, lon - .05 / COLS), b = pixel(lat + .05 / ROWS, lon + .05 / COLS)
    for (let y = Math.floor(b.y); y < Math.floor(a.y); y++) for (let x = Math.floor(a.x); x < Math.floor(b.x); x++) {
      const rgb = await tile(cache, Math.floor(x / 256), Math.floor(y / 256))
      const i = ((y % 256) * 256 + x % 256) * 3
      const [r, g, bl] = [rgb[i], rgb[i + 1], rgb[i + 2]], sum = r + g + bl + 1
      all++
      if ((r - g) / sum > .08 && sum / 3 > 80 && sum / 3 < 200) red++
    }
  }
  return all ? red / all : NaN
}

const cache = process.argv[2]
if (!cache) throw new Error('Usage: tsx scripts/city/roofColour.ts <tile cache dir>')
await mkdir(cache, { recursive: true })
const byPlace = await placeSquares()
const table = []
for (const [name, lat, truth, set] of KNOWN) {
  const found = [...byPlace].filter(([row]) => row[5] === name).sort((a, b) => Math.abs(a[0][0] - lat) - Math.abs(b[0][0] - lat))[0]
  if (!found) continue
  const share = await reddish(cache, found[1])
  table.push({ set, name, truth, squares: found[1].length, reddish: share.toFixed(3),
    reads: share > CUT ? 'tile' : 'flat', right: (share > CUT ? 'tile' : 'flat') === truth })
}
console.table(table)
