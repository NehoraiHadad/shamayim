import { expect, it } from 'vitest'
import { box, frame, neutral, percentile } from '../../test/cloudSheetFrame'
import { RANGES } from '../../world/field/cells'
import { layerSnapshot } from '../../world/field/density'
import { genusOf } from '../../world/field/genus'
import { altitudeOf } from '../../world/field/project'
import { cloudSheetOf } from './cloudSheet'
import { gridFor } from './cloudSheetGrid'
import { seenDepth } from './cloudSheetSeen'
import { DOME_ALT } from './dome'

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
    const seenIn = (view: typeof at, source: typeof snapshot) =>
      seenDepth(view.world.place.id, view.field.t, source, view.geom, depthAt(source))
    const sample = (view: typeof at, source: typeof snapshot) => {
      const genus = genusOf(lattice, source.layer!.form, 0.5)
      const { xs, altitudes, ranges, east, north, tau, expected, path, slant, fade } =
        gridFor(view.world.place.id, source.layer!, view.geom, source.heightKm, genus)
      let maxError = 0
      const seen = seenIn(view, source), rays = altitudes.map((altitude, row) => seen(ranges[row], altitude))
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
    // The sheet moves with the air; above the dome's join a cell in the eye's proportions is redrawn as it moves.
    const deltas: number[] = [], rays: number[] = [], redrawn: number[] = []
    let max = 0, maxExcess = -Infinity
    const [vx, vy] = snapshot.layer!.vel
    let dense = 0, minDense = 1
    const seenAt = seenIn(at, snapshot)
    for (const [row, y] of sheet.ys.entries()) {
      const altitude = at.geom.domeAltitudeAt(y)
      if (altitude < 90) expect(at.geom.dome(altitude)).toBeCloseTo(y, 8)
      for (const [col, x] of sheet.xs.entries()) {
        const i = row * sheet.xs.length + col
        const a = before[i], b = after[i]
        // Pull back each destination ray by one minute of advection. Resample
        // the source field directly to avoid interpolation across sharp edges.
        const sourceX = b.x - vx, sourceY = b.y - vy
        const range = Math.hypot(sourceX, sourceY)
        const local = b.fade < 1 ? seenAt(range, altitudeOf(snapshot.heightKm, range))(sourceX, sourceY) * b.slant : 0
        const mean = b.fade ? snapshot.densityGrid.expectedTauAt(sourceX, sourceY) * meanSlant(b.slant) : 0
        const warped = -a.path * ((1 - b.fade) * Math.expm1(-local) + b.fade * Math.expm1(-mean))
        // Beer–Lambert's maximum slope between two slant depths is exp(-min).
        const slope = (u: number, v: number) => Math.exp(-Math.min(u, v)) * Math.abs(u - v)
        const bound = Math.abs(a.path - b.path)
          + b.path * ((1 - b.fade) * slope(local, b.local) + b.fade * slope(mean, b.mean))
        const delta = Math.abs(warped - later.alpha[i])
        deltas.push(delta)
        ;(lattice !== 'high' && altitude > DOME_ALT ? redrawn : rays).push(delta)
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
    const p99 = percentile(deltas, 0.99), below = percentile(rays, 0.99), upper = percentile(redrawn, 0.99)
    const outlines = redrawn.reduce((sum, delta) => sum + delta, 0) / redrawn.length
    console.info(place, lattice, { rows: sheet.ys.length, cols: sheet.xs.length, p99, below, upper, outlines, max, maxExcess, dense, minDense })
    expect.soft(below, lattice).toBeLessThanOrEqual(0.15)
    // A redrawn cell keeps its place. Its rims, opaque to clear in a node, turn about the eye as they are stretched and not
    // with the air, so a hundredth of these nodes do change sides in a minute: they have no p99, and a mean.
    if (redrawn.length) expect.soft(outlines, lattice).toBeLessThanOrEqual(0.05)
    expect.soft(maxExcess, lattice).toBeLessThanOrEqual(0.02)
    if (dense) expect.soft(minDense, lattice).toBeGreaterThan(0.7)
  }
})
