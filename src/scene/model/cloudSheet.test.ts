import { expect, it } from 'vitest'
import { hashId } from '../../data/landmarks/hash'
import { SCENE_CAMERA } from '../../domain/camera'
import type { LocalTime } from '../../domain/types'
import { RANGES } from '../../world/field/cells'
import { layerSnapshot } from '../../world/field/density'
import { buildField } from '../../world/field/field'
import { genusOf } from '../../world/field/genus'
import { terrainY } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { transmitAlong } from '../../world/field/transmit'
import { cloudSheetOf, sheetPathFactor } from './cloudSheet'
import { gridFor } from './cloudSheetGrid'
import { seenDepth } from './cloudSheetSeen'
import { sheetTexture, textureCorrection } from './cloudSheetTexture'
import { DOME_ALT } from './dome'
import { skyGeom } from './sky'
import type { SceneBox } from './types'

const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const neutral = { body: [0.5, 0.5, 0.5], shade: [0.3, 0.3, 0.3], lit: [1, 1, 1], light: 0.7 } as const
const percentile = (values: number[], p: number) =>
  values.length ? values.sort((a, b) => a - b)[Math.ceil(p * values.length) - 1] : 0

function fieldAt(placeId: string, at: LocalTime) {
  return buildField({
    placeId, at, hours: [], covers: { low: 0.74, mid: 0.63, high: 0.81 },
    lowBaseKm: 1.1, elevationKm: 0.05, weatherCode: 3,
    sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
  })
}

function frame(placeId: string, at: LocalTime) {
  const field = fieldAt(placeId, at)
  const world = {
    place: { id: placeId }, relief: { y: (angle: number) => terrainY(128, angle) }, camera: SCENE_CAMERA,
    bodies: { sun: { azimuth: 180 } }, cloudField: { field },
  } as WorldState
  return { world, field, geom: skyGeom(world, box) }
}

it('maintains cover in equal-area world samples across six days, four hours and three places', () => {
  const sum = new Map<string, { covered: number; target: number; samples: number; texture: number; tau: number; texturedTau: number }>()
  for (const place of ['jerusalem', 'haifa', 'tiberias']) {
    for (let day = 17; day < 23; day++) {
      for (const hour of ['00', '06', '12', '18']) {
        const field = fieldAt(place, `2026-11-${day}T${hour}:00`)
        for (const layer of field.layers) {
          if (layer.lattice === 'tower') continue
          const span = RANGES[layer.lattice][0]
          const { densityGrid } = layerSnapshot(field, layer.lattice, 0, 0, span)
          const sample = sheetTexture(genusOf(layer.lattice, layer.form, 0.5), layer, hashId(`${place}:sheet:${layer.lattice}`))(0)
          const depths: number[] = [], raw: number[] = []
          let result = sum.get(layer.lattice)
          if (!result) sum.set(layer.lattice, result = { covered: 0, target: 0, samples: 0, texture: 0, tau: 0, texturedTau: 0 })
          for (let row = 0; row < 24; row++) for (let col = 0; col < 24; col++) {
            const x = span * ((col + 0.5) / 24 - 0.5)
            const y = span * ((row + 0.5) / 24 - 0.5)
            const tau = densityGrid.tauAt(x, y)
            raw.push(tau > layer.floorTau ? sample(x, y) : 1)
            depths.push(tau)
          }
          const corrected = textureCorrection(raw, depths, Array<number>(24).fill(1), 24,
            depths.map(tau => Number(tau > layer.floorTau)))
          for (const [index, tau] of depths.entries()) {
            const texture = corrected(index)
            expect(texture).toBeGreaterThanOrEqual(0)
            result.covered += Number(tau > layer.floorTau + 0.05)
            result.texture += texture
            result.tau += tau
            result.texturedTau += tau * texture
            result.target += layer.cover
            result.samples++
          }
        }
      }
    }
  }
  for (const [lattice, { covered, target, samples, texture, tau, texturedTau }] of sum) {
    console.info(lattice, { target: target / samples, measured: covered / samples, texture: texture / samples, tauRatio: texturedTau / tau })
    expect.soft(Math.abs(covered - target) / samples, lattice).toBeLessThanOrEqual(0.05)
    expect.soft(Math.abs(texture / samples - 1), lattice).toBeLessThanOrEqual(0.01)
    expect.soft(Math.abs(texturedTau / tau - 1), lattice).toBeLessThanOrEqual(0.01)
  }
})

it.each(['haifa', 'jerusalem', 'tiberias'])('projects exact rays and follows the field in %s', place => {
  const at = frame(place, '2026-11-17T12:00')
  const next = frame(place, '2026-11-17T12:01')
  for (const { lattice } of at.field.layers) {
    if (lattice === 'tower') continue
    const snapshot = layerSnapshot(at.field, lattice, 0, 0, RANGES[lattice][1])
    const sheet = cloudSheetOf(at.world, at.geom, snapshot, neutral)!
    const cellular = sheet.genus === 'sc' || sheet.genus === 'ac'
    const meanSlant = (slant: number) => cellular ? 1 : sheet.genus === 'cs' ? Math.min(1.5, slant) : slant
    const depthAt = (source: typeof snapshot) => cellular ? source.densityGrid.resolvedTauAt : source.densityGrid.tauAt
    // Below the dome's join a ray reads the field itself; above it, the field as the eye sees its cells (cloudSheetSeen).
    const rayAt = (view: typeof at, source: typeof snapshot, altitude: number, range: number) => altitude <= DOME_ALT
      ? depthAt(source) : seenDepth(view.world.place.id, view.field.t, source, view.geom, depthAt(source))(range, altitude)
    const sample = (view: typeof at, source: typeof snapshot) => {
      const genus = genusOf(lattice, source.layer!.form, 0.5)
      const { xs, altitudes, ranges, east, north, tau, expected, path, slant, fade } =
        gridFor(view.world.place.id, source.layer!, view.geom, source.heightKm, genus)
      let maxError = 0
      const rays = altitudes.map((altitude, row) => rayAt(view, source, altitude, ranges[row]))
      const nodes = sheet.alpha.map((_, index) => {
        const row = Math.floor(index / xs.length), col = index % xs.length
        const exact = fade[row] < 1 ? rays[row](ranges[row] * east[col], ranges[row] * north[col]) : 0
        maxError = Math.max(maxError, Math.abs(exact - tau[index]))
        return { path: path[row], fade: fade[row], local: tau[index] * slant[row],
          mean: expected[index] * meanSlant(slant[row]), slant: slant[row],
          x: ranges[row] * east[col], y: ranges[row] * north[col] }
      })
      expect(maxError).toBeLessThanOrEqual(1e-9)
      return nodes
    }
    const original = sheet.alpha.slice()
    const before = sample(at, snapshot)
    const nextSnapshot = layerSnapshot(next.field, lattice, 0, 0, RANGES[lattice][1])
    const later = cloudSheetOf(next.world, next.geom, nextSnapshot, neutral)!
    const after = sample(next, nextSnapshot)
    expect(sheet.alpha).toEqual(original)
    expect(cloudSheetOf(at.world, at.geom, snapshot, neutral)).toEqual(sheet)
    expect(sheet.xs[0]).toBe(0)
    expect(sheet.xs.at(-1)).toBe(box.width)
    expect(sheet.ys.at(-1)).toBe(at.geom.horizon)
    const gaps = sheet.ys.slice(1).map((y, i) => y - sheet.ys[i])
    expect(Math.min(...gaps)).toBeGreaterThan(0)
    if (sheet.genus === 'sc' || sheet.genus === 'ac') {
      expect(sheet.xs).toHaveLength(144)
      expect(sheet.ys.filter(y => y >= at.geom.dome(30) && y <= at.geom.dome(5))).toHaveLength(49)
    }
    const deltas: number[] = []
    let max = 0, maxExcess = -Infinity
    const [vx, vy] = snapshot.layer!.vel
    let dense = 0, minDense = 1
    for (const [row, y] of sheet.ys.entries()) {
      const altitude = at.geom.domeAltitudeAt(y)
      if (altitude < 90) expect(at.geom.dome(altitude)).toBeCloseTo(y, 8)
      const sourceAt = rayAt(at, snapshot, altitude, Math.hypot(before[row * sheet.xs.length].x, before[row * sheet.xs.length].y))
      for (const [col, x] of sheet.xs.entries()) {
        const i = row * sheet.xs.length + col
        const a = before[i], b = after[i]
        // Pull back each destination ray by one minute of advection. Resample
        // the source field directly to avoid interpolation across sharp edges.
        const sourceX = b.x - vx, sourceY = b.y - vy
        const local = b.fade < 1 ? sourceAt(sourceX, sourceY) * b.slant : 0
        const mean = b.fade ? snapshot.densityGrid.expectedTauAt(sourceX, sourceY) * meanSlant(b.slant) : 0
        const warped = -a.path * ((1 - b.fade) * Math.expm1(-local) + b.fade * Math.expm1(-mean))
        // Beer–Lambert's maximum slope between two slant depths is exp(-min).
        const slope = (u: number, v: number) => Math.exp(-Math.min(u, v)) * Math.abs(u - v)
        const bound = Math.abs(a.path - b.path)
          + b.path * ((1 - b.fade) * slope(local, b.local) + b.fade * slope(mean, b.mean))
        const delta = Math.abs(warped - later.alpha[i])
        deltas.push(delta)
        max = Math.max(max, delta)
        maxExcess = Math.max(maxExcess, delta - bound)
        expect(at.geom.x(at.geom.azimuthAt(x))).toBeCloseTo(x, 8)
        // A dense vertical column may have an unresolved footprint,
        // or a truncated path. A fully resolved slant depth of 2 must be opaque.
        if (a.path < 0.99 || a.fade !== 0 || a.local <= 2) continue
        dense++
        minDense = Math.min(minDense, original[i])
      }
    }
    const p99 = percentile(deltas, 0.99)
    console.info(place, lattice, { rows: sheet.ys.length, cols: sheet.xs.length, p99, max, maxExcess, dense, minDense })
    expect.soft(p99, lattice).toBeLessThanOrEqual(0.15)
    expect.soft(maxExcess, lattice).toBeLessThanOrEqual(0.02)
    if (dense) expect.soft(minDense, lattice).toBeGreaterThan(0.7)
  }
})

it('keeps a low-cover floor transparent and lights gaps more than cores', () => {
  const at = frame('haifa', '2026-11-17T12:00')
  const snapshot = layerSnapshot(at.field, 'low', 0, 0, RANGES.low[1])
  const layer = { ...snapshot.layer!, cover: 0.3 }
  let gapTone = 0
  for (const tau of [layer.floorTau, 3]) {
    const sheet = cloudSheetOf(at.world, { ...at.geom, azimuthAt: () => at.world.bodies.sun.azimuth }, {
      ...snapshot, layer, densityGrid: { ...snapshot.densityGrid, tauAt: () => tau, resolvedTauAt: () => tau, expectedTauAt: () => tau },
    }, neutral)!
    if (tau === layer.floorTau) {
      expect.soft(sheet.alpha[0]).toBeLessThan(0.15)
      gapTone = sheet.tone[0]
    } else {
      expect(sheet.tone[0]).toBeGreaterThan(gapTone)
    }
  }
})

it.each(['jerusalem', 'haifa', 'tiberias'])('compares sheet and light transmission in %s', place => {
  const at = frame(place, '2026-11-17T12:00')
  const sun = at.world.bodies.sun.azimuth
  const direction = { ...at.geom, azimuthAt: (x: number) => at.geom.azimuthAt(x) - at.geom.azimuthAt(0) + sun }
  const errors: number[] = []
  for (const { lattice } of at.field.layers) {
    if (lattice === 'tower') continue
    const snapshot = layerSnapshot(at.field, lattice, 0, 0, RANGES[lattice][1])
    const sheet = cloudSheetOf(at.world, direction, snapshot, neutral)!
    const row = sheet.ys.findIndex(y => direction.domeAltitudeAt(y) <= 40)
    const altitude = direction.domeAltitudeAt(sheet.ys[row])
    expect(altitude).toBeGreaterThan(25)
    const world = { ...at.world, bodies: { ...at.world.bodies, sun: { ...at.world.bodies.sun, altitude } } }
    const solarSheet = cloudSheetOf(world, direction, snapshot, neutral)!
    // Check the rendered solar node against independent 20 m column quadrature.
    const light = transmitAlong(at.field, [snapshot], sun, altitude, at.field.t, 0.02)
    const transmission = 1 - solarSheet.alpha[row * solarSheet.xs.length]
    const error = Math.abs(transmission - light)
    console.info(place, lattice, { altitude, sheet: transmission, light, error })
    errors.push(error)
    expect.soft(error, lattice).toBeLessThanOrEqual(0.20)
  }
  console.info(place, { max: percentile(errors, 1), p95: percentile(errors, 0.95), nodes: errors.length })
  expect(sheetPathFactor(1, 0.3, 90, 100)).toBe(1)
})
