import { COLS, ROWS, LAT_STEP, LON_STEP, squareCentre, squareOf } from '../../src/data/city/grid'
import type { Square } from '../../src/data/city/types'
import { encodeForm, sizeClass } from '../../src/data/city/form'
import { distribute, slot, squareArea, squaresIn } from './cover'
import type { Footprint, Tags } from './geometry'

type Sample = { area: number; height: number; original: number; urban: boolean; evidence: boolean; big: boolean }
type Pixel = { samples?: Sample[]; centred?: number[]; roof?: number; land?: number }

function roofBits(tags: Tags) {
  const shape = tags['roof:shape'] ?? '', material = tags['roof:material'] ?? ''
  const pitched = ['gabled', 'hipped', 'half-hipped', 'pyramidal', 'gambrel'].includes(shape) ||
    material === 'roof_tiles' || material === 'tile'
  return Number(pitched) | (Number(shape === 'flat' || material === 'concrete') << 1)
}

function heightBytes(samples: Sample[], area: number, field: 'height' | 'original') {
  // v1 uses the lower area-weighted median and the nearest-rank count p90.
  samples.sort((a, b) => a[field] - b[field])
  let cumulative = 0
  const median = samples.find(sample => (cumulative += sample.area) >= area / 2) ?? samples.at(-1)!
  return { levels: Math.min(15, Math.round(median[field] / 3.2)), evidence: median.evidence,
    upper: Math.min(255, Math.round(samples[Math.ceil(samples.length * .9) - 1][field])) }
}

export class Raster {
  cells = new Map<string, Map<number, Pixel>>()

  private pixel(square: Square) {
    let cell = this.cells.get(square.cell)
    if (!cell) this.cells.set(square.cell, cell = new Map())
    const i = slot(square)
    let pixel = cell.get(i)
    if (!pixel) cell.set(i, pixel = {})
    return pixel
  }

  building(shape: Footprint, height: number, tags: Tags = {}, original = height, evidence = false, urban = true) {
    const centre = this.pixel(squareOf(shape.lat, shape.lon))
    ;(centre.centred ??= []).push(shape.area)
    centre.roof = (centre.roof ?? 0) | roofBits(tags)
    distribute(shape, (square, area) => {
      const pixel = this.pixel(square)
      ;(pixel.samples ??= []).push({ area, height, original, evidence, urban, big: shape.area >= 450 })
    })
  }

  landuse(shape: Footprint, inside: (lon: number, lat: number) => boolean) {
    for (const { square, lat, lon } of squaresIn(shape)) {
      if (!inside(lon, lat)) continue
      let hits = 1
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
        if (inside(lon + dx * LON_STEP / 4, lat + dy * LAT_STEP / 4)) hits++
      }
      const pixel = this.pixel(square)
      if (!pixel.samples) pixel.land = Math.max(pixel.land ?? 0, 0.35 * hits / 5)
    }
  }

  bytes(key: string, stride: 2 | 3 = 3,
    compare?: (lat: number, lon: number, urban: boolean, changed: boolean) => void) {
    const bytes = new Uint8Array(COLS * ROWS * stride)
    for (const [i, { land, samples, centred, roof }] of this.cells.get(key) ?? []) {
      const offset = i * stride
      if (!samples) {
        bytes[offset] = Math.round((land ?? 0) * 15) << 4
        continue
      }
      const { lat, lon } = squareCentre({ cell: key, row: Math.floor(i / COLS), col: i % COLS })
      const area = samples.reduce((sum, sample) => sum + sample.area, 0)
      const share = Math.max(1, Math.min(15, Math.round(area / squareArea(lat) * 15)))
      const current = heightBytes(samples, area, 'height')
      bytes[offset] = (share << 4) | current.levels
      bytes[offset + 1] = current.upper
      if (stride === 3) {
        const big = samples.reduce((sum, sample) => sum + (sample.big ? sample.area : 0), 0) / area
        const sorted = centred?.sort((a, b) => a - b)
        // Count median uses the average of the two middle footprint areas for even counts.
        const size = sorted?.length ? sizeClass((sorted[Math.floor((sorted.length - 1) / 2)] +
          sorted[Math.floor(sorted.length / 2)]) / 2) : 0
        bytes[offset + 2] = encodeForm(size, big < .10 ? 0 : big < .40 ? 1 : big < .75 ? 2 : 3,
          roof ?? 0, current.evidence)
      }
      if (compare) {
        const old = heightBytes(samples, area, 'original')
        compare(lat, lon, samples.every(sample => sample.urban), old.levels !== current.levels || old.upper !== current.upper)
      }
    }
    return bytes
  }
}
