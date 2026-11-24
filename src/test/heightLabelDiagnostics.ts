import { vi } from 'vitest'
import { besideDot } from '../world/heightLabel'
import * as backdrop from '../world/labelBackdrop'
import type { HeightLeader } from '../scene/model/heightLeader'
import type { GlyphDesc } from '../scene/model/types'
import type { Box } from '../world/layout'

export function unquantizedSpot(args: Parameters<typeof besideDot>) {
  const steps = vi.spyOn(backdrop, 'backdropSteps').mockImplementation(area => area)
  const contact = vi.spyOn(backdrop, 'hasVisibleContact').mockReturnValue(true)
  try { return besideDot(...args) }
  finally { steps.mockRestore(); contact.mockRestore() }
}

export const glyphBox = (m: GlyphDesc): Box => ({
  left: m.x - m.w / 2, right: m.x + m.w / 2,
  top: m.base - (m.ground ? 1.6 : m.h * m.scale),
  bottom: m.base + (m.ground ? m.h : 0),
})

function crosses(line: HeightLeader, box: Box) {
  let enter = 0, leave = 1
  for (const [start, end, min, max] of [
    [line.x1, line.x2, box.left, box.right], [line.y1, line.y2, box.top, box.bottom],
  ]) {
    if (start === end) {
      if (start < min || start > max) return false
    } else {
      const first = (min - start) / (end - start), last = (max - start) / (end - start)
      enter = Math.max(enter, Math.min(first, last))
      leave = Math.min(leave, Math.max(first, last))
    }
  }
  return enter <= leave
}

function leaderCrossings(line: HeightLeader | null, notes: Box[], datum: Box[], glyphs: GlyphDesc[]) {
  return {
    note: !!line && notes.some(box => crosses(line, box)),
    datum: !!line && datum.some(box => crosses(line, box)),
    mark: !!line && glyphs.some(mark => crosses(line, glyphBox(mark))),
  }
}

export function tallyLeader(count: { places: number; any: number; note: number; datum: number; mark: number },
  line: HeightLeader | null, notes: Box[], datum: Box[], glyphs: GlyphDesc[]) {
  const crossed = leaderCrossings(line, notes, datum, glyphs)
  count.places++
  if (crossed.note || crossed.datum || crossed.mark) count.any++
  for (const type of ['note', 'datum', 'mark'] as const) if (crossed[type]) count[type]++
}
