import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LABEL_PX, letterWidth, textWidth } from '../../world/layout'
import { heightLabelBox } from '../../world/sceneClearance'
import type { SceneStyle } from '../paint/painters'
import { HeightLabel } from './HeightLabel'
import { HEIGHT_HANDS } from './heightHands'

const text = '−137 מ׳'

describe.each(Object.keys(HEIGHT_HANDS) as SceneStyle[])('the height in the %s hand', (id) => {
  it('is lettered no smaller than the layout says, with room for its letters', () => {
    expect(HEIGHT_HANDS[id].size).toBeGreaterThanOrEqual(LABEL_PX)
    expect(letterWidth(text)).toBeGreaterThanOrEqual(textWidth(text, HEIGHT_HANDS[id].size))
    expect(heightLabelBox({ text, x: 200, y: 40 }, 750)).toEqual({ x: 400 - letterWidth(text) / 2, y: 40, w: letterWidth(text), h: 9 })
  })

  it('costs a handful of nodes, the letters written once over their halo', () => {
    const item = { kind: 'height' as const, text, x: 190, y: 40, spot: { x: 187.5, y: 80 },
      tone: { ink: '#203040', halo: '#E0E4E8' }, dot: '#203040' }
    const html = renderToStaticMarkup(createElement(HeightLabel, { item, left: '50%', hand: id }))
    expect(html.match(/<[a-z]/g)!.length).toBeLessThanOrEqual(4)
    expect(html).toContain('<path')
    expect(renderToStaticMarkup(createElement(HeightLabel, { item: { ...item, dot: null }, left: '50%', hand: id }))).not.toContain('<path')
    expect(html.split(text).length - 1).toBe(2)
  })
})
