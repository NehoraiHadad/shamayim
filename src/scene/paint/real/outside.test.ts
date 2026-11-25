import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { BOX, recordOutside } from '../../../test/outsideRecording'
import { SCENE_PLACES } from '../../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../../test/sceneWorld'
import { makeWorldBuilder } from '../../../world/world'
import { shineOf } from '../../model/marks'
import { outsideLayer } from '../../model/outside'
import type { LayerOf } from '../../model/types'
import { paintOutside } from './outside'

const record = (layer: LayerOf<'outside'>) => recordOutside(paintOutside, layer)

let jerusalem: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  const places = await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'jerusalem'))
  jerusalem = places.get('jerusalem')!
})
afterAll(() => vi.unstubAllGlobals())

it('keeps Jerusalem’s building geometry fixed as lateral light sweeps through even light', () => {
  const time = '2026-11-17T12:00'
  const layer = outsideLayer(makeWorldBuilder()(worldInput(jerusalem, time, time)), BOX)!
  expect(layer.sea).toBeNull()
  expect(layer.items.some(({ kind }) => kind === 'tower')).toBe(true)
  const at = (side: number) => record({ ...layer,
    shine: { ...layer.shine, night: .4, windows: .25, glint: .5,
      faces: { ...layer.shine.faces, across: side, left: Math.max(0, side), right: Math.max(0, -side) },
      cast: { dx: -side, length: 2, alpha: .25 } },
  })
  const even = at(0)
  expect(even.casts).toHaveLength(0)
  expect(even.form.length).toBeGreaterThan(0)
  const fixed = JSON.stringify(even.form)
  let previous = at(-1)
  const steps: number[] = []
  for (let i = 1; i <= 40; i++) {
    const side = (i - 20) / 20
    const frame = at(side)
    expect(JSON.stringify(frame.form) === fixed, `geometry at ${side}`).toBe(true)
    expect(frame.channels).toHaveLength(previous.channels.length)
    steps.push(frame.channels.reduce((max, value, j) => Math.max(max, Math.abs(value - previous.channels[j])), 0))
    previous = frame
  }
  steps.sort((a, b) => a - b)
  const median = (steps[19] + steps[20]) / 2
  expect(median).toBeGreaterThan(0)
  expect(steps.at(-1)).toBeLessThanOrEqual(3 * median + 1 / 255)

  // Cast paths alone may move. Near even light their projection and opacity both collapse to zero.
  for (const side of [-.0001, .0001]) {
    const { casts } = at(side)
    expect(casts.length).toBeGreaterThan(0)
    let towers = 0, boxes = 0
    for (const { span, alpha, path } of casts) {
      const [, , base] = path.find(([op]) => op === 'moveTo')!
      const [edge, tip, tail] = path.filter(([op]) => op === 'lineTo')
      const dir = -Math.sign(side), reach = (tip[1] - edge[1]) * dir
      const tower = Math.abs(edge[2] - base + .3) < 1e-7, box = Math.abs(edge[2] - base + .15) < 1e-7
      if (box) boxes++
      if (tower) {
        towers++
        expect(tip[2] - base).toBeCloseTo(.5, 10)
        expect(tail[2] - base).toBeCloseTo(1.2, 10)
        expect((tip[1] - tail[1]) * dir).toBeCloseTo(1.2, 10)
      }
      expect(reach).toBeGreaterThan(0)
      expect(Math.abs(reach)).toBeLessThan(.02)
      expect(span * dir).toBeCloseTo(reach + (tower ? .5 : 0), 10)
      expect(alpha).toBeCloseTo(.25 * reach * (tower ? .8 : box ? .6 : 1), 3)
    }
    expect(towers).toBe(layer.items.filter(({ kind }) => kind === 'tower').length)
    // Every box casts too: lighter than a tower's.
    expect(boxes).toBe(layer.items.filter(({ kind }) => kind === 'box').length)
  }
})

it('fades box lamp halos through their old cutoffs with fixed geometry', () => {
  const time = '2026-11-17T12:00'
  const layer = outsideLayer(makeWorldBuilder()(worldInput(jerusalem, time, time)), BOX)!
  const at = (night: number) => record({ ...layer, land: null,
    items: layer.items.filter(({ kind }) => kind === 'box' || kind === 'tower'),
    shine: { ...layer.shine, night, windows: 1, aviationStrength: 0, cast: { dx: 0, alpha: 0, length: 0 } },
  })
  const below = at(.599), above = at(.601), full = at(.8)
  const fixed = JSON.stringify(below.form)
  expect(JSON.stringify(above.form) === fixed).toBe(true)
  expect(JSON.stringify(full.form) === fixed).toBe(true)
  expect(above.channels).toHaveLength(below.channels.length)
  const step = above.channels.reduce((max, value, i) => Math.max(max, Math.abs(value - below.channels[i])), 0)
  expect(step).toBeLessThanOrEqual(1 / 255 + Number.EPSILON)
  const towers = layer.items.filter((item) => item.kind === 'tower' && (item.full || item.storeys >= 30)).length
  expect(below.halos.length).toBeGreaterThan(towers)
  expect(below.halos.every((alpha) => alpha === 0)).toBe(true)
  expect(full.halos.filter((alpha) => alpha === 0)).toHaveLength(towers)
})

it('keeps outside aviation halos and cores fixed as darkness and evening windows fade them in', () => {
  const time = '2026-11-17T12:00'
  const world = makeWorldBuilder()(worldInput(jerusalem, time, time))
  const layer = outsideLayer(world, BOX)!
  const items = layer.items.filter((item) => item.kind === 'tower' && (item.full || item.storeys >= 30))
  expect(items.length).toBeGreaterThan(0)
  const at = (dark: number, litShare: number) => {
    const shine = shineOf({ ...world, night: { ...world.night, dark, litShare, aviation: false } })
    return record({ ...layer, items, land: null, shine: { ...shine, windows: 0, cast: { dx: 0, alpha: 0, length: 0 } } })
  }
  const day = at(0, 0)
  const fixed = JSON.stringify(day.form)
  expect(day.halos).toEqual(items.map(() => 0))
  expect(at(1, 0).halos).toEqual(items.map(() => .55))
  expect(at(0, .04).halos).toEqual(items.map(() => .275))

  const sweep = (frames: number, step: number, maxSlope: number, paint: (value: number) => ReturnType<typeof at>) => {
    let previous = day
    for (let i = 1; i <= frames; i++) {
      const frame = paint(i * step)
      expect(JSON.stringify(frame.form)).toBe(fixed)
      expect(frame.channels).toHaveLength(previous.channels.length)
      const maxAlphaStep = frame.channels.reduce((max, value, j) => j % 4 === 3
        ? Math.max(max, Math.abs(value - previous.channels[j])) : max, 0)
      expect(maxAlphaStep).toBeLessThanOrEqual(maxSlope * step + .001)
      previous = frame
    }
  }
  // Smoothstep's steepest slope is 1.5 / width. The core can reach .8 in the darkness ramp,
  // or .6 in the lit-share ramp at fixed darkness. Account for the changing core and CSS rounding.
  sweep(200, .005, .5 + .8 * 1.5 / .2, (dark) => at(dark, 0))
  sweep(40, .001, .6 * 1.5 / .04, (share) => at(0, share))
})
