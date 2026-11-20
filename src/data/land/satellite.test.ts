import { describe, expect, it } from 'vitest'
import { nearAt } from './nearGrid'
import { fetchNearLand, REACH_M, STEP_M, type StacItem, type TiffImageLike, type TiffLike } from './satellite'
import { fromUtm, toUtm, utmZoneOf } from './utm'

const PLACE = { lat: 32.3465, lon: 35.5325 }
const ZONE = utmZoneOf(PLACE.lon)
const CENTER = toUtm(PLACE.lat, PLACE.lon, ZONE, false)
const TILE_WEST = 699_960, TILE_NORTH = 3_600_000, TILE_SIZE_M = 109_800

type Band = 'visual' | 'red' | 'nir' | 'scl'

interface MockCogOpts {
  cloudy?: boolean; fail?: boolean
  minE?: number; maxE?: number
  shiftE?: number // origin shift (m) to test band-to-SCL alignment
  clipMaxE?: number // clipped east extent of this COG
  splitE?: number
  rgbEast?: [number, number, number]; rgbWest?: [number, number, number]
  redEast?: number; redWest?: number; nirEast?: number; nirWest?: number
}

function makeGeoTiff(band: Band, opts: MockCogOpts = {}): TiffLike {
  const originW = TILE_WEST + (opts.shiftE ?? 0)
  const tileMaxE = opts.clipMaxE ?? (originW + TILE_SIZE_M)
  const tileW = tileMaxE - originW
  const splitE = opts.splitE ?? CENTER.e
  const img = (res: number): TiffImageLike => {
    const w = Math.max(1, Math.round(tileW / res))
    const h = Math.round(TILE_SIZE_M / res)
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
            const isEast = e >= splitE
            const p = py * width + px
            if (band === 'scl') out[p] = opts.cloudy ? 9 : 4
            else if (band === 'red') out[p] = isEast ? (opts.redEast ?? 2000) : (opts.redWest ?? 1000)
            else if (band === 'nir') out[p] = isEast ? (opts.nirEast ?? 3000) : (opts.nirWest ?? 4000)
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

function makeItem(date: string, tag: string, sunEl?: number, sunAz?: number): StacItem {
  return {
    properties: {
      datetime: `${date}T08:30:00Z`, 's2:processing_baseline': '05.13',
      'earthsearch:boa_offset_applied': true,
      ...(sunEl !== undefined ? { 'view:sun_elevation': sunEl } : {}),
      ...(sunAz !== undefined ? { 'view:sun_azimuth': sunAz } : {}),
    },
    assets: {
      visual: { href: `mock://${tag}/visual` },
      red: { href: `mock://${tag}/red`, 'raster:bands': [{ scale: 0.0001, offset: -0.1, nodata: 0 }] },
      nir: { href: `mock://${tag}/nir`, 'raster:bands': [{ scale: 0.0001, offset: -0.1, nodata: 0 }] },
      scl: { href: `mock://${tag}/scl` },
    },
  }
}

describe('fetchNearLand UTM mosaic, band-to-SCL alignment, multi-date fill and solar geometry', () => {
  it('honors UTM georeferencing 4.5 km off-center and preserves missing sun angles per contributor', async () => {
    const stac = {
      features: [
        makeItem('2026-11-18', 'cloudy', 37, 165),
        makeItem('2026-11-16', 'broken', 37.5, 164),
        makeItem('2026-11-15', 'west', 38.0, 162.0),
        makeItem('2026-11-15', 'east', 39.5, undefined), // east granule omits sunAzimuth!
      ],
    }
    const grid = await fetchNearLand(PLACE, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: (async () => new Response(JSON.stringify(stac), { status: 200 })) as typeof fetch,
      openTiff: async (href) => {
        const [, tag, band] = href.replace('mock://', '').match(/^([^/]+)\/(.+)$/) ?? []
        const b = band as Band
        if (tag === 'cloudy') return makeGeoTiff(b, { cloudy: true })
        if (tag === 'broken') return makeGeoTiff(b, { fail: true })
        return makeGeoTiff(b, tag === 'west' ? { maxE: CENTER.e } : { minE: CENTER.e })
      },
    })
    expect(grid).not.toBeNull()
    expect(grid!.date).toBe('2026-11-15')
    const westCell = nearAt(grid!, fromUtm(CENTER.e - 50, CENTER.n + 4500, ZONE, false).lat, fromUtm(CENTER.e - 50, CENTER.n + 4500, ZONE, false).lon)!
    const eastCell = nearAt(grid!, fromUtm(CENTER.e + 50, CENTER.n + 4500, ZONE, false).lat, fromUtm(CENTER.e + 50, CENTER.n + 4500, ZONE, false).lon)!
    expect(westCell.rgb).toEqual([50, 140, 60])
    expect(westCell.ndvi).toBeCloseTo(0.6, 3)
    expect(westCell.sunElevation).toBe(38.0)
    expect(westCell.sunAzimuth).toBe(162.0)

    expect(eastCell.rgb).toEqual([200, 180, 120])
    expect(eastCell.ndvi).toBeCloseTo(0.2, 3)
    expect(eastCell.sunElevation).toBe(39.5)
    // Must preserve missing sunAzimuth instead of borrowing west granule's 162.0!
    expect(eastCell.sunAzimuth).toBeUndefined()
  })

  it('aligns shifted-origin and clipped-extent spectral bands onto the SCL lattice without stretching', async () => {
    const stac = { features: [makeItem('2026-11-15', 'aligned', 38, 165)] }
    // Red & NIR tiles are shifted by +20 m (half a 40 m pixel) AND clipped east at CENTER.e!
    // Ground east of CENTER.e has SCL=4 and visual RGB, but NO red/NIR coverage -> ndvi must be null east of CENTER.e!
    const grid = await fetchNearLand(PLACE, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: (async () => new Response(JSON.stringify(stac), { status: 200 })) as typeof fetch,
      openTiff: async (href) => {
        const b = href.split('/').pop() as Band
        if (b === 'red' || b === 'nir') return makeGeoTiff(b, { shiftE: 20, clipMaxE: CENTER.e, splitE: CENTER.e - 1000 })
        return makeGeoTiff(b, { splitE: CENTER.e - 1000 })
      },
    })
    expect(grid).not.toBeNull()
    const westPt = fromUtm(CENTER.e - 2000, CENTER.n, ZONE, false)
    const midPt = fromUtm(CENTER.e - 500, CENTER.n, ZONE, false)
    const eastPt = fromUtm(CENTER.e + 1500, CENTER.n, ZONE, false)
    expect(nearAt(grid!, westPt.lat, westPt.lon)!.ndvi).toBeCloseTo(0.6, 3)  // west of splitE
    expect(nearAt(grid!, midPt.lat, midPt.lon)!.ndvi).toBeCloseTo(0.2, 3)    // between splitE and clipMaxE
    // Beyond clipped band extent: visual stays valid, NDVI is cleanly null (not stretched from west!)
    const eastCell = nearAt(grid!, eastPt.lat, eastPt.lon)!
    expect(eastCell.rgb).toEqual([200, 180, 120])
    expect(eastCell.ndvi).toBeNull()
    expect(eastCell.ndviValid).toBe(0)
  })

  it('fills deficient channels and uncovered cells from an older clear acquisition with per-channel dates', async () => {
    // Newest 2026-11-18 only covers a 1 km western edge sliver AND its red/nir COGs fail;
    // older 2026-11-15 covers the whole ±5 km window cleanly with both RGB and NDVI.
    const stac = {
      features: [
        makeItem('2026-11-18', 'sliver', 37, 165),
        makeItem('2026-11-15', 'full', 38, 164),
      ],
    }
    const grid = await fetchNearLand(PLACE, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: (async () => new Response(JSON.stringify(stac), { status: 200 })) as typeof fetch,
      openTiff: async (href) => {
        const [, tag, band] = href.replace('mock://', '').match(/^([^/]+)\/(.+)$/) ?? []
        const b = band as Band
        if (tag === 'sliver') {
          if (b === 'red' || b === 'nir') return makeGeoTiff(b, { fail: true })
          return makeGeoTiff(b, { maxE: CENTER.e - 4000, rgbWest: [11, 22, 33] })
        }
        return makeGeoTiff(b, { rgbWest: [60, 130, 70], rgbEast: [180, 160, 110] })
      },
    })
    expect(grid).not.toBeNull()
    // Inside the newest sliver (4.5 km west): RGB comes from 2026-11-18, NDVI filled from 2026-11-15!
    const sliverPt = fromUtm(CENTER.e - 4500, CENTER.n, ZONE, false)
    const sliverCell = nearAt(grid!, sliverPt.lat, sliverPt.lon)!
    expect(sliverCell.rgb).toEqual([11, 22, 33])
    expect(sliverCell.rgbDate).toBe('2026-11-18')
    expect(sliverCell.ndvi).toBeCloseTo(0.6, 3)
    expect(sliverCell.ndviDate).toBe('2026-11-15')

    // At the center (uncovered by newest sliver): both RGB and NDVI filled from 2026-11-15!
    const centerCell = nearAt(grid!, PLACE.lat, PLACE.lon)!
    expect(centerCell.rgb).toEqual([180, 160, 110])
    expect(centerCell.rgbDate).toBe('2026-11-15')
    expect(centerCell.ndviDate).toBe('2026-11-15')
    expect(REACH_M).toBe(5000)
    expect(STEP_M).toBe(100)
  })
})
