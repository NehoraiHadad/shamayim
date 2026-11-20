import { describe, expect, it } from 'vitest'
import s2Fixture from '../../test/fixtures/land-s2-shadmot.json'
import { makeNearBuffers, nearAt } from './nearGrid'
import { aggregatePatch, type GridTransform } from './s2Aggregate'
import { bandScalingOf, computeNdsi, computeNdvi, dnToReflectance, isValidScl, L2A_SCALE, PB04_OFFSET } from './s2Math'
import { fetchNearLand, REACH_M, STEP_M, type StacItem, type TiffImageLike, type TiffLike } from './satellite'
import { fromUtm, toUtm, utmZoneOf } from './utm'

const UNIT_GRID: GridTransform = { size: 1, originE: 700_000, originN: 3_500_100, stepM: 100, utmZone: 36, utmSouth: false }

describe('s2Math radiometry, BOA offset, SCL masking and georeferencing', () => {
  it('resolves BOA offset for pre-PB04, raw PB04, harmonized Earth Search COGs and rejects ambiguous metadata', () => {
    // Pre-PB04: no offset
    expect(bandScalingOf({ datetime: '2021-06-01T08:30Z', 's2:processing_baseline': '03.00' }))
      .toEqual({ scale: L2A_SCALE, offset: 0, nodata: 0 })
    // Raw unharmonized PB >= 04.00 (no flag or false): -1000 DN (-0.1 reflectance)
    expect(bandScalingOf({ datetime: '2026-11-15T08:30Z', 's2:processing_baseline': '05.13' }))
      .toEqual({ scale: L2A_SCALE, offset: PB04_OFFSET, nodata: 0 })
    expect(bandScalingOf({ datetime: '2026-11-15T08:30Z', 's2:processing_baseline': '05.13', 'earthsearch:boa_offset_applied': false }))
      .toEqual({ scale: L2A_SCALE, offset: PB04_OFFSET, nodata: 0 })
    // Already harmonized Earth Search COG (`boa_offset_applied: true`), EVEN with conflicting `raster:bands` offset -0.1
    expect(bandScalingOf(
      { datetime: '2026-11-15T08:30Z', 's2:processing_baseline': '05.13', 'earthsearch:boa_offset_applied': true },
      { scale: 0.0001, offset: -0.1, nodata: 0 },
    )).toEqual({ scale: 0.0001, offset: 0, nodata: 0 })
    // Contradictory or ambiguous metadata returns null (skip item)
    expect(bandScalingOf(
      { datetime: '2026-11-15T08:30Z', 's2:processing_baseline': '05.13', 'earthsearch:boa_offset_applied': false },
      { scale: 0.0001, offset: 0, nodata: 0 },
    )).toBeNull()
    expect(bandScalingOf({ datetime: '2026-11-15T08:30Z' })).toBeNull()
    expect(bandScalingOf({ datetime: '2021-06-01T08:30Z', 's2:processing_baseline': '03.00' }, { offset: -0.1 })).toBeNull()
  })

  it('matches live harmonized COG values (sea DN 1..21, land 700, 1400/3600 -> 0.44) vs raw PB04 (0.7333)', () => {
    // Live verified item S2B_36SXB_20261115_1_L2A (PB 05.13, boa_offset_applied: true, conflicting offset: -0.1)
    const harm = bandScalingOf(
      { datetime: '2026-11-15T08:31Z', 's2:processing_baseline': '05.13', 'earthsearch:boa_offset_applied': true },
      { scale: 0.0001, offset: -0.1, nodata: 0 },
    )!
    const rawPb04 = bandScalingOf({ datetime: '2026-11-15T08:31Z', 's2:processing_baseline': '05.13' })!

    expect(dnToReflectance(0, harm)).toBeNull()
    expect(dnToReflectance(1, harm)).toBeCloseTo(0.0001, 6)
    expect(dnToReflectance(21, harm)).toBeCloseTo(0.0021, 6)
    expect(dnToReflectance(700, harm)).toBeCloseTo(0.07, 5)
    expect(computeNdvi(1400, 3600, harm, harm)).toBeCloseTo(0.44, 5)
    expect(computeNdvi(1400, 3600, rawPb04, rawPb04)).toBeCloseTo(0.22 / 0.30, 5)
    expect(dnToReflectance(800, rawPb04)).toBe(0)
    expect(computeNdsi(7000, 1500, rawPb04, rawPb04)).toBeCloseTo(0.55 / 0.65, 5)
  })

  it('tracks per-measurement support independently, separates black RGB, band nodata, mixed snow and open water', () => {
    for (const c of [0, 1, 2, 3, 8, 9, 10]) expect(isValidScl(c)).toBe(false)
    for (const c of [4, 5, 6, 7, 11]) expect(isValidScl(c)).toBe(true)

    // Case 1: black RGB patch still preserves valid NDVI and mixed snow fraction (50% SCL 11 / 50% SCL 5)
    const out1 = makeNearBuffers(1)
    const harm = { scale: 0.0001, offset: 0, nodata: 0 }
    aggregatePatch({
      width: 2, height: 2, west: 700_000, north: 3_500_100, resX: 50, resY: 50, zone: 36, south: false, acqId: 0,
      visual: new Uint8Array(12), // all black RGB
      red: Uint16Array.from([1400, 1400, 9000, 1050]),
      nir: Uint16Array.from([3600, 3600, 9000, 1050]),
      scl: Uint8Array.from([11, 5, 9, 3]), // 1 snow, 1 bare, 1 cloud, 1 shadow
      redScale: harm, nirScale: harm,
    }, UNIT_GRID, out1)
    expect(out1.valid[0]).toBeCloseTo(0.5, 5)
    expect(out1.rgbValid[0]).toBe(0)
    expect(out1.ndviValid[0]).toBeCloseTo(0.5, 5)
    expect(out1.ndvi[0]).toBeCloseTo(0.44, 4)
    expect(out1.snow[0]).toBeCloseTo(0.5, 5)

    // Case 2: SCL-valid pixels with red=0 nodata track ndviValid separately from valid/rgbValid
    const out2 = makeNearBuffers(1)
    aggregatePatch({
      width: 2, height: 2, west: 700_000, north: 3_500_100, resX: 50, resY: 50, zone: 36, south: false, acqId: 0,
      visual: Uint8Array.from([80, 120, 60, 80, 120, 60, 80, 120, 60, 80, 120, 60]),
      red: Uint16Array.from([1400, 0, 0, 0]),
      nir: Uint16Array.from([3600, 3600, 3600, 3600]),
      scl: Uint8Array.from([4, 4, 4, 4]),
      redScale: harm, nirScale: harm,
    }, UNIT_GRID, out2)
    expect(out2.valid[0]).toBe(1)
    expect(out2.rgbValid[0]).toBe(1)
    expect(out2.ndviValid[0]).toBeCloseTo(0.25, 5)

    // Case 3: Open water (SCL 6) with high green/SWIR NDSI still yields snow = 0
    const out3 = makeNearBuffers(1)
    aggregatePatch({
      width: 2, height: 2, west: 700_000, north: 3_500_100, resX: 50, resY: 50, zone: 36, south: false, acqId: 0,
      green: Uint16Array.from([1200, 1200, 1200, 1200]),
      swir: Uint16Array.from([100, 100, 100, 100]),
      scl: Uint8Array.from([6, 6, 6, 6]),
      greenScale: harm, swirScale: harm,
    }, UNIT_GRID, out3)
    expect(out3.ndsi[0]).toBeGreaterThan(0.8)
    expect(out3.snow[0]).toBe(0)
  })

  it('decodes the recorded conflicting-metadata Shadmot fixture accurately without double-subtracting BOA offset', () => {
    const f = s2Fixture
    const redScale = bandScalingOf(f.properties, f.bands.red.rasterBands[0])!
    const nirScale = bandScalingOf(f.properties, f.bands.nir.rasterBands[0])!
    expect(redScale.offset).toBe(0) // boa_offset_applied: true overrides raster:bands offset -0.1
    // Find a pixel with red DN < 1000 (which double-subtraction previously clamped to 0, inflating NDVI to 1.0)
    const idx = f.bands.red.data.findIndex((dn, i) => dn > 0 && dn < 1000 && f.bands.scl.data[i] === 5)
    expect(idx).toBeGreaterThanOrEqual(0)
    const r = f.bands.red.data[idx], n = f.bands.nir.data[idx]
    expect(dnToReflectance(r, redScale)).toBeCloseTo(r * 0.0001, 6)
    expect(computeNdvi(r, n, redScale, nirScale)).toBeCloseTo((n - r) / (n + r), 5)
  })

  it('honors UTM georeferencing across a cell boundary 4.5 km off-center, falls back past cloudy/failed dates and preserves per-granule sun angles', async () => {
    const place = { lat: 32.3465, lon: 35.5325 }
    const zone = utmZoneOf(place.lon)
    const center = toUtm(place.lat, place.lon, zone, false)
    const tileWest = 699_960, tileNorth = 3_600_000, tileSizeM = 109_800
    const res = 40, imgW = Math.round(tileSizeM / res) // 2745
    const splitE = center.e // sharp boundary right along center UTM easting

    const makeGeoTiff = (
      band: 'visual' | 'red' | 'nir' | 'scl',
      opts: { cloudy?: boolean; fail?: boolean; eastOnly?: boolean; westOnly?: boolean } = {},
    ): TiffLike => {
      const img = (w: number): TiffImageLike => ({
        getWidth: () => w, getHeight: () => w,
        getBoundingBox: () => [tileWest, tileNorth - tileSizeM, tileWest + tileSizeM, tileNorth],
        getGeoKeys: () => ({ ProjectedCSTypeGeoKey: 32600 + zone }),
        async readRasters({ window: [x0, y0, x1, y1], width = x1 - x0, height = y1 - y0 }) {
          if (opts.fail) throw new Error('COG read error')
          const isRgb = band === 'visual'
          const out = isRgb ? new Uint8Array(width * height * 3) : band === 'scl' ? new Uint8Array(width * height) : new Uint16Array(width * height)
          const rX = ((x1 - x0) * (tileSizeM / w)) / width
          for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
              const e = tileWest + x0 * (tileSizeM / w) + (px + 0.5) * rX
              const isEast = e >= splitE
              if ((opts.eastOnly && !isEast) || (opts.westOnly && isEast)) continue
              const p = py * width + px
              if (band === 'scl') out[p] = opts.cloudy ? 9 : 4
              else if (band === 'red') out[p] = isEast ? 2000 : 1000
              else if (band === 'nir') out[p] = isEast ? 3000 : 4000
              else { const o = p * 3; out[o] = isEast ? 200 : 50; out[o + 1] = isEast ? 180 : 140; out[o + 2] = isEast ? 120 : 60 }
            }
          }
          return out
        },
      })
      const images = [img(imgW * 4), img(imgW * 2), img(imgW)]
      return { getImageCount: async () => images.length, getImage: async (i) => images[i] }
    }

    const item = (date: string, tag: string, sunEl: number, sunAz: number): StacItem => ({
      properties: {
        datetime: `${date}T08:30:00Z`, 's2:processing_baseline': '05.13',
        'earthsearch:boa_offset_applied': true, 'view:sun_elevation': sunEl, 'view:sun_azimuth': sunAz,
      },
      assets: {
        visual: { href: `mock://${tag}/visual` },
        red: { href: `mock://${tag}/red`, 'raster:bands': [{ scale: 0.0001, offset: -0.1, nodata: 0 }] },
        nir: { href: `mock://${tag}/nir`, 'raster:bands': [{ scale: 0.0001, offset: -0.1, nodata: 0 }] },
        scl: { href: `mock://${tag}/scl` },
      },
    })

    // Newest date 2026-11-18 is completely cloudy; 2026-11-16 fails; 2026-11-15 has two adjacent granules with different sun angles!
    let requestedUrl = ''
    const stac = {
      features: [
        item('2026-11-18', 'cloudy', 37, 165),
        item('2026-11-16', 'broken', 37.5, 164),
        item('2026-11-15', 'west', 38.0, 162.0),
        item('2026-11-15', 'east', 39.5, 166.5),
      ],
    }

    const grid = await fetchNearLand(place, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: (async (u) => { requestedUrl = String(u); return new Response(JSON.stringify(stac), { status: 200 }) }) as typeof fetch,
      openTiff: async (href) => {
        const [, tag, band] = href.replace('mock://', '').match(/^([^/]+)\/(.+)$/) ?? []
        const b = band as 'visual' | 'red' | 'nir' | 'scl'
        if (tag === 'cloudy') return makeGeoTiff(b, { cloudy: true })
        if (tag === 'broken') return makeGeoTiff(b, { fail: true })
        if (tag === 'west') return makeGeoTiff(b, { westOnly: true })
        return makeGeoTiff(b, { eastOnly: true })
      },
    })

    expect(grid).not.toBeNull()
    expect(grid!.date).toBe('2026-11-15')
    // STAC bbox covers the UTM window corners (wider than a naive fixed ±0.05° box at non-zero latitude)
    expect(requestedUrl).toContain('bbox=')

    // Sample 4.5 km north, 50 m west vs 50 m east of UTM splitE (old lat/lon approx was off by ~107 m!)
    const westPt = fromUtm(splitE - 50, center.n + 4500, zone, false)
    const eastPt = fromUtm(splitE + 50, center.n + 4500, zone, false)
    const westCell = nearAt(grid!, westPt.lat, westPt.lon)!
    const eastCell = nearAt(grid!, eastPt.lat, eastPt.lon)!
    expect(westCell.rgb).toEqual([50, 140, 60])
    expect(westCell.ndvi).toBeCloseTo(0.6, 3)
    expect(westCell.sunElevation).toBe(38.0)
    expect(westCell.sunAzimuth).toBe(162.0)

    expect(eastCell.rgb).toEqual([200, 180, 120])
    expect(eastCell.ndvi).toBeCloseTo(0.2, 3)
    expect(eastCell.sunElevation).toBe(39.5)
    expect(eastCell.sunAzimuth).toBe(166.5)

    // When all dates are cloudy/unusable, fetchNearLand returns null (never caches an empty grid)
    const empty = await fetchNearLand(place, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: (async () => new Response(JSON.stringify({ features: [item('2026-11-18', 'cloudy', 37, 165)] }), { status: 200 })) as typeof fetch,
      openTiff: async (href) => makeGeoTiff(href.split('/').pop() as 'visual' | 'red' | 'nir' | 'scl', { cloudy: true }),
    })
    expect(empty).toBeNull()
    expect(REACH_M).toBe(5000)
    expect(STEP_M).toBe(100)
  })
})
