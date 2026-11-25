import type { LayerOf } from '../../model/types'
import { css, outline, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { paintVegFields, paintVegRows, paintVegStrata } from '../shared/land/landVegetation'
import { preparePlaneTexels } from '../shared/land/planeTexel'
import { mapInk, receiverBrush } from '../shared/land/receiverBrush'
import { vegetationLight } from '../shared/land/vegetationLight'
import { calm, pigment } from './kit/palette'
import { groundKey } from './land/crest'
import { inkAt, printGround, type GroundInk } from './land/groundInk'
import { groundDabs, groundFields, groundLines } from './land/groundMarks'
import { groundOf } from './land/pots'
import { shadingOf, type Shading } from './land/shadeBlock'

/*
 * The land as a colour woodblock print: a block for each of a few pots of the model's material (its land cover), knife-edged
 * lit and shade blocks of its own light over them, then the fields, beds and rows on it, the graver's hatches in the shade
 * and the cover's small marks, the bokashi and the keyblock's crest. Farther planes take one flat block and fewer cuts.
 */

/** The base block's ink in the most held pot: what the crest's key line and wipes are stepped from. */
const baseOf = ({ levels }: Shading): GroundInk => {
  const base = levels[0]!
  return { key: 0, ink: [base.inks[0][0], base.inks[1]?.[0]], level: 0, air: base.air, light: 1 }
}
export function paintDrawnPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  const { bounds, vegetation: veg } = desc, { litField } = desc.light
  const targets = env.shade ? [ctx, env.shade] : [ctx]
  for (const target of targets) target.save()
  if (desc.surfaceTone.palette.length && desc.surfaceTone.cells.length) {
    const t = preparePlaneTexels(desc.outline, bounds, desc.surfaceTone, litField, desc.grain.seed, 0)
    const ground = groundOf(t, desc), shading = shadingOf(t, ground, desc.plane, targets.length > 1), at = inkAt(t, ground, shading)
    const raw = vegetationLight(veg.tones, litField, desc.outline, bounds, targets.length > 1)
    const toneAt: typeof raw = (i, x, y) => mapInk(raw(i, x, y), (rgb) => calm(rgb, 0.2))
    const brush = receiverBrush(ctx, env.shade)
    printGround(targets, t, ground, shading)
    paintVegStrata(brush, veg, toneAt)
    paintVegFields(brush, veg, toneAt)
    groundFields(brush, veg.fields, at)
    groundLines(brush, desc, at)
    paintVegRows(brush, veg, toneAt)
    groundDabs(brush, desc, t, ground, at)
    groundKey(targets, brush, desc, t, baseOf(shading))
  } else for (const target of targets) {
    target.fillStyle = css(pigment(desc.fill))
    target.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
  }
  for (const target of targets) {
    target.globalCompositeOperation = 'destination-in'
    outline(target, desc.outline)
    target.fillStyle = '#000'
    target.fill()
    target.restore()
  }
}
