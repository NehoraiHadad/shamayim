import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { CELLULAR_LOW_EDGE, CELLULAR_LOW_POWER, CELLULAR_LOW_ROWS } from '../../world/field/cells'
import { genusOf } from '../../world/field/genus'
import { altitudeOf, groundRangeAt } from '../../world/field/project'
import { transmitAlong } from '../../world/field/transmit'
import { makeWorldBuilder } from '../../world/world'
import { mix } from '../paint/shared/base/hand'
import type * as Grid from './cloudSheetGrid'
import { cloudLayersOf } from './cloudLayers'
import { sheetPathFactor } from './cloudSheetMath'
import type * as Edges from './cloudSheetEdges'
import type * as Seen from './cloudSheetSeen'
import { seenDepth } from './cloudSheetSeen'
import type * as Dome from './dome'
import { skyGeom, skyStops, stopAt } from './sky'
import type { RGB } from './types'

const on = vi.hoisted(() => ({ dome: true, rows: true, cells: true, noise: true }))
vi.mock('./cloudSheetSeen', async (load) => {
  const { seenDepth: real } = await load<typeof Seen>()
  return { seenDepth: (...args: Parameters<typeof real>) => {
    if (on.cells) return real(...args)
    if (!on.noise) return () => args[4]
    const [id, minute, snapshot, geom, depthAt] = args
    return real(id, minute, { ...snapshot, cells: [] }, geom, depthAt)
  } }
})
vi.mock('./cloudSheetEdges', async (load) => {
  const { edgeNoise } = await load<typeof Edges>()
  return { edgeNoise: (...args: Parameters<typeof edgeNoise>) => {
    const real = edgeNoise(...args)
    return on.noise ? real : { radius: real.radius, at: () => 0 }
  } }
})
vi.mock('./dome', async (load) => {
  const { domeOf, DOME_ALT } = await load<typeof Dome>()
  return { DOME_ALT, domeOf: (y: (a: number) => number) => {
    if (on.dome) return domeOf(y)
    const yDome = y(22), top = Math.min(18, yDome * 0.5)
    return {
      dome: (a: number) => a <= 22 ? y(a) : yDome - (yDome - top) * ((Math.min(90, a) - 22) / 68) ** 0.85,
      domeAltitudeAt: (px: number) => {
        if (px <= top) return 90
        if (px < yDome) return 22 + 68 * ((yDome - px) / (yDome - top)) ** (1 / 0.85)
        if (px === y(0)) return 0
        let low = -90, high = 22
        for (let i = 0; i < 46; i++) {
          const mid = (low + high) / 2
          if (y(mid) > px) low = mid
          else high = mid
        }
        return (low + high) / 2
      },
    }
  } }
})
vi.mock('./cloudSheetGrid', async (load) => {
  const all = await load<typeof Grid>()
  return { ...all, gridFor: (...args: Parameters<typeof all.gridFor>) => {
    const grid = all.gridFor(...args), [, , geom, height, genus] = args
    if (on.rows || (genus !== 'sc' && genus !== 'ac')) return grid
    const lowEdge = geom.dome(CELLULAR_LOW_EDGE)
    let row = 0
    for (const [top, bottom, n, power] of [[0, geom.dome(30), 12, 1], [geom.dome(30), lowEdge, 48, 3],
      [lowEdge, geom.horizon, CELLULAR_LOW_ROWS, CELLULAR_LOW_POWER]]) {
      for (let i = 0; i < n; i++) grid.ys[row++] = bottom - (bottom - top) * (1 - i / n) ** power
    }
    grid.ys[0] = 0
    for (const [i, y] of grid.ys.entries()) grid.ranges[i] = groundRangeAt(height, grid.altitudes[i] = geom.domeAltitudeAt(y))
    return grid
  } }
})

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const RAD = Math.PI / 180
let places: Map<string, LoadedPlace>
const all = [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES, ...DATUM_PLACES]
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(all)
}, 240_000)
afterAll(() => vi.unstubAllGlobals())

const set = (value: Partial<typeof on>) => Object.assign(on, { dome: true, rows: true, cells: true, noise: true }, value)
const worldAt = (id: string, at: string, extra = {}) => makeWorldBuilder()({ ...worldInput(places.get(id)!, at as LocalTime, at as LocalTime), ...extra })
const BROKEN = { forcedLayers: { low: 0.6, mid: 0, high: 0 }, forced: { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2 } }

it('lists the cells of the scenes', () => {
  set({})
  for (const [id, at, extra] of [['tel-aviv', '2026-11-17T12:00', {}], ['haifa', '2026-11-17T15:30', {}], ['neve-zohar', '2026-11-17T16:00', {}],
    ['haifa', '2026-03-15T14:00', {}], ['jerusalem', '2026-11-17T16:30', BROKEN]] as const) {
    const world = worldAt(id, at, extra), geom = skyGeom(world, box)
    const lines = [`SCENE ${id} ${at} sun ${world.bodies.sun.azimuth.toFixed(0)} ${world.bodies.sun.altitude.toFixed(1)} eye ${world.light.eye.toFixed(3)}`]
    for (const { layer, cells, heightKm } of world.cloudField!.snapshot) {
      if (!layer) continue
      lines.push(`LAYER ${layer.lattice} cover ${layer.cover.toFixed(2)} Q ${layer.Q.toFixed(2)} g ${layer.g.toFixed(2)} base ${layer.baseKm.toFixed(2)} v ${layer.meanVKm.toFixed(2)} h ${heightKm.toFixed(2)} vel ${layer.vel.map((v) => v.toFixed(2))} ${JSON.stringify(layer.form)} ${genusOf(layer.lattice, layer.form, 0.5)}`)
      if (layer.lattice === 'high') continue
      for (const c of cells) {
        const d = Math.hypot(c.x, c.y), alt = altitudeOf(heightKm, d)
        const az = (Math.atan2(c.x, c.y) / RAD + 360) % 360, x = geom.x(az)
        if (alt < (layer.lattice === 'tower' ? 3 : 14) || x < -20 || x > 395) continue
        const near = Math.min(...cells.filter((o) => o !== c).map((o) => Math.hypot(o.x - c.x, o.y - c.y) / (o.r + c.r)))
        lines.push(`  ${c.genus} x ${x.toFixed(0)} y ${geom.dome(alt).toFixed(0)} alt ${alt.toFixed(0)} q ${(c.r / d).toFixed(2)} r ${c.r.toFixed(2)} v ${c.vKm.toFixed(2)} base ${c.baseKm.toFixed(2)} tau ${c.tau0.toFixed(1)} share ${c.share.toFixed(2)} near ${near.toFixed(2)}`)
      }
    }
    console.info(lines.join('\n'))
  }
})

const lin = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
function lab(rgb: RGB) {
  const [r, g, b] = rgb.map(lin)
  const f = (t: number) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * b)
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)].map((v) => v.toFixed(1)).join(' ')
}

it('switches the changes at neve-zohar', () => {
  const at = '2026-11-17T16:00'
  for (const [name, flags] of [['head', {}], ['head-dome', { dome: false }], ['head-rows', { rows: false }], ['head-cells', { cells: false }],
    ['head-noise', { noise: false }], ['head-cells-noise', { cells: false, noise: false }],
    ['base', { dome: false, rows: false, cells: false, noise: false }], ['base+dome', { rows: false, cells: false, noise: false }],
    ['base+rows', { dome: false, cells: false, noise: false }]] as const) {
    set(flags)
    const world = worldAt('neve-zohar', at), geom = skyGeom(world, box)
    const sheets = cloudLayersOf(world, box, geom).filter((l) => l.kind === 'cloudSheet').sort((a, b) => a.z - b.z)
    const stops = skyStops(world, box)
    const lines = [`TONE ${name}`]
    for (const [top, bottom] of [[2, 40], [40, 80], [80, 130], [130, 200], [200, 260], [260, 320], [320, 400]]) {
      const sum = [0, 0, 0], alphas = sheets.map(() => 0), tones = sheets.map(() => 0)
      let n = 0
      for (let y = top; y < bottom; y += 3) for (let x = 2; x < 375; x += 6) {
        let rgb = stopAt(stops, y / box.skyHeight) as RGB
        sheets.forEach((s, k) => {
          const col = Math.round(x / 375 * (s.xs.length - 1))
          let row = 0
          s.ys.forEach((v, i) => { if (Math.abs(v - y) < Math.abs(s.ys[row] - y)) row = i })
          const a = s.alpha[row * s.xs.length + col], t = s.tone[row * s.xs.length + col]
          const c = t < 0.5 ? mix(s.lit, s.body, t * 2) : mix(s.body, s.shade, t * 2 - 1)
          rgb = rgb.map((v, i) => v + (c[i] - v) * a) as unknown as RGB
          alphas[k] += a
          tones[k] += t
        })
        rgb.forEach((v, i) => { sum[i] += v })
        n++
      }
      lines.push(`  y ${top}-${bottom} Lab ${lab(sum.map((v) => v / n) as unknown as RGB)} ${sheets.map((s, k) => `${s.lattice} a ${(alphas[k] / n).toFixed(3)} t ${(tones[k] / n).toFixed(3)}`).join(' ')}`)
    }
    lines.push(sheets.map((s) => `${s.lattice} ${s.genus} body ${lab(s.body)} shade ${lab(s.shade)} lit ${lab(s.lit)}`).join(' | '))
    console.info(lines.join('\n'))
  }
  set({})
}, 60_000)

it('reads the sun through the field', () => {
  set({})
  const rows = { all: 0, drawnState: 0, drawnT: 0, baseT: 0, rayNative: 0, rayDrawn: 0, rayBase: 0, above: 0, aboveT: 0, sum: [0, 0, 0] }
  for (const { id } of all) for (const day of ['2026-11-17', '2026-03-15']) {
    const build = makeWorldBuilder()
    for (let m = 7 * 60; m <= 17 * 60; m += 10) {
      const at = `${day}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` as LocalTime
      const world = build(worldInput(places.get(id)!, `${day}T07:00` as LocalTime, at)), { azimuth, altitude } = world.bodies.sun
      if (altitude < 1) continue
      const geom = skyGeom(world, box), field = world.cloudField!
      let native = 1, drawn = 1, base = 1
      const used = []
      for (const snapshot of field.snapshot) {
        const { layer, heightKm, densityGrid } = snapshot
        if (!layer?.cover || (layer.lattice !== 'low' && layer.lattice !== 'mid')) continue
        used.push(snapshot)
        const genus = genusOf(layer.lattice, layer.form, 0.5), depth = genus === 'sc' || genus === 'ac' ? densityGrid.resolvedTauAt : densityGrid.tauAt
        const slant = sheetPathFactor(layer.baseKm, layer.meanVKm, altitude, Infinity)
        const range = groundRangeAt(heightKm, altitude), e = Math.sin(azimuth * RAD), n = Math.cos(azimuth * RAD)
        native *= Math.exp(-slant * depth(range * e, range * n))
        const low = groundRangeAt(layer.baseKm, altitude)
        base *= Math.exp(-slant * depth(low * e, low * n))
        drawn *= Math.exp(-slant * seenDepth(id, field.field.t, snapshot, geom, depth)(range, altitude)(range * e, range * n))
      }
      const ray = transmitAlong(field.field, used, azimuth, altitude)
      rows.all++
      rows.drawnState += Number((native > 0.5) !== (drawn > 0.5))
      rows.drawnT += Number(Math.abs(native - drawn) > 0.1)
      rows.baseT += Number(Math.abs(native - base) > 0.1)
      rows.rayNative += Number(Math.abs(ray - native) > 0.1)
      rows.rayDrawn += Number(Math.abs(ray - drawn) > 0.1)
      rows.rayBase += Number(Math.abs(ray - base) > 0.1)
      if (altitude > 22) {
        rows.above++
        rows.aboveT += Number(Math.abs(native - drawn) > 0.1)
      }
      rows.sum[0] += ray
      rows.sum[1] += native
      rows.sum[2] += drawn
    }
  }
  console.info('SUN', JSON.stringify(rows))
  expect(rows.all).toBeGreaterThan(100)
}, 600_000)
