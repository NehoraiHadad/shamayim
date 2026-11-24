import { expect, it } from 'vitest'
import { heightText } from '../text/isolate'
import { besideDot } from './place'
import { LABEL_PX, textWidth } from './layout'
import { heightLabelBox } from './sceneClearance'

it.each([
  ['1,013 מ׳', 39.144],
  ['-390 מ׳', 34.74],
  [heightText(-390), 37.008],
  [heightText(812), 30.42],
  ['פני הים', 32.94],
  ['(־)', 11.412],
])('fits Assistant 600 advances for %s within one CSS pixel', (text, painted) => {
  const measured = textWidth(text, LABEL_PX)
  expect(measured).toBeGreaterThanOrEqual(painted - 1e-9)
  expect(measured - painted).toBeLessThan(1)
})

it('combines sideways and vertical shifts to clear a spire above the roof', () => {
  const dot = { x: 180.25, y: 86.25 }
  const text = heightText(812)
  const roof = { left: 100, right: 260, top: 78, bottom: 110 }
  const spire = { left: 184, right: 190, top: 52, bottom: 110 }
  const spot = besideDot(dot, text, 375, [roof, { ...spire, priority: 'mark' }], [])!
  expect(spot.x).toBeGreaterThan(160)
  expect(spot.x).toBeLessThan(166)
  const badge = heightLabelBox({ ...spot, text, below: false, backed: true }, 375)
  expect(Number.isInteger(spot.x - dot.x)).toBe(true)
  expect(Number.isInteger(spot.y - dot.y)).toBe(true)
  expect(badge.y + badge.h).toBeLessThanOrEqual(78)
  expect(badge.y + badge.h).toBeGreaterThan(77)
})

it('chooses a mark-free spot even when it covers fabric', () => {
  const dot = { x: 180, y: 86 }
  const mark = { left: 0, right: dot.x, top: 0, bottom: 114, priority: 'mark' as const }
  const fabric = { ...mark, left: dot.x, right: 375, priority: undefined }
  const spot = besideDot(dot, heightText(812), 375, [mark, fabric], [])!
  expect(spot.x).toBeGreaterThan(dot.x)
})

it('keeps the badge and minimizes note overlap when every tethered spot is blocked', () => {
  const dot = { x: 180, y: 86 }
  const notes = [{ text: 'ים', kind: 'water' as const, left: 0, top: 40, width: 375, height: 88 }]
  const spot = besideDot(dot, heightText(812), 375, [], notes)!
  expect(spot.notes).toBeGreaterThan(0)
  expect(spot.x).toBe(dot.x)
  expect(spot.y).toBe(dot.y - 53) // 38.5 px tether plus 14.5 px from anchor to badge bottom.
})
