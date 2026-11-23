import { expect, it } from 'vitest'
import { recording } from '../../../../test/glyphRecording'
import { shine, tones } from '../../../../test/glyphTones'
import { css } from '../base/hand'
import { tree } from './marks'

it('fills all six palm fronds with even green at zero lateral light', () => {
  const { ctx, light } = recording()
  tree(ctx, { kind: 'palm', x: 40, base: 60, w: 6, h: 10, seed: 43 }, tones, shine, 0)
  expect(light.slice(2)).toEqual(Array.from({ length: 6 }, () => ['fillStyle', css(tones.green)]))
})
