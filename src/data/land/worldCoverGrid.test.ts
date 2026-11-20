import { describe, expect, it } from 'vitest'
import { destination, FAR_KM } from '../terrain/panorama'
import { encodeLand } from './grid'
import {
  aggregateWorldCoverTile, bboxCoveredBy, CELLS_PER_DEG, coarseCoverFromJson, footprintBbox,
  WORLDCOVER_STEP_DEG, type Bbox,
} from './worldCoverGrid'

describe('worldCoverGrid spherical footprint and area-weighted aggregation', () => {
  it('bounds every 60 km spherical destination ray including cell and 3° tile boundary tips', () => {
    // Regression: 48.8608° N linear 111.32 km/deg snapped north to 49.4000°, missing destination north tip 49.400393°
    const places = [
      { lat: 48.8608, lon: 2.35 },   // north tip 49.400393° crosses 49.40 cell boundary
      { lat: 50.4605, lon: 2.18 },   // north tip > 51.00° crosses 3° tile boundary (N48 -> N51) & east > 3.00°
      { lat: 48.8604070353, lon: 2.35 }, // north tip lands right on 49.4000° cell line (half-open guard!)
    ]
    for (const place of places) {
      const bbox = footprintBbox(place, FAR_KM)
      const [south, west, north, east] = bbox
      const rows = Math.round((north - south) * CELLS_PER_DEG)
      const cols = Math.round((east - west) * CELLS_PER_DEG)
      const cover = coarseCoverFromJson({
        v: 1, bbox, stepDeg: WORLDCOVER_STEP_DEG, rows, cols, r: encodeLand(new Uint8Array(rows * cols).fill(5)),
      })
      for (let az = 0; az < 360; az += 2) {
        const tip = destination(place.lat, place.lon, FAR_KM, az)
        expect(tip.lat).toBeGreaterThanOrEqual(south)
        expect(tip.lat).toBeLessThan(north)
        expect(tip.lon).toBeGreaterThanOrEqual(west)
        expect(tip.lon).toBeLessThan(east)
        expect(cover.coverAt(tip.lat, tip.lon)).toBe(5)
      }
    }
    // Israel regional coarse.json extent still covers Shadmot, Haifa, Eilat and Metula footprints
    const regional: Bbox = [28.8, 33.4, 34.0, 36.8]
    for (const il of [{ lat: 32.3465, lon: 35.5325 }, { lat: 33.279, lon: 35.578 }, { lat: 29.558, lon: 34.948 }]) {
      expect(bboxCoveredBy(footprintBbox(il, FAR_KM), regional)).toBe(true)
    }
  })

  it('weights 562×562 overview pixels by exact overlap area for valid threshold and class selection', () => {
    // At 562×562 over a 3°×3° tile (pxPerDeg = 562/3 ≈ 187.3333), each 0.01° cell spans 1.8733×1.8733 px.
    // Pick a cell whose horizontal pixel range [cx0, cx1] straddles 3 source cols (e.g. col 1: [1.8733, 3.7467])
    // and vertical range [cy0, cy1] spans 2 source rows ([0, 1.8733]): 6 touched pixels total.
    // Making ONLY the 2 full-width middle-column pixels (gx=2, gy=0..1) valid gives 1/1.8733 = 53.38% area,
    // which previously failed whole-pixel voting (2/6 = 33.3% -> nodata 0).
    const dim = 562, pxPerDeg = dim / 3
    const tLat = 48, tLon = 0
    const bbox: Bbox = [50.98, 0.00, 51.00, 0.02] // 2×2 cells at NW corner of N48E000
    const cols = 2, rows = 2
    const winW = 5, winH = 5
    // Cell (row=0, col=1) covers lon [0.01, 0.02] -> cx in [1.8733, 3.7467] (overlaps gx=1: 0.1267, gx=2: 1.0, gx=3: 0.7467)
    // and lat [50.99, 51.00] -> cy in [0, 1.8733] (overlaps gy=0: 1.0, gy=1: 0.8733).
    const rawNodataMix = new Uint8Array(winW * winH) // all 0 (nodata)
    rawNodataMix[2] = 50 // row 0, gx=2 -> built (class 5)
    rawNodataMix[winW + 2] = 50 // row 1, gx=2 -> built (class 5) => 53.38% of cell area!
    const gridA = new Uint8Array(rows * cols)
    aggregateWorldCoverTile(rawNodataMix, winW, winH, 0, 0, pxPerDeg, pxPerDeg, tLat, tLon, bbox, bbox, gridA, cols)
    expect(gridA[1]).toBe(5)

    // Same 6 touched pixels, now 2 middle-column pixels are forest (10 -> class 1, 53.38% area)
    // and 4 edge-sliver pixels are built (50 -> class 5, 46.62% area): area weighting picks forest (1)!
    const rawClassFlip = new Uint8Array(winW * winH).fill(50)
    rawClassFlip[2] = 10
    rawClassFlip[winW + 2] = 10
    const gridB = new Uint8Array(rows * cols)
    aggregateWorldCoverTile(rawClassFlip, winW, winH, 0, 0, pxPerDeg, pxPerDeg, tLat, tLon, bbox, bbox, gridB, cols)
    expect(gridB[1]).toBe(1)

    // Verify stale data in a slice is cleared when the new window decodes to nodata
    const gridStale = new Uint8Array(rows * cols).fill(4)
    aggregateWorldCoverTile(new Uint8Array(winW * winH), winW, winH, 0, 0, pxPerDeg, pxPerDeg, tLat, tLon, bbox, bbox, gridStale, cols)
    expect(Array.from(gridStale)).toEqual([0, 0, 0, 0])
  })
})
