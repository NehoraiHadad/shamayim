import { describe, expect, it } from 'vitest'
import s2Fixture from '../../test/fixtures/land-s2-shadmot.json'
import {
  aggregatePatch, bandScalingOf, computeNdsi, computeNdvi, dnToReflectance,
  isValidScl, L2A_SCALE, PB04_OFFSET, type GridBuffers,
} from './s2Math'
import { fetchNearLand, nearAt, type TiffImageLike, type TiffLike } from './satellite'

describe('s2Math radiometry, BOA offset and SCL masking', () => {
  it('resolves BOA_ADD_OFFSET (-1000 DN / -0.1 reflectance) for PB >= 04.00 and raster:bands metadata', () => {
    expect(bandScalingOf({ datetime: '2026-11-15T08:30Z', 's2:processing_baseline': '05.13' }))
      .toEqual({ scale: L2A_SCALE, offset: PB04_OFFSET, nodata: 0 })
    expect(bandScalingOf({ datetime: '2021-06-01T08:30Z', 's2:processing_baseline': '03.00' }))
      .toEqual({ scale: L2A_SCALE, offset: 0, nodata: 0 })
    expect(bandScalingOf({ datetime: '2026-11-15T08:30Z', 'earthsearch:boa_offset_applied': true }))
      .toEqual({ scale: L2A_SCALE, offset: PB04_OFFSET, nodata: 0 })
    expect(bandScalingOf({ datetime: '2021-06-01T08:30Z', 's2:processing_baseline': '03.00' }, { scale: 0.0001, offset: -0.1, nodata: 0 }))
      .toEqual({ scale: 0.0001, offset: -0.1, nodata: 0 })
  })

  it('computes NDVI and NDSI with BOA offset, clamping dark pixels and rejecting nodata', () => {
    const pb04 = { scale: 0.0001, offset: -0.1, nodata: 0 }
    const pb03 = { scale: 0.0001, offset: 0, nodata: 0 }
    // Vegetation: red DN 1400 -> 0.04 reflectance, nir DN 3600 -> 0.26 -> NDVI = 0.22 / 0.30 = 0.7333
    expect(dnToReflectance(0, pb04)).toBeNull()
    expect(dnToReflectance(800, pb04)).toBe(0)
    expect(computeNdvi(1400, 3600, pb04, pb04)).toBeCloseTo(0.22 / 0.30, 5)
    // Without offset (PB 03), the same DNs give 0.14 and 0.36 -> NDVI = 0.22 / 0.50 = 0.44
    expect(computeNdvi(1400, 3600, pb03, pb03)).toBeCloseTo(0.22 / 0.50, 5)
    // Snow: bright green DN 7000 (0.60), dark SWIR11 DN 1500 (0.05) -> NDSI = 0.55 / 0.65 = 0.846
    expect(computeNdsi(7000, 1500, pb04, pb04)).toBeCloseTo(0.55 / 0.65, 5)
    // Bare soil: green DN 2400 (0.14), SWIR11 DN 4000 (0.30) -> NDSI = -0.16 / 0.44 = -0.364
    expect(computeNdsi(2400, 4000, pb04, pb04)).toBeCloseTo(-0.16 / 0.44, 5)
  })

  it('masks out invalid SCL classes and keeps valid ground classes {4, 5, 6, 7, 11}', () => {
    for (const c of [0, 1, 2, 3, 8, 9, 10]) expect(isValidScl(c)).toBe(false)
    for (const c of [4, 5, 6, 7, 11]) expect(isValidScl(c)).toBe(true)

    const out: GridBuffers = {
      size: 1, rgb: new Uint8Array(3),
      ndvi: new Float32Array(1).fill(Number.NaN),
      ndsi: new Float32Array(1).fill(Number.NaN),
      valid: new Float32Array(1),
    }
    const pb04 = { scale: 0.0001, offset: -0.1, nodata: 0 }
    // 2×2 patch: 2 valid vegetation pixels (SCL=4), 1 cloud (SCL=9), 1 cloud shadow (SCL=3)
    aggregatePatch({
      width: 2, height: 2,
      visual: Uint8Array.from([60, 120, 40, 80, 140, 60, 255, 255, 255, 10, 10, 10]),
      red: Uint16Array.from([1400, 1400, 9000, 1050]),
      nir: Uint16Array.from([3600, 3600, 9000, 1050]),
      green: Uint16Array.from([1600, 1600, 9000, 1050]),
      swir: Uint16Array.from([2600, 2600, 9000, 1050]),
      scl: Uint8Array.from([4, 4, 9, 3]),
      redScale: pb04, nirScale: pb04, greenScale: pb04, swirScale: pb04,
    }, out)

    expect(out.valid[0]).toBeCloseTo(0.5, 5)
    expect(Array.from(out.rgb)).toEqual([70, 130, 50])
    expect(out.ndvi[0]).toBeCloseTo(0.22 / 0.30, 4)
    expect(out.ndsi[0]).toBeCloseTo((0.06 - 0.16) / (0.06 + 0.16), 4)
  })

  it('reads recorded Sentinel-2 L2A fixture via fetchNearLand without hitting the network', async () => {
    const f = s2Fixture
    const stacResponse = {
      features: [{
        properties: f.properties,
        assets: {
          visual: { href: 'mock://visual', 'raster:bands': f.bands.visual.rasterBands },
          red: { href: 'mock://red', 'raster:bands': f.bands.red.rasterBands },
          nir: { href: 'mock://nir', 'raster:bands': f.bands.nir.rasterBands },
          green: { href: 'mock://green', 'raster:bands': f.bands.green.rasterBands },
          swir16: { href: 'mock://swir16', 'raster:bands': f.bands.swir16.rasterBands },
          scl: { href: 'mock://scl', 'raster:bands': f.bands.scl.rasterBands },
        },
      }],
    }
    const tileFromBand = (key: keyof typeof f.bands): TiffLike => {
      const band = f.bands[key]
      const isRgb = key === 'visual'
      const img = (w: number): TiffImageLike => ({
        getWidth: () => w,
        getHeight: () => w,
        getBoundingBox: () => [699960, 3490200, 809760, 3600000],
        getGeoKeys: () => ({ ProjectedCSTypeGeoKey: 32636 }),
        async readRasters({ width = f.width, height = f.height }) {
          const out = isRgb ? new Uint8Array(width * height * 3) : new Uint16Array(width * height)
          const ch = isRgb ? 3 : 1
          for (let y = 0; y < height; y++) {
            const sy = Math.floor((y * f.height) / height)
            for (let x = 0; x < width; x++) {
              const sx = Math.floor((x * f.width) / width)
              for (let c = 0; c < ch; c++) out[(y * width + x) * ch + c] = band.data[(sy * f.width + sx) * ch + c]
            }
          }
          return out
        },
      })
      const images = [img(10980), img(5490), img(2745)]
      return { getImageCount: async () => images.length, getImage: async (i) => images[i] }
    }

    const grid = await fetchNearLand(
      { lat: f.lat, lon: f.lon },
      undefined,
      new Date('2026-11-20T12:00:00Z'),
      {
        fetchImpl: (async () => new Response(JSON.stringify(stacResponse), { status: 200 })) as typeof fetch,
        openTiff: async (href) => tileFromBand(href.replace('mock://', '') as keyof typeof f.bands),
      },
    )

    expect(grid).not.toBeNull()
    expect(grid!.source).toBe(`s2:${f.properties.datetime.slice(0, 10)}`)
    expect(grid!.sunElevation).toBeCloseTo(f.properties['view:sun_elevation'], 2)
    const center = nearAt(grid!, f.lat, f.lon)
    expect(center).not.toBeNull()
    expect(center!.valid).toBeGreaterThan(0.5)
    expect(center!.ndvi).toBeGreaterThan(0.05)
    expect(center!.ndvi).toBeLessThan(0.9)
    expect(center!.ndsi).not.toBeNull()
    expect(center!.ndsi!).toBeLessThan(0.2) // November Jordan Valley: no snow
  })
})
