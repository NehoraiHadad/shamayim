import { describe, expect, it } from 'vitest'
import { seeded } from '../../data/landmarks/hash'
import { makeWorldInput, SHADMOT } from '../../test/livingLandFixtures'
import type { Plane, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { addFieldParcel } from './vegAgriBuilders'
import { emptyBuf, flatEnv } from './vegBuilderFixtures.testkit'
import { projectedFootprints } from './vegFootprint'
import { addOrchardBlock } from './vegOrchard'
import * as vegSample from './vegSample'

describe('Stage 4 footprint clipping', () => {
  it('keeps the vegetation sampler free of projected-face re-exports', () => {
    expect(vegSample).not.toHaveProperty('faceAtY')
    expect(vegSample).not.toHaveProperty('localFootY')
    expect(vegSample).not.toHaveProperty('crestKmAt')
  })

  it('splits parcel and row interiors at an actual projected water band, preserving dry pieces', () => {
    const base = buildWorld(makeWorldInput(SHADMOT, '2026-11-17T12:00', null))
    const plane: Plane = { points: [[0, 50], [375, 50]], distanceKm: [3, 3] }
    const crestAt = () => 50, footAt = () => 128
    const bands = (dry: number) => [600, 1400, 1600, 1800, 3000].map((distanceM) => ({
      distanceM, elevationM: 0, sample: { ...base.land.own, cover: distanceM === 1600 ? 8 : dry },
    }))
    function fit(dry: number) {
      const world: WorldState = { ...base,
        terrain: { ...base.terrain, near: plane, faces: { far: { contours: [], columns: [] }, near: { contours: [], columns: [
          { x: 0, crest: 50, points: [{ y: 110, km: 0.6, h: 0, slope: 0 }] },
        ] } } },
        land: { ...base.land, rays: base.land.rays.map((ray) => ({ ...ray, bands: bands(dry) })) },
      }
      return projectedFootprints(world, 'near', plane, crestAt, footAt)
    }
    const yOf = (km: number) => 50 + 60 * (3 - km) / 2.4
    const wetTop = yOf(Math.sqrt(1.6 * 1.8)), wetBottom = yOf(Math.sqrt(1.4 * 1.6))
    const fields = emptyBuf(), rows = emptyBuf()
    const fieldFit = fit(4), orchardFit = fit(1)
    expect(fieldFit([165, 65, 195, 110], (c) => c === 4)).toBe(false)
    addFieldParcel(fields, { ...flatEnv(4), fits: fieldFit }, () => 0.5, 180, 65, 110, 18, 12, 0.55, 0.3)
    addOrchardBlock(rows, { ...flatEnv(1, 2), fits: orchardFit }, () => 0.5, 180, 65, 110, 24, 2, 'palm', 1)
    expect(fields.fields).toHaveLength(18)
    expect(rows.rows.length).toBeGreaterThan(5 * 6)
    for (let i = 0; i < fields.fields.length; i += 9) {
      expect(fields.fields[i + 5] < wetTop || fields.fields[i + 1] > wetBottom).toBe(true)
    }
    for (let i = 0; i < rows.rows.length; i += 6) {
      expect(rows.rows[i + 3] < wetTop || rows.rows[i + 1] > wetBottom).toBe(true)
    }
  })

  it('reserves clearance for an overhanging palm frond even when its root is outside the overlay', () => {
    const palms = emptyBuf()
    const grow = (buf: typeof palms, env: ReturnType<typeof flatEnv>) =>
      addOrchardBlock(buf, env, seeded(73), 180, 65, 112, 24, 2, 'palm', 1)
    grow(palms, flatEnv(1, 2))
    expect(palms.treeMeta[0]).toBe(3)
    const [x, y, r, height] = palms.trees
    const overlay = { x: x + r * 0.95, y: y - height * 0.62 - r * 0.9, w: r * 0.8, h: r * 0.5 }
    expect(y - (overlay.y + overlay.h)).toBeGreaterThan(r + 0.8)
    const blocked = emptyBuf()
    grow(blocked, flatEnv(1, 2, [overlay]))
    expect(blocked.trees.some((value, i) => i % 6 === 0 && value === x && blocked.trees[i + 1] === y)).toBe(false)
  })

  it('aggregates if the far end cannot resolve the rows and caps the cross-ray field width in metres', () => {
    const buf = emptyBuf(), env = flatEnv(1, 2.5)
    const perspective = { ...env, scaleAt: (_x: number, y: number) => y < 80 ? 7 : 2.5, farScale: () => 7 }
    addOrchardBlock(buf, perspective, () => 0.5, 180, 65, 110, 24, 2.5, 'palm', 1)
    expect(buf.rows.length).toBeGreaterThanOrEqual(12)
    expect(buf.rows[6] - buf.rows[0]).toBeCloseTo(36 / 7)
    expect(buf.rows[8] - buf.rows[2]).toBeCloseTo(36 / 2.5)
    expect(Array.from(buf.treeMeta).filter((_, i) => i % 3 === 0)).not.toContain(3)

    addFieldParcel(buf, flatEnv(4, 30), () => 0.5, 180, 65, 110, 20, 30, 0.55, 0.3)
    expect((buf.fields[4] - buf.fields[6]) * 30).toBeCloseTo(260)
  })
})
