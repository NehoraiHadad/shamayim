import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DOT_R, LABEL_H, LABEL_PX, overlaps, textWidth } from '../../world/layout'
import { BACKING_PAD, besideDot } from '../../world/place'
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

  it('uses the 12 px label box in besideDot and layoutOf, catching marks outside an 11 px box', () => {
    const dot = { x: 187.5, y: 80 }
    const text = '−137 מ׳'
    const w12 = textWidth(text, 12)
    const w11 = textWidth(text, 11)
    expect(LABEL_PX).toBe(12)
    expect(w12).toBeGreaterThan(w11)

    // Unobstructed placement: centred vertically on the dot at 12 px height, spaced for 12 px width.
    const free = besideDot(dot, text, 375, [], [])
    const leftEdge = dot.x + DOT_R + 2
    expect(free.x).toBeCloseTo(leftEdge + BACKING_PAD + w12 / 2, 6)
    expect(free.y).toBeCloseTo(dot.y - 12 / 2, 6)

    const box12 = {
      left: free.x - w12 / 2 - BACKING_PAD,
      right: free.x + w12 / 2 + BACKING_PAD,
      top: free.y - BACKING_PAD,
      bottom: free.y + 12 + BACKING_PAD,
    }
    const box11 = {
      left: leftEdge,
      right: leftEdge + w11 + 2 * BACKING_PAD,
      top: dot.y - 11 / 2 - BACKING_PAD,
      bottom: dot.y + 11 / 2 + BACKING_PAD,
    }
    expect(box12.right - box12.left).toBeCloseTo(w12 + 2 * BACKING_PAD, 6)
    expect(box12.bottom - box12.top).toBeCloseTo(12 + 2 * BACKING_PAD, 6)

    // A mark inside the 12 px width overhang but strictly outside an 11 px box (even with 0.5 px clearance pad).
    const widthSliver = { left: box11.right + 1, right: box12.right - 0.5, top: dot.y - 2, bottom: dot.y + 2 }
    expect(overlaps(box11, widthSliver, 0.5)).toBe(false)
    expect(overlaps(box12, widthSliver, 0.5)).toBe(true)
    const dodgedW = besideDot(dot, text, 375, [widthSliver], [])
    expect(dodgedW).not.toEqual(free)

    // A mark inside the 12 px height overhang (with 0.5 px pad) but strictly outside an 11 px box (+ 0.5 px pad).
    const heightSliver = { left: leftEdge + 2, right: leftEdge + 12, top: box11.bottom + 0.6, bottom: box12.bottom + 3 }
    expect(overlaps(box11, heightSliver, 0.5)).toBe(false)
    expect(overlaps(box12, heightSliver, 0.5)).toBe(true)
    const dodgedH = besideDot(dot, text, 375, [heightSliver], [])
    expect(dodgedH).not.toEqual(free)

    // Model clear zone for an unbacked height label reserves exact 12 px width and height.
    const world = {
      place3: { dot },
      labels: { height: { text, x: free.x, y: free.y, below: true }, notes: [], datum: null },
    } as unknown as WorldState
    const [, labelClear] = layoutOf(world, BOX).clear
    expect(labelClear).toEqual({ x: free.x - w12 / 2, y: free.y, w: w12, h: 12 })
  })
})
