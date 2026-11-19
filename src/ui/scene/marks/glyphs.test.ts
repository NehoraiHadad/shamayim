import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ICONS } from '../../../data/landmarks/curated'
import type { PlacedMark } from '../../../data/landmarks/types'
import { CURATED_BUILDINGS } from './curated'
import { BUILDINGS, FIELD_KINDS, type BuildingProps } from './generic/buildingSpecs'
import { isHillMark, planeOf } from './hillPlane'
import styles from './marks.module.css'
import { Shed, TileHouse } from './houses'

const draw = (key: string, props: Partial<BuildingProps> = {}) => {
  const spec = BUILDINGS[key]!
  return renderToStaticMarkup(createElement(spec.Draw, { h: spec.h(20), night: false, seed: 7, litShare: 1, ...props }))
}
const placed = (glyph: string, kind: PlacedMark['kind'], dy = 0, hPx = 20): PlacedMark => ({
  id: glyph, kind, glyph, layer: 'near', xPct: 50, baseY: 90, hPx, lights: 4, tall: true, dy,
})

/** Minimum box widths from ILLUSTRATION.md §3 (glyphs never shrink below them). */
const MIN_W: Record<string, number> = {
  highrise: 6, chimney: 9, cooling: 12, turbine: 1.6, mast: 5, minaret: 14, church: 12, waterTower: 9, castle: 16,
  synagogue: 11,
}

describe('px glyph specs', () => {
  it('meet the §3 minimum width and never draw shorter than asked', () => {
    for (const [kind, min] of Object.entries(MIN_W)) expect(BUILDINGS[kind]!.w).toBeGreaterThanOrEqual(min)
    for (const spec of Object.values(BUILDINGS)) expect(spec!.h(10)).toBeGreaterThanOrEqual(9)
  })

  it('every glyph renders a body by day and by night', () => {
    for (const key of Object.keys(BUILDINGS)) {
      expect(draw(key)).toMatch(/<(path|rect)/)
      expect(draw(key, { night: true })).toMatch(/<(path|rect)/)
    }
  })

  it('lights windows only at night', () => {
    expect(styles.win).toMatch(/win/)
    for (const key of ['highrise', 'tel-aviv-azrieli']) {
      expect(draw(key)).not.toContain(styles.win)
      expect(draw(key, { night: true })).toContain(styles.win)
    }
  })

  it('spins turbine blades and sways palm crowns only when motion is allowed', () => {
    expect(draw('turbine')).not.toContain(styles.blades)
    expect(draw('turbine', { spin: true })).toContain(styles.blades)
    expect(draw('palms')).toContain(styles.crown)
    expect(draw('palms')).not.toContain(styles.sway)
    expect(draw('palms', { sway: true })).toContain(styles.sway)
  })
})

describe('generic glyphs for every mapped kind', () => {
  it('draws each kind a famous OSM object can be read as (src/data/landmarks/overpass.ts) with its generic glyph', () => {
    const kinds: PlacedMark['kind'][] = ['highrise', 'chimney', 'cooling', 'mast', 'waterTower', 'minaret', 'church',
      'silo', 'lighthouse', 'turbine', 'bridge', 'castle', 'palms', 'synagogue', 'orchard', 'vineyard', 'solar']
    for (const kind of kinds) expect(Boolean(BUILDINGS[kind]) || FIELD_KINDS.has(kind)).toBe(true)
  })
})

describe('curated sets in the px layer', () => {
  it('draw every hand-drawn icon, and only those', () => {
    const marks = ICONS.map(({ mark }) => mark)
    expect(marks).toHaveLength(4)
    for (const mark of marks) expect(isHillMark(placed(mark.glyph!, mark.kind))).toBe(true)
    expect(Object.keys(CURATED_BUILDINGS).sort()).toEqual(marks.map(mark => mark.glyph).sort())
  })

  it('keep landmarks on the skyline unless tall and well behind it', () => {
    expect(planeOf(placed('jerusalem-bridge', 'custom', 2.16, 26))).toBe('behind')
    expect(planeOf(placed('jerusalem-wall', 'custom', .5, 9))).toBe('line')
    expect(planeOf(placed('tel-aviv-azrieli', 'custom', -.7, 31))).toBe('line')
    expect(planeOf(placed('palms', 'palms', 0, 11))).toBe('line')
    expect(planeOf(placed('solar', 'solar', -.6, 3))).toBe('face')
  })
})

it('a shed draws in at most 5 nodes and a tile house in at most 7, two storeys included', () => {
  const nodes = (markup: string) => markup.match(/<(rect|path)/g)?.length ?? 0
  expect(nodes(renderToStaticMarkup(createElement(Shed, { w: 12, h: 4 })))).toBeLessThanOrEqual(5)
  for (const seed of [0, 1, 2, 3]) for (const storeys of [undefined, 2 as const]) {
    expect(nodes(renderToStaticMarkup(createElement(TileHouse, { w: 9, h: 9.5, seed, storeys })))).toBeLessThanOrEqual(7)
  }
})
