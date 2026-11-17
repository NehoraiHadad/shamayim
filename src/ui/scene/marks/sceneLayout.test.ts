import { describe, expect, it } from 'vitest'
import type { PlacedMark } from '../../../data/landmarks/types'
import { markGeometry, overlaps, type Box } from './markBox'
import { captionBox, fitMarks, hillBoxes, placeLabel, SHEET_CLEAR, textWidth, VISIBLE_BOTTOM } from './sceneLayout'

const W = 375
const mark = (glyph: string, x: number, extra: Partial<PlacedMark> = {}): PlacedMark => ({
  id: `${glyph}-${x}`, kind: glyph === 'haifa-bab' ? 'custom' : glyph as PlacedMark['kind'], glyph, layer: 'near',
  xPct: x / W * 100, baseY: 0, hPx: 14, lights: 0, tall: false, dy: 0, ...extra,
})
const flat = (y: number) => () => y
/** A ridge peaking at x 187 (y 40) that falls 0.5 px per px to each side. */
const ridge = (x: number) => 40 + Math.abs(x - 187) * .5
const xOf = (placed: PlacedMark) => placed.xPct / 100 * W
const labelBox = (spot: { x: number; y: number }, text: string): Box => {
  const w = textWidth(text, 11)
  return { left: spot.x - w / 2, right: spot.x + w / 2, top: spot.y, bottom: spot.y + 11 }
}

describe('scene layout', () => {
  it('keeps the elevation label off a mark that stands where it would sit', () => {
    const dot = { x: 187, y: 40 }
    const shrine = { left: 180, right: 200, top: 30, bottom: 70 }
    const spot = placeLabel({ dot, text: '256 מ׳', top: 47, minTop: 0, obstacles: [shrine], width: W })
    expect(overlaps(labelBox(spot, '256 מ׳'), shrine)).toBe(false)
    expect(Math.abs(spot.x - dot.x)).toBeLessThanOrEqual(60)
  })

  it('leaves a clear label where it is, and never under the sheet or above the sea line', () => {
    const dot = { x: 187, y: 40 }
    expect(placeLabel({ dot, text: '256 מ׳', top: 47, minTop: 0, obstacles: [], width: W })).toEqual({ x: 187, y: 47 })
    const low = placeLabel({ dot: { x: 187, y: 96 }, text: '12 מ׳', top: 103, minTop: 0, obstacles: [], width: W })
    expect(low.y + 11).toBeLessThanOrEqual(VISIBLE_BOTTOM - 1)
    const palms = { left: 150, right: 170, top: 83, bottom: 97 }
    const below = placeLabel({ dot: { x: 160, y: 96 }, text: '−175 מ׳', top: 78, minTop: 74, obstacles: [palms], width: W })
    expect(below.y).toBeGreaterThanOrEqual(74)
    expect(overlaps(labelBox(below, '−175 מ׳'), palms)).toBe(false)
  })

  it('keeps the label clear of the sun-event caption', () => {
    const caption = captionBox('שקיעה 16:42', 'west', W)
    const spot = placeLabel({ dot: { x: 60, y: 10 }, text: '859 מ׳', top: 17, minTop: 0, obstacles: [caption], width: W })
    expect(overlaps(labelBox(spot, '859 מ׳'), caption)).toBe(false)
  })

  it('drops a generic mark whose base meets the sheet edge, and lifts a curated one a little', () => {
    const ground = flat(VISIBLE_BOTTOM - SHEET_CLEAR + 2)
    const [bab] = fitMarks([mark('palms', 100), mark('haifa-bab', 250)], ground, W, { x: 20, y: 0 })
    expect(bab.glyph).toBe('haifa-bab')
    expect(markGeometry(bab, xOf(bab), ground)!.base).toBeLessThanOrEqual(VISIBLE_BOTTOM - SHEET_CLEAR)
    expect(fitMarks([mark('haifa-bab', 250)], flat(VISIBLE_BOTTOM + 4), W, { x: 20, y: 0 })).toEqual([])
    const high = mark('palms', 100)
    expect(fitMarks([high], flat(60), W, { x: 20, y: 0 })).toEqual([high])
  })

  it('steps a mark off the village dot', () => {
    const dot = { x: 187, y: 41 }
    const [palms] = fitMarks([mark('palms', 190)], ridge, W, dot)
    const box = markGeometry(palms, xOf(palms), ridge)!.box
    expect(overlaps(box, { left: dot.x - 4.5, right: dot.x + 4.5, top: dot.y - 4.5, bottom: dot.y + 4.5 })).toBe(false)
  })

  it('slides a field up onto the visible face when the ground is at the sheet edge', () => {
    /** Low valley floor to the left, slope rising to the right. */
    const valley = (x: number) => x < 200 ? 97 : Math.max(50, 97 - (x - 200) * .8)
    const [orchard] = fitMarks([mark('orchard', 190, { dy: -.2 })], valley, W, { x: 170, y: 96 })
    const [box] = hillBoxes([orchard], valley, W)
    expect(box.bottom).toBeLessThanOrEqual(VISIBLE_BOTTOM - 2 + 1e-9)
    expect(orchard.fieldDepth ?? 1).toBeGreaterThanOrEqual(1)
  })
})
