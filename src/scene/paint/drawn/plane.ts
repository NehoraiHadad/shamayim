import type { LayerOf } from '../../model/types'
import { css, outline, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { paintVegFields, paintVegRows, paintVegStrata } from '../shared/land/landVegetation'
import { preparePlaneTexels } from '../shared/land/planeTexel'
import { mapInk, receiverBrush } from '../shared/land/receiverBrush'
import { vegetationLight } from '../shared/land/vegetationLight'
import { pigment } from './kit/palette'
import { groundKey } from './land/crest'
import { inkAt, printGround } from './land/groundInk'
import { groundDabs, groundFields, groundLines } from './land/groundMarks'
import { groundOf } from './land/pots'
import { shadingOf } from './land/shadeBlock'

/*
 * The land as a print: a colour block of the model's material in a few pots, a shade block of its own light over it, then
 * the fields, beds and rows on it, and the graver's cuts along the slope. Farther planes take fewer pots and fewer cuts.
 */
export function paintDrawnPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  const { bounds, vegetation: veg } = desc, { litField } = desc.light
  const targets = env.shade ? [ctx, env.shade] : [ctx]
  for (const target of targets) target.save()
  if (desc.surfaceTone.palette.length && desc.surfaceTone.cells.length) {
    const t = preparePlaneTexels(desc.outline, bounds, desc.surfaceTone, litField, desc.grain.seed, 0)
    const ground = groundOf(t, desc), shading = shadingOf(t, ground, targets.length > 1), at = inkAt(t, ground, shading)
    const raw = vegetationLight(veg.tones, litField, desc.outline, bounds, targets.length > 1)
    const toneAt: typeof raw = (i, x, y) => mapInk(raw(i, x, y), (rgb) => pigment(rgb, 0.2))
    const brush = receiverBrush(ctx, env.shade)
    printGround(targets, t, ground, shading)
    paintVegStrata(brush, veg, toneAt)
    paintVegFields(brush, veg, toneAt)
    groundFields(brush, veg.fields, at)
    groundLines(brush, desc, at)
    paintVegRows(brush, veg, toneAt)
    groundDabs(brush, desc, t, at)
    groundKey(targets, brush, desc, t, at)
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
