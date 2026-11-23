import type { WorldMark } from '../../world/markGeometry'
import { visibleOutsideMark } from '../../world/outsideSeats'
import { heightLabelBox } from '../../world/sceneClearance'
import type { HomeRoofline, NeighbourBlock } from './neighbourPlacement'
import { evaluateNeighbour } from './evaluateNeighbour'
import { markDescriptor } from './markDescriptor'
import { needsTown } from '../../world/markContext'
import { SCENE_W } from '../../world/sceneBox'
import { budgetSeated } from '../../world/seatBudget'
import type { WorldState } from '../../world/types'
import type { DrawnMass } from './markOcclusion'
import { nearestMarks } from './nearestMarks'
import type { Box, Tones } from './types'

/** Sort just in front of other outside items at the same base, without moving the painted glyph. */
const MARK_DEPTH_OFFSET_PX = .01

export function outsideMarks(world: WorldState, width: number, drawnBlocks: ReadonlyMap<string, NeighbourBlock>,
  clear: readonly Box[], behind: (x: number, y: number) => number, mass: DrawnMass[], home: HomeRoofline | null) {
  const sx = width / SCENE_W
  const zones = world.labels.height.backed ? [...clear, heightLabelBox(world.labels.height, width)] : clear
  const neighbour = <T extends WorldMark>(mark: T, foreground: DrawnMass[]) => {
    const town = needsTown(world, mark)
    const block = town ? drawnBlocks.get(mark.seatBlockId ?? mark.supportBlockId ?? '') : null
    const result = evaluateNeighbour(world, mark, width, block, home, zones, foreground)
    if (!result.placed) return null
    const ground = behind(result.placed.x / sx, result.placed.mark.base)
    return { ...result.placed, hazeKm: Math.min(result.hazeKm, block?.hazeKm ?? ground), supportId: result.supportId, town }
  }
  const ordinary = world.marks.filter(mark => mark.plane === 'near' && mark.seatBlockId === undefined)
  const sources = new Map(world.seatPool.map(mark => [mark.id, mark]))
  let pool = world.seatPool.flatMap(mark => {
    const seat = neighbour(mark, mass)
    return seat ? [seat] : []
  })
  for (;;) {
    const seats = budgetSeated(pool)
    const candidates = [...ordinary, ...seats.map(seat => sources.get(seat.mark.id)!)]
    const result = nearestMarks(candidates, mass, (mark, foreground) => {
      if (mark.sightKm !== undefined || mark.seatBlockId !== undefined) return neighbour(mark, foreground)
      const seat = visibleOutsideMark(mark, mark.x * sx, clear)[0]
      const ground = seat ? behind(seat.x / sx, seat.mark.base) : Infinity
      return seat ? { ...seat, hazeKm: Number.isFinite(ground) ? ground : mark.km,
        supportId: undefined as string | undefined, town: false } : null
    })
    const kept = new Set(result.kept.map(seat => seat.mark.id))
    const hidden = new Set(seats.filter(seat => !kept.has(seat.mark.id)).map(seat => seat.mark.id))
    if (hidden.size) {
      // Release seats hidden by any nearer glyph, then refill without letting unselected seats cast occluders.
      pool = pool.filter(seat => !hidden.has(seat.mark.id))
      continue
    }
    mass.push(...result.mass.slice(mass.length))
    return result.kept.map(({ mark, x, hazeKm, supportId, town }) => ({
      y: mark.base + MARK_DEPTH_OFFSET_PX,
      item: { kind: 'mark' as const, glyph: markDescriptor(world, mark, x,
        undefined as unknown as Tones, hazeKm, supportId, town) }, km: hazeKm,
    }))
  }
}
