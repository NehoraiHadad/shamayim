import { describe, expect, it } from 'vitest'
import { nearAt } from './nearGrid'
import { fetchNearLand, REACH_M, STEP_M, type StacItem, type TiffImageLike, type TiffLike } from './satellite'
import { fromUtm, toUtm, utmZoneOf } from './utm'

const PLACE = { lat: 32.3465, lon: 35.5325 }, ZONE = utmZoneOf(PLACE.lon), CENTER = toUtm(PLACE.lat, PLACE.lon, ZONE, false)
const TILE_WEST = 699_960, TILE_NORTH = 3_600_000, TILE_SIZE_M = 109_800
type Band = 'visual' | 'red' | 'nir' | 'scl'

interface MockCogOpts {
  cloudy?: boolean; fail?: boolean; minE?: number; maxE?: number; shiftE?: number; clipMaxE?: number; splitE?: number
  rgbEast?: [number, number, number]; rgbWest?: [number, number, number]
}

function makeGeoTiff(band: Band, opts: MockCogOpts = {}): TiffLike {
  const originW = TILE_WEST + (opts.shiftE ?? 0), tileW = (opts.clipMaxE ?? (originW + TILE_SIZE_M)) - originW
  const splitE = opts.splitE ?? CENTER.e
  const img = (res: number): TiffImageLike => {
    const w = Math.max(1, Math.round(tileW / res)), h = Math.round(TILE_SIZE_M / res)
    return {
      getWidth: () => w, getHeight: () => h,
      getBoundingBox: () => [originW, TILE_NORTH - TILE_SIZE_M, originW + w * res, TILE_NORTH],
      getGeoKeys: () => ({ ProjectedCSTypeGeoKey: 32600 + ZONE }),
      async readRasters({ window: [x0, y0, x1, y1], width = x1 - x0, height = y1 - y0 }) {
        if (opts.fail) throw new Error('COG read error')
        const out = band === 'visual' ? new Uint8Array(width * height * 3)
          : band === 'scl' ? new Uint8Array(width * height) : new Uint16Array(width * height)
        for (let py = 0; py < height; py++) {
          for (let px = 0; px < width; px++) {
            const e = originW + (x0 + px + 0.5) * res
            if ((opts.minE !== undefined && e < opts.minE) || (opts.maxE !== undefined && e >= opts.maxE)) continue
            const isEast = e >= splitE, p = py * width + px
            if (band === 'scl') out[p] = opts.cloudy ? 9 : 4
            else if (band === 'red') out[p] = isEast ? 2000 : 1000
            else if (band === 'nir') out[p] = isEast ? 3000 : 4000
            else out.set(isEast ? (opts.rgbEast ?? [200, 180, 120]) : (opts.rgbWest ?? [50, 140, 60]), p * 3)
          }
        }
        return out
      },
    }
  }
  const images = [img(10), img(20), img(40)]
  return { getImageCount: async () => images.length, getImage: async (i) => images[i] }
}

const makeItem = (date: string, tag: string, sunEl?: number, sunAz?: number): StacItem => ({
  properties: {
    datetime: `${date}T08:30:00Z`, 's2:processing_baseline': '05.13', 'earthsearch:boa_offset_applied': true,
    ...(sunEl !== undefined ? { 'view:sun_elevation': sunEl } : {}),
    ...(sunAz !== undefined ? { 'view:sun_azimuth': sunAz } : {}),
  },
  assets: {
    visual: { href: `mock://${tag}/visual` },
    red: { href: `mock://${tag}/red`, 'raster:bands': [{ scale: 0.0001, offset: -0.1, nodata: 0 }] },
    nir: { href: `mock://${tag}/nir`, 'raster:bands': [{ scale: 0.0001, offset: -0.1, nodata: 0 }] },
    scl: { href: `mock://${tag}/scl` },
  },
})

const mockFetch = (features: StacItem[]) => (async () => new Response(JSON.stringify({ features }), { status: 200 })) as typeof fetch
const pt = (dE: number, dN: number) => fromUtm(CENTER.e + dE, CENTER.n + dN, ZONE, false)

describe('fetchNearLand UTM mosaic, band-to-SCL alignment, multi-date fill and solar geometry', () => {
  it('honors UTM georeferencing 4.5 km off-center and preserves missing sun angles per contributor', async () => {
    const features = [
      makeItem('2026-11-18', 'cloudy', 37, 165), makeItem('2026-11-16', 'broken', 37.5, 164),
      makeItem('2026-11-15', 'west', 38.0, 162.0), makeItem('2026-11-15', 'east', 39.5, undefined),
    ]
    const grid = (await fetchNearLand(PLACE, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: mockFetch(features),
      openTiff: async (href) => {
        const [, tag, band] = href.replace('mock://', '').match(/^([^/]+)\/(.+)$/) ?? []
        const b = band as Band
        if (tag === 'cloudy') return makeGeoTiff(b, { cloudy: true })
        if (tag === 'broken') return makeGeoTiff(b, { fail: true })
        return makeGeoTiff(b, tag === 'west' ? { maxE: CENTER.e } : { minE: CENTER.e })
      },
    }))!
    expect(grid.date).toBe('2026-11-15')
    const w = pt(-50, 4500), e = pt(50, 4500)
    const westCell = nearAt(grid, w.lat, w.lon)!, eastCell = nearAt(grid, e.lat, e.lon)!
    expect(westCell.rgb).toEqual([50, 140, 60]); expect(westCell.ndvi).toBeCloseTo(0.6, 3)
    expect([westCell.sunElevation, westCell.sunAzimuth]).toEqual([38.0, 162.0])
    expect(eastCell.rgb).toEqual([200, 180, 120]); expect(eastCell.ndvi).toBeCloseTo(0.2, 3)
    expect(eastCell.sunElevation).toBe(39.5)
    expect(eastCell.sunAzimuth).toBeUndefined() // must NOT borrow west granule's 162.0!
  })

  it('aligns shifted-origin and clipped-extent bands without stretching, including nonzero nodata DN on one clipped band', async () => {
    const item = makeItem('2026-11-15', 'aligned', 38, 165)
    item.assets.red!['raster:bands'] = [{ scale: 0.0001, offset: -0.1, nodata: 65535 }]
    const grid = (await fetchNearLand(PLACE, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: mockFetch([item]),
      openTiff: async (href) => {
        const b = href.split('/').pop() as Band
        // Only red is clipped at CENTER.e (with nonzero nodata 65535); NIR covers the entire footprint!
        if (b === 'red') return makeGeoTiff(b, { shiftE: 20, clipMaxE: CENTER.e, splitE: CENTER.e - 1000 })
        if (b === 'nir') return makeGeoTiff(b, { shiftE: 20, splitE: CENTER.e - 1000 })
        return makeGeoTiff(b, { splitE: CENTER.e - 1000 })
      },
    }))!
    const w = pt(-2000, 0), m = pt(-500, 0), e = pt(1500, 0)
    expect(nearAt(grid, w.lat, w.lon)!.ndvi).toBeCloseTo(0.6, 3)
    expect(nearAt(grid, m.lat, m.lon)!.ndvi).toBeCloseTo(0.2, 3)
    const eastCell = nearAt(grid, e.lat, e.lon)!
    expect(eastCell.rgb).toEqual([200, 180, 120])
    // Clipped red must NOT fill 0 (which with nodata=65535 would produce bogus NDVI = 1.0)!
    expect(eastCell.ndvi).toBeNull()
    expect(eastCell.ndviValid).toBe(0)
  })

  it('fills deficient channels and uncovered cells from an older clear acquisition with per-channel dates', async () => {
    const grid = (await fetchNearLand(PLACE, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: mockFetch([makeItem('2026-11-18', 'sliver', 37, 165), makeItem('2026-11-15', 'full', 38, 164)]),
      openTiff: async (href) => {
        const [, tag, band] = href.replace('mock://', '').match(/^([^/]+)\/(.+)$/) ?? []
        const b = band as Band
        if (tag === 'sliver') {
          if (b === 'red' || b === 'nir') return makeGeoTiff(b, { fail: true })
          return makeGeoTiff(b, { maxE: CENTER.e - 4000, rgbWest: [11, 22, 33] })
        }
        return makeGeoTiff(b, { rgbWest: [60, 130, 70], rgbEast: [180, 160, 110] })
      },
    }))!
    const sl = pt(-4500, 0), sliverCell = nearAt(grid, sl.lat, sl.lon)!
    expect(sliverCell.rgb).toEqual([11, 22, 33]); expect(sliverCell.rgbDate).toBe('2026-11-18')
    expect(sliverCell.ndvi).toBeCloseTo(0.6, 3); expect(sliverCell.ndviDate).toBe('2026-11-15')

    const centerCell = nearAt(grid, PLACE.lat, PLACE.lon)!
    expect(centerCell.rgb).toEqual([180, 160, 110])
    expect([centerCell.rgbDate, centerCell.ndviDate]).toEqual(['2026-11-15', '2026-11-15'])
    expect([REACH_M, STEP_M]).toEqual([5000, 100])
  })
})
