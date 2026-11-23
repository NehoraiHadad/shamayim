import type { LayerOf, OutsideItem, RGB, Shine, Tones, TreeDesc } from '../../../../src/scene/model/types'
import { css, mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
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
import { crown, underShade } from './foliage'
import { nightTown } from './nightTown'
import { paintSea } from './sea'

/*
 * The place in natural light: today's bodies, tones and windows, each body seated (its foot darker, its top open to the
 * sky, its light side warm), real crowns among them, and by night the town's own light on the air, the ground and the sea.
 */

/** The foot's shade, the light side's lift and the top's sky, at full. */
const FOOT = 0.2, LIFT = 0.2, OPEN = 0.16

type Body = Extract<OutsideItem, { kind: 'box' | 'tower' }>
const bodyOf = (b: Body) => b.kind === 'box'
  ? { x: b.x - b.w / 2, y: b.top, w: b.w, h: b.foot - b.top } : { x: b.x - b.w / 2, y: b.base - b.h, w: b.w, h: b.h }

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
      if (item.kind === 'box') paintBox(ctx, item, tones, s, lamps, f, desc.accessories[item.tier], env.scale)
      else paintTower(ctx, item, tones, s, lamps, f, env.scale)
      paintPass(ctx, 'background', () => seat(ctx, item, f.top, tones, s, side))
    } else if (item.kind === 'tree') paintPass(ctx, 'background', () => {
      if (item.tree.kind === 'palm' || item.tree.kind === 'cypress') tree(ctx, item.tree, tiers[item.tier], s, glyphLight(s), rockOf(desc, env, item.tree.seed))
      else roundTree(ctx, item.tree, tiers[item.tier], side)
    })
    else lamps.push(...drawGlyph(ctx, item.glyph, s))
  }
  nightTown(ctx, desc, lamps)
  drawLamps(ctx, lamps, 1 / env.scale)
}

function seat(ctx: Ctx2D, item: Body, top: RGB, t: Tones, s: Shine, side: number) {
  const { x, y, w, h } = bodyOf(item)
  if (h < 1.5 || w < 1) return
  const beam = (1 - s.night) * s.direct * Math.abs(side)
  const down = ctx.createLinearGradient(0, y, 0, y + h)
  // Its top stands open to the sky: the sky's own light on it, the model's top tone.
  down.addColorStop(0, css(top, OPEN * (1 - s.night)))
  down.addColorStop(0.4, css(top, 0))
  down.addColorStop(0.45, css(t.deep, 0.06 * FOOT))
  down.addColorStop(1, css(t.deep, FOOT))
  ctx.fillStyle = down
  ctx.fillRect(x, y, w, h)
  if (beam < 0.02) return
  const across = side > 0 ? ctx.createLinearGradient(x + w, 0, x, 0) : ctx.createLinearGradient(x, 0, x + w, 0)
  const warm = mix(t.stone, [1, 0.97, 0.9], 0.75)
  across.addColorStop(0, css(warm, LIFT * beam))
  across.addColorStop(0.55, css(warm, 0.35 * LIFT * beam))
  across.addColorStop(1, css(warm, 0))
  ctx.fillStyle = across
  ctx.fillRect(x, y, w, h)
}

function roundTree(ctx: Ctx2D, tr: TreeDesc, t: Tones, side: number) {
  const brush = receiverBrush(ctx, undefined), rx = tr.w / 2, ry = Math.max(rx * 0.75, tr.h / 2 - 0.2)
  underShade(brush, tr.x, tr.base, rx, side, 0.9)
  crown(brush, tr.x, tr.base - ry * 0.95, rx * 1.1, ry, tr.seed, { dark: [mix(t.green, t.deep, 0.5)], body: [t.green], lit: [t.greenLit] }, side, 0.95)
}
