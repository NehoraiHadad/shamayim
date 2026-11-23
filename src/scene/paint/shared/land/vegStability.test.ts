import { describe, expect, it } from 'vitest'
import type { CropArea } from '../../../../data/landmarks/cropAreas'
import { makeWorldInput, SHADMOT, typedCover } from '../../../../test/livingLandFixtures'
import type { Plane, WorldState } from '../../../../world/types'
import { buildWorld } from '../../../../world/world'
import { planeVegetationOf } from '../../../model/landVegetation'
import type { PlaneVegetation, SceneBox } from '../../../model/types'
import { EMPTY_VEGETATION } from '../../../model/vegDescriptor'
import { mPerPxAt } from '../../../model/vegRules'
import { buildVegPalette } from '../../../model/vegSample'
import type { Ctx2D } from '../base/hand'
import { paintVegFields, paintVegRows, paintVegStrata } from './landVegetation'
import { paintVegTufts } from './landVegTufts'
import { receiverBrush } from './receiverBrush'
import type { VegetationToneAt } from './vegetationLight'

const tones = buildVegPalette([0.2, 0.25, 0.18], 0.3)
const toneAt: VegetationToneAt = (i) => [tones[i] ?? tones[0]]

function trace() {
  const commands: (readonly unknown[])[] = [], alpha: number[] = []
  const ctx = new Proxy({}, {
    get: (_, prop) => (...args: unknown[]) => commands.push([prop, ...args]),
    set: (_, prop, val) => {
      commands.push([prop, val])
      if (prop === 'strokeStyle' || prop === 'fillStyle') alpha.push(Number(/\/\s*([\d.]+)\)/.exec(String(val))?.[1] ?? 1))
      return true
    },
  }) as unknown as Ctx2D
  return { ctx, commands, alpha }
}

describe('Stage 4 painter stability', () => {
  it('keeps unchanged commands when an earlier parcel, stratum or tuft is lost to a local cover update', () => {
    const dense: PlaneVegetation = {
      ...EMPTY_VEGETATION, seed: 123, tones,
      fields: new Float32Array([20, 40, 24, 40, 26, 49, 16, 49, 0.55, 230, 60, 240, 60, 245, 79, 226, 79, 0.55]),
      fieldMeta: new Uint8Array([0, 8, 0, 8]),
      strata: new Float32Array([20, 43, 50, 45, 3, 0.4, 230, 63, 260, 65, 3, 0.4]),
      strataMeta: new Uint8Array([15, 15]),
      tufts: new Float32Array([20, 40, 2, 0.4, 230, 60, 2, 0.4]), tuftMeta: new Uint8Array([1, 13, 1, 13]),
    }
    const after: PlaneVegetation = {
      ...dense, fields: dense.fields.slice(9), fieldMeta: dense.fieldMeta.slice(2),
      strata: dense.strata.slice(6), strataMeta: dense.strataMeta.slice(1),
      tufts: dense.tufts.slice(4), tuftMeta: dense.tuftMeta.slice(2),
    }
    for (const paint of [paintVegFields, paintVegStrata, (brush: ReturnType<typeof receiverBrush>, veg: PlaneVegetation) => paintVegTufts(brush, veg)]) {
      const a = trace(), b = trace()
      paint(receiverBrush(a.ctx), dense, toneAt)
      paint(receiverBrush(b.ctx), after, toneAt)
      const fromFeature = (list: typeof a.commands) => list.slice(list.findIndex((cmd) =>
        cmd[0] === 'moveTo' && cmd[1] === 230 || cmd[0] === 'ellipse' && Number(cmd[1]) > 220))
      expect(fromFeature(a.commands)).toEqual(fromFeature(b.commands))
    }

    // Two adjacent growing parcels receive distinct anchor-hashed green tones so winter/spring fields read as a patchwork.
    const patch = trace()
    paintVegFields(receiverBrush(patch.ctx), dense, toneAt)
    const fillColors = patch.commands.filter((cmd) => cmd[0] === 'fillStyle').map((cmd) => String(cmd[1]))
    expect(new Set(fillColors).size).toBe(2)
  })

  it('keeps painted orchard contrast through the 24 m/px handoff to coarse fields', () => {
    const box: SceneBox = { width: 375, landTop: 300, landHeight: 128, skyHeight: 428, dpr: 2 }
    const cover = typedCover(4, 'worldcover-2021:local-50m')
    const base = buildWorld(makeWorldInput(SHADMOT, '2026-11-17T12:00', { cover, near: null, far: null, weather: null }))
    const area: CropArea = { source: 'osm', kind: 'olive', polygons: [[[
      [35.42, 32.26], [35.65, 32.26], [35.65, 32.43], [35.42, 32.43], [35.42, 32.26],
    ]]] }
    function painted(scale: number) {
      const km = scale / mPerPxAt(1000, base.camera)
      const plane: Plane = { points: [[0, 50], [375, 50]], distanceKm: [km, km] }
      const world: WorldState = { ...base, cropAreas: [area], keys: { ...base.keys, terrain: `flat:${scale}` },
        terrain: { ...base.terrain, near: plane, faces: { far: { contours: [], columns: [] }, near: { contours: [], columns: [
          { x: 0, crest: 50, points: [{ y: 126, km, h: 0, slope: 0 }] },
        ] } } } }
      const veg = planeVegetationOf(world, box, 'near', plane, tones[0], [])
      const rows = trace(), fields = trace()
      const ink: VegetationToneAt = (i) => [veg.tones[i] ?? veg.tones[0]]
      paintVegRows(receiverBrush(rows.ctx), veg, ink)
      paintVegFields(receiverBrush(fields.ctx), veg, ink)
      return { row: Math.max(0, ...rows.alpha), field: Math.max(0, ...fields.alpha) }
    }
    const measures = [14, 16, 18, 20, 22, 23.5, 23.9, 24, 24.1, 24.5].map(painted)
    expect(measures[0].row).toBeGreaterThan(0.25)
    expect(measures.at(-1)!.field).toBeGreaterThan(0.3)
    for (let i = 1; i < measures.length; i++) {
      expect(measures[i].row).toBeLessThanOrEqual(measures[i - 1].row)
      expect(measures[i].field).toBeGreaterThanOrEqual(measures[i - 1].field - 0.01)
      expect(measures[i].row + measures[i].field).toBeGreaterThan(0.20)
    }
    expect(Math.abs(measures[6].field - measures[8].field)).toBeLessThan(0.02)
  })
})
