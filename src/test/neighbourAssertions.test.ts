import { expect, it } from 'vitest'
import { assertNeighbour } from './neighbourAssertions'
import type { GlyphDesc, LayerOf } from '../scene/model/types'
import type { WorldMark } from '../world/markGeometry'
import type { WorldState } from '../world/types'
import { SCENE_CAMERA } from '../domain/camera'
import { LEGIBLE_PX } from '../world/neighbourSize'

const world = { place3: { kind: 'outside', beyond: [], land: null, baseKm: 2,
  frame: { eyeN: 1, backKm: 1, n: 0 }, beyondTowns: [{ id: 'town', seed: 8, x: 135, baseY: 100 }] },
  camera: SCENE_CAMERA, terrain: { near: { points: [[0, 110], [375, 110]], distanceKm: [1, 1] } },
} as unknown as WorldState
const mark = { id: 'hall', glyphKind: 'minaret', seatBlockId: 'town', x: 135, km: 8,
  plane: 'near' } as WorldMark
const glyph = { kind: 'minaret', x: 135, w: 4, base: 100, h: LEGIBLE_PX, scale: 1,
  factor: 1, town: true, supportId: 'town' } as GlyphDesc
const layer = { items: [{ kind: 'box', beyond: true, seed: 8, x: 135, w: 14, top: 99, foot:
  100 }] } as unknown as LayerOf<'outside'>
const check = (g: GlyphDesc) => assertNeighbour(world, 375, layer, g, mark, 'independent requirement')
it('accepts independently supported worship and rejects a false town flag', () => {
  expect(() => check(glyph)).not.toThrow()
  expect(() => check({ ...glyph, town: false })).toThrow()
})
it('requires support identity whenever town is true', () => {
  expect(() => check({ ...glyph, supportId: undefined })).toThrow()
})
