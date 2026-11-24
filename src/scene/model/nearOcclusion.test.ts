import { expect, it } from 'vitest'
import { outsideMarks } from './outsideMarks'
import type { WorldState } from '../../world/types'
import type { WorldMark } from '../../world/markGeometry'
import { LEGIBLE_PX } from '../../world/neighbourSize'
import type { NeighbourBlock } from './neighbourPlacement'

const baseMark = { kind: 'mast', glyphKind: 'mast', h: LEGIBLE_PX, scale: 1, w: 1.5, base: 100,
  sightKm: 8, townFootprint: false, x: 125, plane: 'near' } as WorldMark
const world = { place3: { kind: 'unknown' }, terrain: { horizonY: 70,
  near: { points: [[0, 110], [375, 110]], distanceKm: [1, 1] } }, labels: { height: { text: '', x: -100, y: 0 } },
  farCities: {}, marks: [], seatPool: [], air: { fade: () => 0 },
} as unknown as WorldState
const home = { left: 100, right: 120, hazeKm: 1 }

it.each(['none', 'near', 'far'])('culls a farther slid near foot behind a nearer glyph, seated=%s', seated => {
  const near = { ...baseMark, id: 'near', km: 6 }
  const far = { ...baseMark, id: 'far', km: 8 }
  const block: NeighbourBlock = { id: 'town', x: 125, w: 10, top: 99, foot: 100, hazeKm: 6 }
  const source = seated === 'near' ? near : far
  const seat = { ...source, seatBlockId: 'town', seatRank: 1 }
  const given = { ...world, marks: seated === 'none' ? [far, near] : seated === 'near' ? [far] : [near],
    seatPool: seated === 'none' ? [] : [seat] }
  // A painted wall leaves one valid gap position; the farther glyph cannot evade a hidden foot by sliding again.
  const mass = [{ left: 128.5, right: 375, top: 90, km: 1 }]
  const all = outsideMarks(given, 375, new Map([['town', block]]), [], () => 100, [...mass], home)
  expect(all.map(item => item.item.glyph.sourceId)).toEqual(['near'])
  expect(all[0].item.glyph.x).toBeGreaterThan(baseMark.x)
  // With no nearer glyph the farther one independently occupies the same home-gap boundary.
  const alone = outsideMarks({ ...given, marks: [far], seatPool: [] }, 375, new Map(), [], () => 100, [...mass], home)
  expect(alone).toHaveLength(1)
  expect(alone[0].item.glyph.x).toBeCloseTo(all[0].item.glyph.x, 8)
})

