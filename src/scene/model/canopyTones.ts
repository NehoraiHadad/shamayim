import { encodedByte } from './displayByte'
import { byteKey } from './keys'
import { albedoLinear, shadeLinearRgb } from './landRadiance'
import { fieldSample, vegetationField } from './planeField'
import { plantVisible } from './plantVisibility'
import { TONE } from './vegSample'
import type { LayerOf, RGB } from './types'

export interface CanopyTones { trees: Uint8Array; tufts: Uint8Array }
export const TREE_TONE_STRIDE = 9
export const TUFT_TONE_STRIDE = 6

export function plantInk(bytes: Uint8Array, offset: number): RGB {
  return [bytes[offset] / 255, bytes[offset + 1] / 255, bytes[offset + 2] / 255]
}

export function canopyTones(plane: LayerOf<'plane'>, paired: boolean) {
  const veg = plane.vegetation, field = plane.light.litField
  const palette = veg.tones.map((rgb) => albedoLinear(rgb, 1))
  const sample = vegetationField(field, plane.outline, plane.bounds)
  const light = fieldSample(), rgb: [number, number, number] = [0, 0, 0]
  const allocate = (): CanopyTones => ({
    trees: new Uint8Array(veg.trees.length / 6 * TREE_TONE_STRIDE),
    tufts: new Uint8Array(veg.tufts.length / 4 * TUFT_TONE_STRIDE),
  })
  const tones = allocate()
  const shaded = paired ? allocate() : undefined
  const write = (dest: Uint8Array, o: number, index: number, beam: number) => {
    shadeLinearRgb(palette[index] ?? palette[0], field.eSun, field.eMoon, field.eSky,
      light.sVis * beam, light.mVis, light.vSky, field.yHorizon, light.haze, field.hazeLin, rgb)
    dest[o] = encodedByte(rgb[0]); dest[o + 1] = encodedByte(rgb[1]); dest[o + 2] = encodedByte(rgb[2])
  }
  const tone = (part: keyof CanopyTones, o: number, index: number) => {
    write(tones[part], o, index, 1)
    if (shaded) {
      if (light.sVis) write(shaded[part], o, index, 0)
      else {
        shaded[part][o] = tones[part][o]
        shaded[part][o + 1] = tones[part][o + 1]
        shaded[part][o + 2] = tones[part][o + 2]
      }
    }
  }
  if (palette.length) {
    for (let i = 0; i < veg.trees.length; i += 6) {
      const m = i / 2, kind = veg.treeMeta[m], o = m * 3
      if (!plantVisible((veg.treeMeta[m + 2] ?? 255) / 255)) continue
      sample(veg.trees[i], veg.trees[i + 1], light)
      tone('trees', o, veg.treeMeta[m + 1])
      if (kind === 3) {
        tone('trees', o + 3, TONE.TRUNK)
        tone('trees', o + 6, TONE.GRASS_LIT)
      } else {
        if (kind === 0 || veg.trees[i + 2] >= 0.85) tone('trees', o + 3, TONE.PINE_UNDER)
        if (veg.trees[i + 2] >= 0.85) tone('trees', o + 6, TONE.PINE_LIT)
      }
    }
    for (let i = 0; i < veg.tufts.length; i += 4) {
      if (!plantVisible(veg.tufts[i + 3])) continue
      const m = i / 2, o = m * 3
      sample(veg.tufts[i], veg.tufts[i + 1], light)
      tone('tufts', o, veg.tuftMeta[m + 1])
      tone('tufts', o + 3, veg.tuftMeta[m] === 1 ? TONE.GRASS_LIT : TONE.SHRUB_LIT)
    }
  }
  const keyed = (ink: CanopyTones) => ({ ...ink, key: byteKey(ink.trees) + '.' + byteKey(ink.tufts) })
  return { tones: keyed(tones), shadedTones: shaded && keyed(shaded) }
}
