import { expect, it } from 'vitest'
import { recording } from '../../test/glyphRecording'
import type { RGB, Shine } from '../model/types'
import { paintBoxWindows, type Box } from './outsideWindows'

it('lays eave and parapet shade over lit upper panes at dusk without shading the lower row', () => {
  const box: Box = { kind: 'box', x: 3.25, w: 6, top: .125, foot: 6.125, storeys: 2, seed: 1,
    tier: 0, receiver: 0, folded: false, heater: false, roof: null }
  const shade: RGB = [0, 0, 0], deep: RGB = [0, 0, .2], warm: RGB = [1, .8, .6]
  const shine: Shine = { night: .7, windows: .5, direct: .04, cast: { dx: 0, length: 0, alpha: 0 },
    faces: { front: 0, left: 0, right: 0, top: 0, rim: 0, across: 0 }, aviationStrength: 0, lean: 0 }
  const draw = (roof: Box['roof'], windows: number) => {
    const canvas = recording()
    paintBoxWindows(canvas.ctx, { ...box, roof }, { shade, deep, win: warm }, { ...shine, windows }, [], () => .4,
      warm, deep, warm, 2)
    return canvas
  }

  const panes = [.825, 3.825].flatMap((y) => [1.5, 2.75, 4].map((x) => ['fillRect', x, y, .55, .6]))
  const apertureClip = [['save'], ['beginPath'], ['rect', 1.5, .5, 1, 1], ['rect', 2.5, .5, 1, 1],
    ['rect', 4, .5, 1, 1], ['clip']]
  const flat = draw(null, shine.windows), tile = draw('tile', shine.windows)
  expect(flat.form).toEqual([...panes, ...apertureClip, ['fillRect', .25, .575, 6, .3], ['fillRect', .25, .875, 6, .4], ['restore']])
  expect(tile.form).toEqual([...panes, ...apertureClip, ['fillRect', .25, .275, 6, .35], ['fillRect', .25, .625, 6, .45], ['restore']])
  expect(flat.light.slice(-2)).toEqual([['fillStyle', 'rgb(0 0 51 / 0.350)'], ['fillStyle', 'rgb(0 0 51 / 0.100)']])
  expect(tile.light.slice(-2)).toEqual([['fillStyle', 'rgb(0 0 0 / 0.500)'], ['fillStyle', 'rgb(0 0 0 / 0.180)']])
  expect(draw(null, 0).form).toEqual(panes)
})
