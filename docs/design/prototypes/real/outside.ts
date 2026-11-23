import type { LayerOf, Tones, TreeDesc } from '../../../../src/scene/model/types'
import { mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { paintPass } from '../../../../src/scene/paint/shared/base/paintPass'
import { receiverBrush } from '../../../../src/scene/paint/shared/land/receiverBrush'
import { castShadow, TOWER_CAST, TOWER_CONTACT } from '../../../../src/scene/paint/shared/town/castShadow'
import { drawGlyph, drawLamps, glyphLight, glyphShadow } from '../../../../src/scene/paint/shared/town/glyphs'
import type { Lamp } from '../../../../src/scene/paint/shared/town/glyphs/kit'
import { rockOf, tree } from '../../../../src/scene/paint/shared/town/marks'
import { paintOutsideLand } from '../../../../src/scene/paint/shared/town/outsideGround'
import { stripPhase } from '../../../../src/scene/paint/shared/town/stripPhase'
import { paintBox } from '../../../../src/scene/paint/real/outsideBox'
import { paintTower } from '../../../../src/scene/paint/real/outsideTower'
import { lightSide } from './facts'
import { houseCast, houseLight } from './houseLight'
import { crown, underShade } from './foliage'
import { nightTown } from './nightTown'
import { paintSea } from './sea'

/*
 * The place in natural light: today's bodies, tones and windows, each body standing in the light (`houseLight`), real
 * crowns among them, and by night the town's own light on the air, the ground and the sea.
 */

export function paintOutside(ctx: Ctx2D, desc: LayerOf<'outside'>, env: PaintEnv): void {
  const { shine: s, tiers } = desc, side = lightSide()
  paintPass(ctx, 'background', () => {
    if (desc.land) paintOutsideLand(ctx, desc.land, s)
    if (desc.sea) paintSea(ctx, desc.sea, s, stripPhase(desc, env))
  })
  for (const item of desc.items) {
    if (item.kind === 'tower') castShadow(ctx, item, tiers[item.tier], s.cast, TOWER_CONTACT, TOWER_CAST)
    else if (item.kind === 'mark') glyphShadow(ctx, item.glyph, s)
  }
  const lamps: Lamp[] = []
  for (const item of desc.items) {
    if (item.kind === 'box' || item.kind === 'tower') {
      const f = desc.receivers[item.tier][item.receiver], tones = tiers[item.tier]
      if (item.kind === 'box') houseCast(ctx, item, tones, s)
      if (item.kind === 'box') paintBox(ctx, item, tones, s, lamps, f, desc.accessories[item.tier], env.scale)
      else paintTower(ctx, item, tones, s, lamps, f, env.scale)
      paintPass(ctx, 'background', () => houseLight(ctx, item, f.top, tones, s, side))
    } else if (item.kind === 'tree') paintPass(ctx, 'background', () => {
      if (item.tree.kind === 'palm' || item.tree.kind === 'cypress') tree(ctx, item.tree, tiers[item.tier], s, glyphLight(s), rockOf(desc, env, item.tree.seed))
      else roundTree(ctx, item.tree, tiers[item.tier], side)
    })
    else lamps.push(...drawGlyph(ctx, item.glyph, s))
  }
  nightTown(ctx, desc, lamps)
  drawLamps(ctx, lamps, 1 / env.scale)
}

function roundTree(ctx: Ctx2D, tr: TreeDesc, t: Tones, side: number) {
  const brush = receiverBrush(ctx, undefined), rx = tr.w / 2, ry = Math.max(rx * 0.75, tr.h / 2 - 0.2)
  underShade(brush, tr.x, tr.base, rx, side, 0.9)
  crown(brush, tr.x, tr.base - ry * 0.95, rx * 1.1, ry, tr.seed, { dark: [mix(t.green, t.deep, 0.35)], body: [t.green], lit: [t.greenLit] }, side, 0.95)
}
