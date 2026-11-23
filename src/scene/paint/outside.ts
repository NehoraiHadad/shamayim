import type { LayerOf } from '../model/types'
import { castShadow } from './castShadow'
import { drawGlyph, drawLamps, glyphShadow, glyphLight } from './glyphs'
import type { Lamp } from './glyphs/kit'
import type { Ctx2D, PaintEnv } from './hand'
import { grain, rockOf, tree } from './marks'
import { paintBox } from './outsideBox'
import { paintOutsideLand, paintOutsideSea } from './outsideGround'
import { paintPass } from './paintPass'
import { paintTower } from './outsideTower'

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
 * edge catching the sky. ORDER: the coastal sea (wash down the band, ripples, the shore, the light's path) → the cast
 * shadows of towers and marks → the bodies back to front (beyond the place, then the place by where it stands) → the
 * grain over all → lamps and halos (windows lit by night, aviation lights), which no grain dulls.
 * Screen px. Pure: randomness only from the items' seeds.
 */

export const TOWER_CONTACT = { alpha: .5, height: .8 }
export const TOWER_CAST = { alpha: .8, inset: .5, edgeY: -.3, tipY: .5, bottomY: 1.2, tipInset: () => 1.2 }

/** Where in its strip's loop this frame stands (0…1); 0 for a still layer. */
export function stripPhase(desc: LayerOf<'outside'>, env: PaintEnv): number {
  const frames = desc.animated?.frames
  return frames ? (((env.phase * frames.fps) / frames.count) % 1 + 1) % 1 : 0
}

/** The place seen from outside, back to front. */
export function paintOutside(ctx: Ctx2D, desc: LayerOf<'outside'>, env: PaintEnv): void {
  const { shine: s, tiers } = desc
  const lateralLight = glyphLight(s)
  paintPass(ctx, 'background', () => {
    if (desc.land) paintOutsideLand(ctx, desc.land, s)
    if (desc.sea) paintOutsideSea(ctx, desc.sea, s, stripPhase(desc, env))
  })
  for (const item of desc.items) {
    if (item.kind === 'tower') castShadow(ctx, item, tiers[item.tier], s.cast, TOWER_CONTACT, TOWER_CAST)
    else if (item.kind === 'mark') glyphShadow(ctx, item.glyph, s)
  }
  const lamps: Lamp[] = []
  for (const item of desc.items) {
    if (item.kind === 'box' || item.kind === 'tower') {
      const f = desc.receivers[item.tier][item.receiver], tones = tiers[item.tier]
      if (item.kind === 'box') paintBox(ctx, item, tones, s, lamps, f, desc.accessories[item.tier])
      else paintTower(ctx, item, tones, s, lamps, f, env.scale)
    }
    else if (item.kind === 'tree') {
      paintPass(ctx, 'background', () => tree(ctx, item.tree, tiers[item.tier], s, lateralLight, rockOf(desc, env, item.tree.seed)))
    }
    else lamps.push(...drawGlyph(ctx, item.glyph, s))
  }
  paintPass(ctx, 'background', () => grain(ctx, env, 13, 1 - .4 * s.night))
  drawLamps(ctx, lamps, 1 / env.scale)
}
