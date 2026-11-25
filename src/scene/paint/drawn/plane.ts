import type { LayerOf } from '../../model/types'
import { css, outline, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { preparePlaneTexels } from '../shared/land/planeTexel'
import { receiverBrush } from '../shared/land/receiverBrush'
import { pigment } from './kit/palette'
import { printGrain } from './kit/printGrain'
import { groundKey } from './land/crest'
import { inkAt, printGround, type GroundInk } from './land/groundInk'
import { printFields, printRows } from './land/fields'
import { groundDabs, groundLines } from './land/groundMarks'
import { groundOf } from './land/pots'
import { printSeats } from './land/seats'
import { printTown } from './land/settlement'
import { shadingOf, type Shading } from './land/shadeBlock'
import { raisedOutline } from '../shared/land/townGround'

/*
 * The land as a colour woodblock print: a block for each of a few pots of the model's material (its land cover), knife-edged
 * lit and shade blocks of its own light over them, then the fields, beds and rows on it, the graver's hatches in the shade
 * and the cover's small marks, the bokashi and the keyblock's crest. Farther planes take one flat block and fewer cuts.
 */

/** The base block's ink in the most held pot: what the crest's key line and wipes are stepped from. */
const baseOf = ({ levels }: Shading): GroundInk => {
  const base = levels[0]!
  return { key: 0, ink: [base.inks[0][0], base.inks[1]?.[0]], level: 0, air: base.air, light: 1, shown: 1 }
}
export function paintDrawnPlane(ctx: Ctx2D, given: LayerOf<'plane'>, env: PaintEnv): void {
  // The near plane prints the place's own ground over its crest where the model raises it there.
  const raised = raisedOutline(given.outline, given.town?.land), desc = raised === given.outline ? given : { ...given, outline: raised }
  const { bounds } = desc, { litField } = desc.light
  const targets = env.shade ? [ctx, env.shade] : [ctx]
  for (const target of targets) target.save()
  if (desc.surfaceTone.palette.length && desc.surfaceTone.cells.length) {
    const t = preparePlaneTexels(desc.outline, bounds, desc.surfaceTone, litField, desc.grain.seed, 0)
    const ground = groundOf(t, desc), shading = shadingOf(t, ground, desc.plane, targets.length > 1), at = inkAt(t, ground, shading)
    const brush = receiverBrush(ctx, env.shade)
    const grain = printGrain(env, desc.plane)
    printGround(targets, t, ground, shading, grain)
    if (desc.town) printTown(targets, brush, t, ground, shading, at, desc.town, grain)
    // The town's seats and casts, cut in the ground's own wood where the hand's light met the town with it (`light/meet`).
    if (desc.town && desc.own) printSeats(brush, desc, at)
    printFields(brush, desc, t, ground, at)
    groundLines(brush, desc, at)
    printRows(brush, desc, at)
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
