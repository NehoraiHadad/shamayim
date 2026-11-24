import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { CELLULAR_LOW_EDGE, CELLULAR_LOW_POWER, CELLULAR_LOW_ROWS } from '../../world/field/cells'
import { genusOf } from '../../world/field/genus'
import { altitudeOf, groundRangeAt } from '../../world/field/project'
import { transmitAlong } from '../../world/field/transmit'
import { makeWorldBuilder } from '../../world/world'
import type * as Grid from './cloudSheetGrid'
import { cloudLayersOf } from './cloudLayers'
import { sheetPathFactor } from './cloudSheetMath'
import type * as Edges from '../../world/field/edges'
import type * as Seen from './cloudSheetSeen'
import { seenDepth } from './cloudSheetSeen'
import type * as Dome from './dome'
import { skyGeom } from './sky'
import { openness, shapeOf } from './cloudSheetShape'

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
vi.mock('../../world/field/edges', async (load) => {
  const all = await load<typeof Edges>(), { edgeNoise } = all
  return { ...all, edgeNoise: (...args: Parameters<typeof edgeNoise>) => {
    const real = edgeNoise(...args)
    return on.noise ? real : { ...real, at: () => 0 }
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

it('finds the ball and the towers', () => {
  set({})
  const world = worldAt('haifa', '2026-11-17T15:30'), geom = skyGeom(world, box), lines = ['BALL']
  for (const [x, y] of [[47, 272], [30, 260], [60, 285], [47, 300], [299, 275]]) {
    const azimuth = geom.azimuthAt(x), altitude = geom.domeAltitudeAt(y)
    lines.push(` at ${x},${y}: az ${azimuth.toFixed(0)} alt ${altitude.toFixed(1)}`)
    for (const { layer, cells, heightKm, densityGrid } of world.cloudField!.snapshot) {
      if (!layer?.cover) continue
      const range = groundRangeAt(heightKm, altitude), e = range * Math.sin(azimuth * RAD), n = range * Math.cos(azimuth * RAD)
      lines.push(`  ${layer.lattice} range ${range.toFixed(2)} tau ${densityGrid.tauAt(e, n).toFixed(2)}: ${cells.filter((c) => Math.hypot(c.x - e, c.y - n) < 1.1 * c.r)
        .map((c) => `[${c.genus} d ${Math.hypot(c.x, c.y).toFixed(2)} r ${c.r.toFixed(2)} tau ${c.tau0.toFixed(1)}]`).join(' ')}`)
    }
  }
  console.info(lines.join('\n'))
  const tel = worldAt('tel-aviv', '2026-11-17T12:00'), sky = skyGeom(tel, box), rows = ['TEL']
  for (const { layer, cells, heightKm } of tel.cloudField!.snapshot) if (layer?.lattice === 'low' || layer?.lattice === 'mid') for (const c of cells) {
    const d = Math.hypot(c.x, c.y), shape = shapeOf(c, heightKm, sky, 1.5 * 180 / Math.PI, () => openness(c, cells))
    if (d > 8 * heightKm && d > 10) continue
    const x = sky.x((Math.atan2(c.x, c.y) / RAD + 360) % 360)
    rows.push(`  ${layer.lattice} ${c.genus} x ${x.toFixed(0)} y ${sky.dome(altitudeOf(heightKm, d)).toFixed(0)} d ${d.toFixed(2)} r ${c.r.toFixed(2)} h ${heightKm.toFixed(2)} alts ${altitudeOf(heightKm, d + c.r).toFixed(0)}..${altitudeOf(heightKm, Math.max(0, d - c.r)).toFixed(0)} open ${openness(c, cells).toFixed(2)} ${shape ? `wide ${shape.wide.toFixed(2)} firm ${shape.firm.toFixed(2)} foot ${(3 * shape.bend * shape.far ** 2 / shape.wide).toFixed(2)}` : 'none'}`)
  }
  console.info(rows.join('\n'))
  const storm = worldAt('haifa', '2026-03-15T14:00')
  for (const layer of cloudLayersOf(storm, box, skyGeom(storm, box))) if (layer.kind === 'cloudCells') {
    console.info('TOWERS\n' + layer.cells.map(({ sprite: s, x, y }) => `  ${s.genus} x ${x.toFixed(0)} y ${y.toFixed(0)} w ${s.w.toFixed(0)} tall ${s.tall.toFixed(0)} anvil ${s.anvil ?? 0}`).join('\n'))
  }
})

it('reads the sun through the field', () => {
  set({})
  const hits: Record<string, number> = {}
  const count = (name: string, yes: boolean) => { hits[name] = (hits[name] ?? 0) + Number(yes) }
  let spots = 0
  for (const { id } of all) for (const day of ['2026-11-17', '2026-03-15']) {
    const build = makeWorldBuilder()
    for (let m = 7 * 60; m <= 17 * 60; m += 10) {
      const at = `${day}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` as LocalTime
      const world = build(worldInput(places.get(id)!, `${day}T07:00` as LocalTime, at)), { azimuth, altitude } = world.bodies.sun
      if (altitude < 1) continue
      const geom = skyGeom(world, box), field = world.cloudField!
      const t = { native: 1, drawn: 1, noise: 1, cells: 1, mid: 1 }
      const used = []
      for (const snapshot of field.snapshot) {
        const { layer, heightKm, densityGrid } = snapshot
        if (!layer?.cover || (layer.lattice !== 'low' && layer.lattice !== 'mid')) continue
        used.push(snapshot)
        const genus = genusOf(layer.lattice, layer.form, 0.5), depth = genus === 'sc' || genus === 'ac' ? densityGrid.resolvedTauAt : densityGrid.tauAt
        const slant = sheetPathFactor(layer.baseKm, layer.meanVKm, altitude, Infinity)
        const range = groundRangeAt(heightKm, altitude), e = range * Math.sin(azimuth * RAD), n = range * Math.cos(azimuth * RAD)
        t.native *= Math.exp(-slant * depth(e, n))
        const half = groundRangeAt(layer.baseKm + layer.meanVKm / 2, altitude) / range
        t.mid *= Math.exp(-slant * depth(half * e, half * n))
        for (const [name, flags] of [['drawn', {}], ['noise', { cells: false }], ['cells', { noise: false }]] as const) {
          set(flags)
          t[name] *= Math.exp(-slant * seenDepth(id, field.field.t, snapshot, geom, depth)(range, altitude)(e, n))
        }
        set({})
      }
      const ray = transmitAlong(field.field, used, azimuth, altitude)
      for (const [name, value] of Object.entries({ ...t, ray })) {
        count(`${name}-drawn`, Math.abs(value - t.drawn) > 0.1)
        count(`${name}-state`, (value > 0.5) !== (t.drawn > 0.5))
        count(`${name}-ray`, Math.abs(value - ray) > 0.1)
      }
      count('all', true)
      count('high', altitude > 14.67)
      spots += Math.abs(ray - t.drawn)
    }
  }
  console.info('SUN', JSON.stringify(hits), spots / hits.all)
  expect(hits.all).toBeGreaterThan(100)
}, 600_000)
