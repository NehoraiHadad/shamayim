import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LABEL_H, LABEL_PX, textWidth } from '../../world/layout'
import { BACKING_PAD } from '../../world/place'
import { heightLabelBox } from '../../world/sceneClearance'
import type { WorldState } from '../../world/types'
import { layoutOf } from './layout'
import type { SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }

/** Rules in a stylesheet whose selector list contains `selector`. */
function cssBodiesFor(css: string, selector: string) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const bodies: string[] = []
  for (const [, header, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (header.split(',').some((s) => s.trim() === selector)) bodies.push(body)
  }
  return bodies.join('\n')
}

describe('height label size: one source of truth for CSS and collision layout', () => {
  it('matches --text-caption (0.75rem × 16) and .depth line-height: 1 in CSS', () => {
    const tokensCss = readFileSync(new URL('../../ui/tokens.css', import.meta.url), 'utf8')
    const indexCss = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
    const sceneCss = readFileSync(new URL('../react/Scene.module.css', import.meta.url), 'utf8')

    const caption = tokensCss.match(/--text-caption:\s*([0-9.]+)rem\s*;/)
    expect(caption, '--text-caption token in ui/tokens.css').not.toBeNull()
    const rem = Number(caption![1])
    expect(rem).toBe(0.75)
    expect(rem * 16).toBe(LABEL_PX)

    // Root rem stays at browser 16 px (index.css keeps body at 100%, no html font-size override).
    expect(cssBodiesFor(indexCss, 'html')).not.toMatch(/font-size\s*:/)
    expect(cssBodiesFor(indexCss, 'body')).toMatch(/font-size:\s*100%\s*;/)

    const depth = cssBodiesFor(sceneCss, '.depth')
    expect(depth).toMatch(/font-size:\s*var\(--text-caption\)\s*;/)
    const lh = depth.match(/line-height:\s*([0-9.]+)\s*;/)
    expect(lh, '.depth line-height in Scene.module.css').not.toBeNull()
    expect(Number(lh![1])).toBe(1)
    expect(LABEL_H).toBe(LABEL_PX * Number(lh![1]))
  })

  it('reserves the full unbacked line and leaves the backed label out of clearance', () => {
    const dot = { x: 187.5, y: 80 }
    const height = { text: '−137 מ׳', x: 187.5, y: 60, below: true }
    const world = { place3: { dot }, labels: { height, notes: [], datum: null } } as unknown as WorldState
    const w = textWidth(height.text, LABEL_PX)
    expect(w).toBeGreaterThan(textWidth(height.text, 11))
    expect(layoutOf(world, BOX).clear[1]).toEqual({ x: height.x - w / 2, y: height.y, w, h: LABEL_H })
    const backed = { ...height, backed: true }
    expect(layoutOf({ ...world, labels: { ...world.labels, height: backed } }, BOX).clear).toHaveLength(1)
    expect(heightLabelBox(backed, BOX.width)).toMatchObject({ w: w + 2 * BACKING_PAD, h: LABEL_H + 2 * BACKING_PAD })
    const css = readFileSync(new URL('../react/SceneOverlay.module.css', import.meta.url), 'utf8')
    expect(Number(cssBodiesFor(css, '.backed').match(/padding:\s*([\d.]+)px/)?.[1])).toBe(BACKING_PAD)
  })
})
