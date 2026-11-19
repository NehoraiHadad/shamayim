import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { anglePx, horizonSlope, RELIEFS } from './angleScale'
import { decodeTerrarium, demFromTiles, tileXY } from './dem'
import {
  apparentAngle, computePanorama, destination, horizonRay, packPanorama, rayAzimuth, RAYS, unpackPanorama, type HeightAt,
} from './panorama'
import { terrainForPlace, terrainFromPanorama } from './terrain'

const DEG = 180 / Math.PI

/** A cone-shaped hill `peakM` high, `radiusKm` wide at its foot, centred `distanceKm` away at `azimuth`; flat `groundM` around. */
function hill(peakM: number, distanceKm: number, azimuth: number, radiusKm = 1, groundM = 0): HeightAt {
  const cx = distanceKm * Math.sin(azimuth / DEG)
  const cy = distanceKm * Math.cos(azimuth / DEG)
  return (d, az) => {
    const dx = d * Math.sin(az / DEG) - cx
    const dy = d * Math.cos(az / DEG) - cy
    return groundM + Math.max(0, peakM - groundM) * Math.max(0, 1 - Math.hypot(dx, dy) / radiusKm)
  }
}

describe('apparent angle', () => {
  it('is the plain slope angle near by', () => {
    expect(apparentAngle(102, 1, 2)).toBeCloseTo(Math.atan(100 / 1000) * DEG, 2)
  })

  it('drops far hills under the curve of the earth (less a little refraction)', () => {
    // 50 km away the ground has fallen ~196 m * 0.87 ≈ 171 m below a level line of sight.
    expect(apparentAngle(171, 50, 0)).toBeCloseTo(0, 1)
    expect(apparentAngle(0, 50, 0)).toBeLessThan(-0.15)
    // The same hill closer stands higher.
    expect(apparentAngle(500, 20, 0)).toBeGreaterThan(apparentAngle(500, 40, 0))
  })
})

describe('horizon rays', () => {
  it('finds a single hill at its bearing and true angle', () => {
    const terrain = hill(600, 10, 90)
    const east = horizonRay(90, terrain, 2)
    expect(east.far.distance).toBeCloseTo(10, 0)
    expect(east.far.elevation).toBeGreaterThan(560)
    // 598 m above the eye at 10 km, less ~6.8 m of curvature: atan(0.0591) ≈ 3.38°.
    expect(east.far.angle).toBeCloseTo(Math.atan((598 - 6.8) / 10_000) * DEG, 1)
    // Looking west there is nothing: the flat ground falls away below eye level.
    expect(horizonRay(270, terrain, 2).far.angle).toBeLessThan(0)
  })

  it('keeps a near ridge apart from the far horizon behind it', () => {
    const near = hill(150, 3, 180, 0.8)
    const far = hill(2500, 30, 180, 4)
    const ray = horizonRay(180, (d, az) => Math.max(near(d, az), far(d, az)), 0)
    expect(ray.near.distance).toBeLessThan(5)
    expect(ray.far.distance).toBeGreaterThan(25)
    expect(ray.far.angle).toBeGreaterThan(ray.near.angle)
  })

  it('lets curvature hide a far hill that would show on a flat earth', () => {
    // 200 m at 55 km: 0.21° on a flat earth, but ~205 m of drop puts it at eye level, under a 15 m knoll at 5 km (0.15°).
    const terrain: HeightAt = (d, az) => Math.max(hill(200, 55, 90, 3)(d, az), hill(15, 5, 90, 0.5)(d, az))
    const ray = horizonRay(90, terrain, 0)
    expect(Math.atan(200 / 55_000) * DEG).toBeGreaterThan(ray.far.angle)
    expect(ray.far.distance).toBeLessThan(6)
  })
})

describe('panorama', () => {
  it('spans the scene from west-north-west through south to east-north-east, like the sky', () => {
    expect(rayAzimuth(0)).toBe(305)
    expect(rayAzimuth((RAYS - 1) / 2)).toBeCloseTo(180)
    expect(rayAzimuth(RAYS - 1)).toBeCloseTo(55)
  })

  it('packs and unpacks without losing the shape', () => {
    const p = computePanorama(hill(800, 12, 100, 3), 0, 21)
    const back = unpackPanorama(JSON.parse(JSON.stringify(packPanorama(p))))!
    expect(back.rays).toHaveLength(21)
    back.rays.forEach((ray, i) => expect(ray.far.angle).toBeCloseTo(p.rays[i].far.angle, 1))
    expect(unpackPanorama({ v: 1, eyeM: 0, groundM: 0, rays: [[1, 2]] })).toBeNull()
  })

  it('moves along a bearing on the globe', () => {
    const east = destination(32, 35, 10, 90)
    expect(east.lat).toBeCloseTo(32, 2)
    expect((east.lon - 35) * 111.32 * Math.cos(32 / DEG)).toBeCloseTo(10, 1)
  })
})

describe('scene terrain from a panorama', () => {
  // A valley 175 m below sea level with a 750 m ridge 10 km east (the Gilead from the Jordan Valley).
  const valley = computePanorama((d, az) => Math.max(-175, hill(750, 11, 90, 5, -175)(d, az)), -175)
  const terrain = terrainFromPanorama(valley)

  it('draws each ridge at its angle on the sky’s own scale above eye level', () => {
    const east = valley.rays.findIndex((ray) => Math.abs(ray.azimuth - 90) < 1)
    // Stored west-north-west first; on screen east is on the left, so the ray stands at the mirrored index.
    const onScreen = RAYS - 1 - east
    const [x, y] = terrain.farPoints[onScreen]
    expect(x).toBeCloseTo(375 * onScreen / (RAYS - 1), 0)
    expect(x).toBeLessThan(375 / 2)
    expect(terrain.horizonY - y).toBeCloseTo(anglePx(valley.rays[east].far.angle), 0)
    expect(valley.rays[east].far.angle).toBeGreaterThan(4)
  })

  it('puts eye level under the village and the sea line on the slopes below sea level', () => {
    expect(terrain.nearPoints[Math.floor(terrain.nearPoints.length / 2)][1]).toBeCloseTo(96, 0)
    expect(terrain.seaInView).toBe(false)
    expect(terrain.seaY).toBeLessThan(terrain.horizonY)
    expect(terrain.seaY).toBeGreaterThan(terrain.farPoints.reduce((top, [, y]) => Math.min(top, y), 128))
  })

  it('finds the sea where the water in view is the sea, on its side', () => {
    // A coast: sea (0 m) west of the place, land rising gently to the east; the water mask says the same.
    const sea = (west: boolean) => ({ bodies: [{ name: 'ים', kind: 'sea' as const }],
      bodyAlong: (_: number, az: number) => (Math.sin(az / DEG) < 0) === west ? 0 : null })
    const coast = computePanorama((d, az) => (Math.sin(az / DEG) < 0 ? 0 : 15 + 20 * d), 15)
    const t = terrainFromPanorama(coast, { water: sea(true) })
    expect({ visible: t.seaInView, side: t.seaSide }).toEqual({ visible: true, side: 'west' })
    expect(t.water!.map((span) => span.name)).toEqual(['ים'])
    // West is on the right of the true view facing south.
    expect(t.water![0].from).toBeGreaterThan(375 / 2)
    const mirrored = terrainFromPanorama(computePanorama((d, az) => (Math.sin(az / DEG) > 0 ? 0 : 15 + 20 * d), 15),
      { water: sea(false) })
    expect(mirrored.seaSide).toBe('east')
    // Without the mask, no water is guessed from the heights.
    expect(terrainFromPanorama(coast).seaInView).toBe(false)
  })

  it('lays snow down the slopes to the snow line, and none on ridges below it', () => {
    const east = RAYS - 1 - valley.rays.findIndex((ray) => Math.abs(ray.azimuth - 90) < 1)
    const far = terrain.snowEdge!('far', 400)
    const crestY = terrain.farPoints[east][1]
    expect(far[east][1]).toBeGreaterThan(crestY)
    expect(terrain.snowEdge!('far', 2000)[east][1]).toBeLessThan(crestY)
  })

  it('is used whenever a panorama is known, Shadmot included', () => {
    expect(terrainForPlace(valley, 'loading').horizonY).toBe(terrain.horizonY)
  })
})

describe('angle scale', () => {
  it('stretches low angles the same for land and sky, and keeps them in order', () => {
    expect(horizonSlope(RELIEFS.true)).toBeCloseTo(1.5)
    expect(horizonSlope(RELIEFS.high)).toBeGreaterThan(9)
    const ys = [-5, -1, 0, 1, 4, 10, 30, 60, 90].map((a) => anglePx(a))
    expect(ys.every((y, i) => i === 0 || y > ys[i - 1])).toBe(true)
    expect(anglePx(-3)).toBeCloseTo(-anglePx(3))
  })
})

/** Encodes heights as a terrarium PNG (RGB, filter `filter` on every row). */
function terrariumPng(heights: number[][], filter = 0): Uint8Array {
  const h = heights.length
  const w = heights[0].length
  const rows: number[] = []
  let previous = new Array(w * 3).fill(0)
  for (const row of heights) {
    const line = row.flatMap((m) => {
      const v = m + 32768
      return [Math.floor(v / 256), Math.floor(v) % 256, Math.round((v % 1) * 256)]
    })
    rows.push(filter, ...line.map((byte, i) => (filter === 2 ? (byte - previous[i] + 256) & 255 : byte)))
    previous = line
  }
  const chunk = (type: string, body: Uint8Array) => {
    const out = new Uint8Array(12 + body.length)
    new DataView(out.buffer).setUint32(0, body.length)
    out.set([...type].map((c) => c.charCodeAt(0)), 4)
    out.set(body, 8)
    return out // CRC left zero: the decoder does not check it.
  }
  const header = new Uint8Array(13)
  new DataView(header.buffer).setUint32(0, w)
  new DataView(header.buffer).setUint32(4, h)
  header.set([8, 2, 0, 0, 0], 8)
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    chunk('IDAT', new Uint8Array(deflateSync(Uint8Array.from(rows)))), chunk('IEND', new Uint8Array())]
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  parts.reduce((at, p) => { png.set(p, at); return at + p.length }, 0)
  return png
}

describe('DEM tiles', () => {
  it('decodes terrarium heights, below sea level and fractional too', async () => {
    const grid = [[-175, 0.5, 12], [1035, -420, 3]]
    for (const filter of [0, 2]) {
      const decoded = await decodeTerrarium(terrariumPng(grid, filter))
      expect(Array.from(decoded).map((v) => Math.round(v * 10) / 10)).toEqual([-175, 0.5, 12, 1035, -420, 3])
    }
  })

  it('reads heights between pixel centres', () => {
    const tile = new Float32Array(256 * 256)
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) tile[y * 256 + x] = x * 10
    const zoom = 10
    const { x, y } = tileXY(32.3, 35.5, zoom)
    const dem = demFromTiles(zoom, new Map([[`${Math.floor(x)}/${Math.floor(y)}`, tile]]))
    const px = (x - Math.floor(x)) * 256 - 0.5
    expect(dem.height(32.3, 35.5)).toBeCloseTo(px * 10, 1)
    expect(dem.height(10, 10)).toBeNaN()
  })
})

