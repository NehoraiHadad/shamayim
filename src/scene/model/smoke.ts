//# allFunctionsCalledOnLoad
import { hashId } from '../../data/landmarks/hash'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { landBoxKey, layerKey } from './keys'
import { aerialFor } from './landVeil'
import { skyAt } from './sky'
import { mixRgb } from './tone'
import type { LayerOf, Plume, SceneBox } from './types'
import { clamp01, lightPart, q, tone } from './weatherShared'

/** Smoke and steam: a strip this many frames, at this rate (a 1 s loop). */
const SMOKE_FRAMES = { count: 8, fps: 8 }

/**
 * Chimney smoke and cooling-tower steam (land): a plume from each such mark's top, carried downwind by the one wind
 * (rising straight in a calm, laid over in a gale), in the light and the air at its distance; puffs rising along it in
 * a strip of frames. One layer for the far marks, one for the near (over the portrait).
 */
export function smokeLayers(world: WorldState, box: SceneBox): LayerOf<'smoke'>[] {
  const sx = box.width / SCENE_W
  const stacks = world.marks.filter((m) => m.glyphKind === 'chimney' || m.glyphKind === 'cooling')
  if (!stacks.length) return []
  const aerial = aerialFor(world)
  const dark = world.night.dark
  const sky = skyAt(world, box)
  const blow = clamp01(world.wind.ms / 12)
  const across = world.wind.across
  const out: LayerOf<'smoke'>[] = []
  for (const [id, z, marks] of [['smoke.far', 17.5, stacks.filter((m) => m.plane !== 'near')], ['smoke.near', 40.5, stacks.filter((m) => m.plane === 'near')]] as const) {
    if (!marks.length) continue
    const plumes: Plume[] = marks.map((m) => {
      const steam = m.glyphKind === 'cooling'
      const height = m.h * m.scale
      const len = (steam ? 16 : 12) + height * 0.9
      const own = steam ? mixRgb(sky(6), [0.94, 0.95, 0.97], 0.65 * (1 - dark)) : mixRgb(sky(6), [0.42, 0.42, 0.44], 0.55)
      const lit = mixRgb(own, world.light.colour, 0.55 * world.light.direct * (1 - dark))
      return {
        x: m.x * sx + (steam ? 0 : height * 0.08), y: m.base - height * (steam ? 0.97 : 1),
        dx: across * len * (0.25 + 1.6 * blow), dy: -len * (1 - 0.65 * blow),
        r0: steam ? Math.max(1.2, m.w * 0.18) : 0.6, r1: (steam ? 5 : 3) + len * 0.18,
        rgb: aerial(own, m.km), lit: aerial(lit, m.km), alpha: (steam ? 0.75 : 0.55) * (1 - 0.5 * world.air.fade(m.km)),
        puffs: steam ? 9 : 8, seed: hashId(`${m.id}:smoke`),
      }
    })
    const pad = 3
    const left = Math.min(...plumes.map((p) => Math.min(p.x, p.x + p.dx) - p.r1 - pad))
    const right = Math.max(...plumes.map((p) => Math.max(p.x, p.x + p.dx) + p.r1 + pad))
    const top = Math.min(...plumes.map((p) => p.y + p.dy - p.r1 - pad))
    const bottom = Math.max(...plumes.map((p) => p.y + p.r0 + pad))
    const x0 = Math.max(0, Math.floor(left)), x1 = Math.min(box.width, Math.ceil(right))
    const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(box.landHeight, Math.ceil(bottom))
    if (x1 <= x0 || y1 <= y0) continue
    out.push({ kind: 'smoke', id, surface: 'land', z, plumes, bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
      animated: { mode: 'frames', frames: SMOKE_FRAMES },
      key: layerKey(id, landBoxKey(box), x0, y0, x1, y1),
      light: lightPart(layerKey(id, 'light', plumes.map((p) => [q(p.x, 0.25), q(p.y, 0.25), q(p.dx, 0.25), q(p.dy, 0.25), q(p.r0, 0.1),
        q(p.r1, 0.25), tone(p.rgb), tone(p.lit), q(p.alpha, 0.02), p.puffs, p.seed])), plumes[0].rgb) })
  }
  return out
}
