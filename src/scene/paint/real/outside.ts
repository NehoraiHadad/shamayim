import type { LayerOf } from '../../model/types'
import { castShadow, TOWER_CAST, TOWER_CONTACT } from '../shared/town/castShadow'
import { drawGlyph, drawLamps, glyphShadow, glyphLight } from '../shared/town/glyphs'
import type { Lamp } from '../shared/town/glyphs/kit'
import type { Ctx2D, PaintEnv } from '../shared/base/hand'
import { grain, rockOf } from '../shared/town/marks'
import { paintBox } from './outsideBox'
import { paintOutsideLand } from '../shared/town/outsideGround'
import { stripPhase } from '../shared/town/stripPhase'
import { hairOf } from '../shared/land/water'
import { paintPass } from '../shared/base/paintPass'
import { paintTower } from './outsideTower'
import { paintTree } from './outsideTree'
import { offSea, paintRealSea } from './sea/outsideSea'
import { paintFoldedWindows } from './town/foldedWindows'
import { nightLight, paintStreetLight, paintWindowBloom } from './town/nightTown'
import { paintNightWater } from './town/nightWater'

/*
 * The place seen from outside (stage C5, variant B) in the enriched hand.
 * REFERENCE looked at: the skyline study's B stills (docs/design/qa/true-scene/skyline/telaviv-1630.png, haifa-1100.png:
 * the dense mass with spires and named towers out of it), v1b's Haifa (docs/design/qa/styles/v1b/hero.png: a city on its
 * hill as small stone boxes with a lit face, dark window rows, a few towers), and photographs of Tel Aviv's and Haifa's
 * skylines from the north at dusk (towers as glass shafts with a bright edge on the sun's side, the low city a mottle of
 * pale blocks under them, window rows as fine horizontal texture, red lights on the tall tops by night).
 * C5b: the place's own ground under it (its hill over the ridge line), the sea out to its horizon, the sky's light on the
 * mass under any cloud (tops lighter, feet darker, the face to the brighter sky).
 * MEDIUM: the scene's flat opaque bodies cut from the ridge colour, hard edges, no outline; one light: the face toward
 * the true sun lit, the other in shade; haze in the tones (by row); a mass is many boxes, each its own plaster, its roof
 * edge catching the sky. ORDER: the coastal sea (its body, waves, the light's path, the shore) → the cast
 * shadows of towers and marks → the bodies back to front (beyond the place, then the place by where it stands) → the
 * grain over all → lamps and halos (windows lit by night, aviation lights), which no grain dulls. By night the town's own
 * light with them (`town/nightTown`): on the street behind each nearer body, round the windows, down the sea.
 * Screen px. Pure: randomness only from the items' seeds.
 */

/** The place seen from outside, back to front. */
export function paintOutside(ctx: Ctx2D, desc: LayerOf<'outside'>, env: PaintEnv): void {
  const { shine: s, tiers } = desc
  const lateralLight = glyphLight(s), night = nightLight(desc)
  paintPass(ctx, 'background', () => {
    if (desc.land) paintOutsideLand(ctx, desc.land, s)
    if (desc.sea) paintRealSea(ctx, desc.sea, s, stripPhase(desc, env), hairOf(env))
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
    }
    else if (item.kind === 'tree') {
      paintPass(ctx, 'background', () => paintTree(ctx, item.tree, tiers[item.tier], s, lateralLight, rockOf(desc, env, item.tree.seed)))
    }
    else lamps.push(...drawGlyph(ctx, item.glyph, s))
    if (night) {
      paintFoldedWindows(ctx, item, tiers, s)
      paintStreetLight(ctx, env, item, night)
    }
  }
  paintPass(ctx, 'background', () => offSea(ctx, desc.sea, desc.bounds, () => grain(ctx, env, 13, 1 - .4 * s.night)))
  if (night && desc.sea) paintNightWater(ctx, desc.sea, desc.items, night, stripPhase(desc, env))
  if (night) paintWindowBloom(ctx, env, lamps, night)
  drawLamps(ctx, lamps, 1 / env.scale)
}
