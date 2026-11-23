//# allFunctionsCalledOnLoad
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import type { SceneStyle } from '../sceneStyle'
import { drawnOutsideLight } from './drawnOutsideLight'
import { colourCode, colourKey, landBoxKey, layerKey } from './keys'
import { glyphAtmosphereKey, refreshLandmarkItems } from './landmarkAtmosphere'
import type { DrawnMass } from './markOcclusion'
import { facesKey, shineOf, SWAY_FRAMES, tonesAt } from './marks'
import { outsideLandDesc } from './outsideGround'
import { outsideSea } from './outsideSea'
import { KM_STEP, outsideShape } from './outsideShape'
import { accessoryTones, buildingFaces, type BuildingFaces } from './buildingLight'
import { receiverLightKey } from './receiverKey'
import type { Box, LayerOf, SceneBox, Shine, Tones } from './types'

/**
 * The place seen from outside (stage C5, variant B; the world's `outside.ts`): one layer over the near ridge holding, back
 * to front, the towers beyond the place (true bearing, far first), then the place itself: its built squares as one
 * jagged mass at their real heights, the towers that clear it as spires, the famous and the very tall as full towers,
 * and the place's own marks (icons included) among them at their depth. Under them, a coastal place's own sea.
 *
 * Every tone comes from the one world light and air: walls cut from the ridge and lifted toward the air, the face toward
 * the true sun lit, the other in shade (`tonesAt`), each row hazed by its distance (the near ridge's at the near edge,
 * further south hazier), windows lit by the evening's lit share, aviation lights on the tall. The layer is all light
 * over an empty form (as the marks): its shapes follow the place and the box, its colours the hour.
 */

const Z = 38

const tonesKey = (t: Tones) => (Object.keys(t) as (keyof Tones)[]).map((k) => colourCode(t[k]))

export function outsideMass(world: WorldState, box: SceneBox, clear: readonly Box[]): readonly DrawnMass[] {
  return world.place3.kind === 'outside' ? outsideShape(world, box, clear).mass : []
}

/** The same final own roofline and haze tiers used by both receiving layers. */
export function outsideHome(world: WorldState, box: SceneBox, clear: readonly Box[]) {
  return world.place3.kind === 'outside' ? outsideShape(world, box, clear).home : null
}

/** The place seen from outside, as one layer (null for a portrait). */
export function outsideLayer(world: WorldState, box: SceneBox, clear: readonly Box[] = [],
  style: SceneStyle = 'real'): LayerOf<'outside'> | null {
  if (world.place3.kind !== 'outside') return null
  const sx = box.width / SCENE_W
  const shape = outsideShape(world, box, clear)
  const drawn = style === 'drawn' ? drawnOutsideLight(world, box, shape, sx) : undefined
  const shine: Shine = drawn?.shine ?? shineOf(world)
  // The hour's tones per tier, and the marks' glyphs in them (the rest of the shapes kept as they are).
  const tones = drawn?.tiers ?? shape.kms.map((km) => tonesAt(world, km))
  const out = drawn?.items ?? refreshLandmarkItems(world, shape.items, shape.marks)
  const sea = outsideSea(world, box, sx, clear)
  const view = world.place3
  const landDesc = outsideLandDesc(world, view, box, sx)
  const receivers = drawn ? [] : shape.receivers.map((ids, i) => {
    const palette: Record<number, BuildingFaces> = {}
    for (const [id, { detail, tile }] of ids) palette[id] = buildingFaces(world, shape.wallKms[i], id, tile, false, detail)
    return palette
  })
  if (!out.length && !sea) return null
  const boxes = shape.bounds ? [shape.bounds] : []
  if (sea) boxes.push({ left: Math.min(...sea.points.map(([x]) => x)), right: Math.max(...sea.points.map(([x]) => x)), top: sea.top - 1, bottom: sea.bottom + 1 })
  if (landDesc) boxes.push({ left: landDesc.top[0][0], right: landDesc.top.at(-1)![0], top: Math.min(...landDesc.top.map(([, y]) => y)) - 1,
    bottom: Math.max(...landDesc.base.map(([, y]) => y)) + 1 })
  const x0 = Math.max(0, Math.floor(Math.min(...boxes.map((b) => b.left)))), x1 = Math.min(box.width, Math.ceil(Math.max(...boxes.map((b) => b.right))))
  const y0 = Math.max(0, Math.floor(Math.min(...boxes.map((b) => b.top)))), y1 = Math.min(box.landHeight, Math.ceil(Math.max(...boxes.map((b) => b.bottom))))
  if (x1 <= x0 || y1 <= y0) return null
  const formKey = layerKey('outside', world.keys.place, landBoxKey(box), shape.key)
  const seaKey = sea ? [sea.stops.map(([, c]) => colourKey(c)), colourKey(sea.shore), sea.glint && [Math.round(sea.glint.x * 4),
    Math.round(sea.glint.alpha * 64), sea.glint.sparks.length], colourKey(sea.horizon.rgb)] : null
  const groundKey = landDesc && [colourKey(landDesc.tone), landDesc.stops.map(([at, c]) => [at.toFixed(5), colourKey(c)]), colourKey(landDesc.rim)]
  // C7: its trees sway in the wind and its sea's ripples run with it, in a strip of frames (the light canvas only).
  const moving = (out.some((item) => item.kind === 'tree') && (shine.sway ?? 0) > 0.005) || Boolean(sea && (sea.ripples.length || sea.glint))
  return {
    kind: 'outside', id: 'outside', surface: 'land', z: Z, bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, key: formKey,
    items: out, tiers: tones, sea, shine, land: landDesc, receivers,
    accessories: drawn ? [] : shape.wallKms.map((km, i) => shape.heaters.has(i) ? accessoryTones(world, km) : null),
    ...(drawn ? { form: drawn.form } : {}),
    ...(moving ? { animated: { mode: 'frames' as const, frames: SWAY_FRAMES } } : {}),
    light: { key: layerKey('outside:light', formKey, tones.map(tonesKey), shape.marks.map((m) => Math.round(m.km / KM_STEP)),
      glyphAtmosphereKey(out.flatMap((i) => i.kind === 'mark' ? [i.glyph] : [])), Math.round(world.light.across * 64),
      [facesKey(shine), Math.round(shine.night * 64), Math.round(shine.direct * 64), Math.round(shine.cast.dx * 32), Math.round(shine.cast.alpha * 64),
        Math.round(shine.windows * 64), Math.round(shine.lean * 100), Math.round((shine.sway ?? 0) * 200)], seaKey,
      sea && Math.round((sea.drift ?? 0) * 4), groundKey, drawn?.key ?? receiverLightKey(world)),
    blend: 'source-over', tint: tones[0]?.wall ?? [0.2, 0.2, 0.25] },
  }
}
