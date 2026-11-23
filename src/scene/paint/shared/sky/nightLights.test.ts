import { expect, it } from 'vitest'
import { distance, recording } from '../../../../test/glyphRecording'
import { evenTone, litTone } from '../../../../test/glyphTones'
import type { LayerOf } from '../../../model/types'
import type { PaintEnv } from '../base/hand'
import { paintAircraft } from '../life/life'
import { paintStars } from './bodies'
import { paintPlanets } from './nightSky'

it('fades aircraft lights and planet halos without changing their geometry', () => {
  const base = { id: 'dusk', surface: 'sky', z: 1, key: 'dusk', bounds: { x: 0, y: 0, w: 100, h: 100 } } as const
  const aircraft: LayerOf<'aircraft'> = { ...base, kind: 'aircraft', x: 40, y: 40, size: 3, angle: 0,
    lights: 0, landing: true, trail: 0, rgb: evenTone, lit: litTone, trailRgb: litTone, seed: 0 }
  for (const phase of [0, .5]) { // Both flashed lights, plus the steady navigation and landing lights.
    const env: PaintEnv = { phase, scale: 1, hand: { grain: 0 }, canvas: () => { throw new Error('Unexpected scratch canvas') } }
    const at = (night: number) => {
      const draw = recording()
      paintAircraft(draw.ctx, { ...aircraft, lights: night }, env)
      paintPlanets(draw.ctx, { ...base, kind: 'planets',
        planets: [{ name: 'venus', x: 20, y: 20, r: 1, rgb: litTone, alpha: night, glow: night }] }, env)
      return draw
    }
    let previous = at(0)
    const fixed = JSON.stringify(previous.form)
    for (let i = 1; i <= 200; i++) {
      const frame = at(i / 200)
      expect(JSON.stringify(frame.form)).toBe(fixed)
      // The steepest change is the aircraft body. Its .1-wide ramp has slope at most 15,
      // its base alpha is at most .28 during that ramp and changes by .8 per night unit.
      expect(distance(frame.channels, previous.channels)).toBeLessThanOrEqual((.8 + .28 * 15) / 200 + .001)
      previous = frame
    }
  }
})

it.each([[0.4, false], [0.5, false], [0.501, true], [0.55, true], [0.6, true]] as const)(
  'keeps the star halo appearance at full-night alpha %f',
  (alpha, halo) => {
    const draw = recording()
    const env: PaintEnv = { phase: 0, scale: 1, hand: { grain: 0 }, canvas: () => { throw new Error('Unexpected scratch canvas') } }
    paintStars(draw.ctx, { id: 'stars', kind: 'stars', z: 2, key: 'stars', surface: 'sky',
      bounds: { x: 0, y: 0, w: 100, h: 100 }, through: 1, stars: [{ x: 30, y: 30, r: 1, alpha }] }, env)
    expect(draw.light.filter(([op]) => op === 'createRadialGradient')).toHaveLength(Number(halo))
    expect(draw.light.filter(([op]) => op === 'stop')).toEqual(halo ? [
      ['stop', `rgb(232 238 255 / ${(0.25 * alpha).toFixed(3)})`], ['stop', 'rgb(232 238 255 / 0)'],
    ] : [])
  },
)
