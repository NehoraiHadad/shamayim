import { plantInk, TREE_TONE_STRIDE } from '../../../../src/scene/model/canopyTones'
import { plantVisible } from '../../../../src/scene/model/plantVisibility'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { TONE } from '../../../../src/scene/model/vegSample'
import { mix, outline, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { paintCanopy as paintToday } from '../../../../src/scene/paint/shared/land/canopy'
import { paintVegTufts } from '../../../../src/scene/paint/shared/land/landVegTufts'
import { treeBend, treeCrownAnchor } from '../../../../src/scene/paint/shared/land/landVegPose'
import { mapInk, receiverBrush, type ReceiverInk } from '../../../../src/scene/paint/shared/land/receiverBrush'
import { lightSide } from './facts'
import { crown, underShade } from './foliage'

/*
 * The plants in natural light: every crown a mass of leaf clumps (`foliage.ts`) in the model's own tones, its greens a
 * little drier and deeper than today's, a soft shade beside it. Palms keep today's hand.
 */

/** How far the crowns' ink is taken toward its own grey, and its underside toward the dark. */
const DRY = 0.1
const UNDER: RGB = [0.05, 0.08, 0.06]

const grey = (rgb: RGB) => 0.3 * rgb[0] + 0.55 * rgb[1] + 0.15 * rgb[2]
const dry = (rgb: RGB): RGB => { const g = grey(rgb); return mix(rgb, [g, g, g], DRY) }

export function paintCanopy(ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv): void {
  const { trees, treeMeta, tones } = desc.vegetation, count = trees.length / 6
  for (let i = 0; i < count; i++) if (treeMeta[i * 3] === 3) return paintToday(ctx, desc, env)
  const targets = env.shade ? [ctx, env.shade] : [ctx]
  for (const target of targets) target.save()
  const brush = receiverBrush(ctx, env.shade)
  const wind = desc.wind.lean || desc.wind.gust ? desc.wind : undefined
  const time = desc.animated?.frames ? env.phase : 0
  const shadeInk = env.shade && desc.shadedTones?.trees, ink = desc.tones?.trees
  paintVegTufts(brush, desc.vegetation, wind, time, desc.tones?.tufts, env.shade && desc.shadedTones?.tufts)
  const tone = (plant: number, slot: number, index: number): ReceiverInk => {
    const at = plant * TREE_TONE_STRIDE + slot * 3
    return mapInk([ink ? plantInk(ink, at) : tones[index] ?? tones[0], shadeInk && plantInk(shadeInk, at)], dry)
  }
  const side = lightSide()
  const shown = (i: number) => (treeMeta[i * 3 + 2] ?? 255) / 255
  if (tones.length) {
    for (let i = 0; i < count; i++) if (plantVisible(shown(i))) underShade(brush, trees[i * 6], trees[i * 6 + 1], trees[i * 6 + 2], side, shown(i))
    for (let i = 0; i < count; i++) {
      if (!plantVisible(shown(i))) continue
      const [x, y, r, height, phase, shade] = trees.slice(i * 6, i * 6 + 6), kind = treeMeta[i * 3]
      const { cx, cy, rx, ry } = treeCrownAnchor(x, y, r, height, phase, kind, treeBend(kind, height, shown(i), phase, wind, time))
      const body = mapInk(tone(i, 0, treeMeta[i * 3 + 1]), (rgb) => mix(rgb, UNDER, 0.12 * shade))
      const leaf = { dark: mapInk(tone(i, 1, TONE.PINE_UNDER), (rgb) => mix(rgb, UNDER, 0.12)), body, lit: tone(i, 2, TONE.PINE_LIT) }
      crown(brush, cx, cy, rx, ry, Math.round(phase * 1e4) + i, leaf, side, shown(i))
    }
  }
  for (const target of targets) {
    for (const zone of desc.clear) {
      target.globalCompositeOperation = 'destination-out'
      target.fillStyle = '#000'
      target.fillRect(zone.x, zone.y, zone.w, zone.h)
    }
    target.globalCompositeOperation = 'destination-in'
    outline(target, desc.outline)
    target.fillStyle = '#000'
    target.fill()
    target.restore()
  }
}
