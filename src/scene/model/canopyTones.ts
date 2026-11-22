import { encodedByte } from './displayByte'
import { byteKey } from './keys'
import { albedoLinear, shadeLinearRgb } from './landRadiance'
import { fieldSample, vegetationField } from './planeField'
import { TONE } from './vegSample'
import type { LayerOf, RGB } from './types'

export interface CanopyTones { trees: Uint8Array; tufts: Uint8Array }
export const TREE_TONE_STRIDE = 9
export const TUFT_TONE_STRIDE = 6

export function plantInk(bytes: Uint8Array, offset: number): RGB {
  return [bytes[offset] / 255, bytes[offset + 1] / 255, bytes[offset + 2] / 255]
}

export function canopyTones(plane: LayerOf<'plane'>, shaded: boolean) {
  const veg = plane.vegetation, field = plane.light.litField
  const palette = veg.tones.map((rgb) => albedoLinear(rgb, 1))
  const sample = vegetationField(field, plane.outline, plane.bounds)
  const light = fieldSample(), rgb: [number, number, number] = [0, 0, 0]
  const trees = new Uint8Array(veg.trees.length / 6 * TREE_TONE_STRIDE)
  const tufts = new Uint8Array(veg.tufts.length / 4 * TUFT_TONE_STRIDE)
  const write = (dest: Uint8Array, o: number, index: number, beam: number) => {
    shadeLinearRgb(palette[index] ?? palette[0], field.eSun, field.eMoon, field.eSky,
      light.sVis * beam, light.mVis, light.vSky, field.yHorizon, light.haze, field.hazeLin, rgb)
    dest[o] = encodedByte(rgb[0]); dest[o + 1] = encodedByte(rgb[1]); dest[o + 2] = encodedByte(rgb[2])
  }
  const beam = shaded ? 0 : 1
  if (palette.length) {
    for (let i = 0; i < veg.trees.length; i += 6) {
      const m = i / 2, kind = veg.treeMeta[m], o = m * 3
      if (veg.treeMeta[m + 2] <= 5) continue
      sample(veg.trees[i], veg.trees[i + 1], light)
      write(trees, o, veg.treeMeta[m + 1], beam)
      if (kind === 3) {
        write(trees, o + 3, TONE.TRUNK, beam)
        write(trees, o + 6, TONE.GRASS_LIT, beam)
      } else {
        if (kind === 0 || veg.trees[i + 2] >= 0.85) write(trees, o + 3, TONE.PINE_UNDER, beam)
        if (veg.trees[i + 2] >= 0.85) write(trees, o + 6, TONE.PINE_LIT, beam)
      }
    }
    for (let i = 0; i < veg.tufts.length; i += 4) {
      if (veg.tufts[i + 3] <= 0.02) continue
      const m = i / 2, o = m * 3
      sample(veg.tufts[i], veg.tufts[i + 1], light)
      write(tufts, o, veg.tuftMeta[m + 1], beam)
      write(tufts, o + 3, veg.tuftMeta[m] === 1 ? TONE.GRASS_LIT : TONE.SHRUB_LIT, beam)
    }
  }
  return { trees, tufts, key: byteKey(trees) + '.' + byteKey(tufts) }
}
