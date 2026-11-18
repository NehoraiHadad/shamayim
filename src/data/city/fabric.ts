import { hashId, seeded } from '../landmarks/hash'
import { settlementLabel, type House, type Settlement } from '../landmarks/settlement'
import { cityBase } from './cityBase'
import { skyHeight } from './cityHeight'
import { cityHouseFits, type CityZones } from './cityZones'
import { BAND_WIDTH, COLUMN_WIDTH } from './columns'
import { LON_STEP } from './grid'
import type { CityColumns, Column } from './types'

const MIN_BUILT = .12
const ANCHOR = 64 * LON_STEP
// A fixed longitude scale for packing keeps its phase at different observer latitudes.
const PACKING_SPAN = 24 / (111.32 * Math.cos(32 * Math.PI / 180))
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export function hasCityFabric(columns: CityColumns, width: number, centerX: number) {
  const step = COLUMN_WIDTH * width / BAND_WIDTH
  let builtWidth = 0
  for (let col = 0; col < columns.rows[0].length; col++) {
    // Mapped footprints, not zoning alone: where OSM has only landuse (e.g. Umm al-Fahm) the town keeps its cluster.
    if (!columns.rows.some(row => row[col].built >= MIN_BUILT && row[col].measured >= row[col].built / 2)) continue
    const left = Math.max(col * step, centerX - 60)
    const right = Math.min((col + 1) * step, width, centerX + 60)
    builtWidth += Math.max(0, right - left)
  }
  return builtWidth >= 24
}

type Input = CityZones & { columns: CityColumns; ground: (x: number) => number; litShare: number }

/**
 * Seen edge-on across a strip 1.5–2.25 km deep, even 12 % footprint cover leaves no clear sightline: the chance of
 * missing every 20 m building is (1 − c)^(depth / 20 m) ≈ 0. So the silhouette is solid wherever the row is built;
 * the narrow gaps only keep neighbouring blocks legible, a little wider where the cover is thin.
 */
const gapFor = (built: number, roll: number) => built >= .25 ? roll : 1 + 2 * roll

function makeHouse(input: Input, depth: number, x: number, w: number, bin: Column, random: () => number): House | null {
  const baseY = cityBase(input.ground, input.floor, depth, x, w)
  if (baseY === null) return null
  const typical = Math.round(bin.levels)
  // A taller block now and then, never above the tallest building measured in this stretch (p90 upper height).
  const tallest = Math.round(bin.upper / 3.2)
  const storeys = random() < .12 && tallest > typical + 1
    ? clamp(Math.min(tallest, typical + 2 + Math.floor(random() * 3)), 2, 8)
    : clamp(typical + Math.floor(random() * 3) - 1, 2, 6)
  return { x, w, baseY, h: skyHeight(storeys * 3.2), row: depth, lit: random() < input.litShare,
    seed: Math.floor(random() * 1e6) }
}

function rowHouses(input: Input, depth: number, bins: Column[]) {
  const { columns: { west, span }, width } = input
  const perPixel = span / width
  const packingStep = PACKING_SPAN / width
  const binAt = (x: number) => Math.floor(x * BAND_WIDTH / width / COLUMN_WIDTH)
  const houses: House[] = []
  // Restart periodically on fixed grid boundaries so scrolling the band cannot
  // shift the packing of every block to its east.
  for (let anchor = Math.floor(west / ANCHOR); anchor * ANCHOR < west + span; anchor++) {
    let offset = 0
    while (offset + 5 * packingStep <= ANCHOR + 1e-10) {
      const lon = anchor * ANCHOR + offset
      if (lon >= west + span) break
      const col = Math.floor((lon + 1e-10) / LON_STEP)
      const random = seeded(hashId(`${col}:${depth}:${Math.round((lon - col * LON_STEP) / LON_STEP * 1000)}`))
      const w = 5 + 6 * random()
      const x = (lon + w * packingStep / 2 - west) / perPixel
      const left = x - w / 2
      const right = left + w
      const first = binAt(left), last = binAt(right - 1e-8)
      const bin = bins[binAt(x)]
      if (left >= 0 && right <= width && offset + w * packingStep <= ANCHOR &&
        first >= 0 && last < bins.length && bins.slice(first, last + 1).every(b => b.built >= MIN_BUILT)) {
        const roll = random()
        const house = makeHouse(input, depth, x, w, bin, random)
        if (house && cityHouseFits(house, input)) houses.push(house)
        const gap = gapFor(bin.built, roll)
        offset += (w + gap) * packingStep
      } else {
        offset += packingStep
      }
    }
  }
  return houses
}

const priority = [2, 0, 1]

export function composeCity(input: Input): Settlement {
  const { width, centerX, centerY } = input
  const budget = 144 + 36 * Math.max(0, Math.floor((width - 375) / 150))
  const houses = input.columns.rows.flatMap((row, depth) => rowHouses(input, depth, row))
  houses.sort((a, b) => priority[a.row] - priority[b.row] || Math.abs(a.x - centerX) - Math.abs(b.x - centerX))
  const label = settlementLabel(houses.slice(0, budget), centerX, centerY)
  const kept = label.houses.sort((a, b) => a.row - b.row || a.x - b.x)
  const halfWidth = kept.reduce((max, house) => Math.max(max, Math.abs(house.x - centerX) + house.w / 2), 0)
  // Full detail within ±1.5 km of the dot (plan §2: distance changes level of detail, not size).
  const detail = { centerX, half: 1.5 * 15.625 * width / BAND_WIDTH }
  return { style: 'blocks', houses: kept, contours: [], labelTop: label.top, halfWidth, detail }
}
