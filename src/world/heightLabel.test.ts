import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { ratio } from '../theme/contrast'
import { sheetLight } from '../theme/sheetLight'
import { heightText } from '../text/isolate'
import { besideDot, coveredArea } from './heightLabel'
import { LABEL_PX, textWidth } from './layout'
import { heightLabelBox } from './sceneClearance'

it.each([
  ['1,013 מ׳', 39.144],
  ['-390 מ׳', 34.74],
  [heightText(-390), 37.008],
  [heightText(812), 30.42],
  ['פני הים', 32.94],
])('fits Assistant 600 advances for %s within one CSS pixel', (text, painted) => {
  const measured = textWidth(text, LABEL_PX)
  expect(measured).toBeGreaterThanOrEqual(painted - 1e-9)
  expect(measured - painted).toBeLessThan(1)
})

it('puts the badge above occupied roofs and tethers it to the ring and nearest edge', () => {
  const dot = { x: 180, y: 86 }
  const text = heightText(812)
  const roof = { left: 100, right: 260, top: 63, bottom: 110 }
  const spot = besideDot(dot, text, 375, [roof])
  const badge = heightLabelBox({ ...spot, text, backed: true }, 375)
  expect(coveredArea({ left: badge.x, right: badge.x + badge.w, top: badge.y, bottom: badge.y + badge.h }, roof)).toBe(0)
  expect(spot.x).toBe(dot.x)
  expect(spot.leader).toEqual({ x1: dot.x, y1: 81.5, x2: dot.x, y2: 63 })
})

it('keeps a nearby height badge untethered', () => {
  expect(besideDot({ x: 180, y: 86 }, heightText(812), 375, []).leader).toBeNull()
})

it('uses opaque paper and its text token with at least WCAG AA contrast', () => {
  const css = readFileSync(new URL('../scene/react/SceneOverlay.module.css', import.meta.url), 'utf8')
  const backing = css.match(/\.backed\s*\{([^}]+)\}/)?.[1] ?? ''
  const token = (property: string) => backing.match(new RegExp(`^\\s*${property}: var\\((--[\\w-]+)\\);`, 'm'))?.[1]
  expect(token('background')).toBe('--sheet')
  expect(token('color')).toBe('--sheet-ink')
  for (const weather of ['clearDay', 'cloudy', 'rain', 'dusk', 'night'] as const) {
    for (const [alt, dark] of [[40, false], [0, false], [-20, true]] as const) {
      const palette = sheetLight(alt, weather, dark)
      expect(ratio(palette.sheetInk, palette.sheet)).toBeGreaterThanOrEqual(4.5)
    }
  }
})

it('uses the tree side when every spot covers fabric', () => {
  const dot = { x: 180, y: 86 }
  const tree = { left: 0, right: dot.x, top: 0, bottom: 128 }
  const house = { ...tree, left: dot.x, right: 375, weight: 2 }
  const text = heightText(812)
  const spot = besideDot(dot, text, 375, [tree, house])
  const badge = heightLabelBox({ ...spot, text, backed: true }, 375)
  expect(badge.x + badge.w).toBeLessThanOrEqual(dot.x)
  expect(spot.leader).toBeNull()
})


it('keeps the badge within reach when the first free roof edge is too far away', () => {
  const dot = { x: 180, y: 100 }
  const roof = { left: 0, right: 375, top: 60, bottom: 114 }
  const spot = besideDot(dot, heightText(812), 375, [roof])
  expect(spot.leader).not.toBeNull()
  const { x1, y1, x2, y2 } = spot.leader!
  expect(Math.hypot(x2 - x1, y2 - y1)).toBeCloseTo(34)
})

it('accounts for the badge area beyond an 11 px text box in both dimensions', () => {
  const dot = { x: 180, y: 86 }
  const text = heightText(812)
  const free = besideDot(dot, text, 375, [])
  const badge = heightLabelBox({ ...free, text, backed: true }, 375)
  const right = badge.x + badge.w
  const slivers = [
    { left: right - .5, right, top: badge.y + 3, bottom: badge.y + 4 },
    { left: free.x - 1, right: free.x + 1, top: badge.y + badge.h - .75, bottom: badge.y + badge.h - .25 },
  ]
  for (const sliver of slivers) {
    const moved = heightLabelBox({ ...besideDot(dot, text, 375, [sliver]), text, backed: true }, 375)
    expect(coveredArea({ left: moved.x, right: moved.x + moved.w, top: moved.y, bottom: moved.y + moved.h }, sliver)).toBe(0)
  }
})
