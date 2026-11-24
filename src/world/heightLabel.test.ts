import { expect, it } from 'vitest'
import { heightText } from '../text/isolate'
import { besideDot } from './heightLabel'
import { heightLabelBox } from './sceneClearance'

it('combines sideways and vertical shifts to clear a spire above the roof', () => {
  const dot = { x: 180.25, y: 86.25 }
  const text = heightText(812)
  const roof = { left: 100, right: 260, top: 78, bottom: 110 }
  const spire = { left: 184, right: 190, top: 52, bottom: 110 }
  const spot = besideDot(dot, text, [roof, { ...spire, priority: 'mark' }])!
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
  const spot = besideDot(dot, heightText(812), [mark, fabric])!
  expect(spot.x).toBeGreaterThan(dot.x)
})

it('keeps the badge and minimizes note overlap when every tethered spot is blocked', () => {
  const dot = { x: 180, y: 86 }
  const note = { left: 0, top: 40, right: 375, bottom: 128, priority: 'note' as const }
  const spot = besideDot(dot, heightText(812), [note])!
  expect(spot.notes).toBeGreaterThan(0)
  expect(spot.x).toBe(dot.x)
  expect(spot.y).toBe(dot.y - 53) // 38.5 px tether plus 14.5 px from anchor to badge bottom.
})

it('lets marks break a near tie when every badge intersects a note', () => {
  const dot = { x: 180, y: 86 }
  const text = heightText(812)
  const all = { left: 0, right: 375, top: 0, bottom: 128, priority: 'note' as const }
  const mark = { ...all, right: dot.x, priority: 'mark' as const }
  const noise = { ...all, left: dot.x + 1, bottom: 1e-10 }
  const spot = besideDot(dot, text, [all, mark])!
  const badge = heightLabelBox({ ...spot, text, backed: true, below: false }, 375)
  // Put a sub-micro-square-pixel note inside the winning badge, across its whole width range.
  const perturbed = besideDot(dot, text, [all, mark, { ...noise, top: badge.y + 1, bottom: badge.y + 1 + noise.bottom }])!
  expect(spot.x).toBeGreaterThan(dot.x)
  expect(perturbed).toEqual(spot)
})

it('avoids beyond silhouettes when the own fabric ties', () => {
  const dot = { x: 180, y: 86 }
  const text = heightText(812)
  const box = { left: 0, right: 375, top: 0, bottom: dot.y, priority: 'beyond' as const }
  expect(besideDot(dot, text, [box])!.y).toBeGreaterThan(dot.y)
  expect(besideDot(dot, text, [{ ...box, priority: undefined },
    { ...box, top: dot.y, bottom: 128 }])!.y).toBeGreaterThan(dot.y)
})

it('keeps a short tether when a tenth of a pixel of fabric or beyond touches the badge', () => {
  const dot = { x: 180, y: 86 }
  const text = heightText(812)
  const spot = besideDot(dot, text, [])!
  const badge = heightLabelBox({ ...spot, text, backed: true, below: false }, 375)
  const right = badge.x + badge.w
  const fleck = { left: right - .1, right: right + 12, top: badge.y, bottom: badge.y + badge.h, viewport: 375 }
  for (const priority of [undefined, 'beyond'] as const) {
    const next = besideDot(dot, text, [{ ...fleck, priority }])!
    expect([next.x, next.y]).toEqual([spot.x, spot.y])
  }
})
