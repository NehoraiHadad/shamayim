//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import { halfDepthLightOf } from '../../world/halfDepthLight'
import type { WorldState } from '../../world/types'
import { crestAt } from './edgeMark'
import { illustratedHazeOf } from './illustratedHaze'
import { landBoxKey, layerKey, skyBoxKey } from './keys'
import { hazeOf } from './landVeil'
import { precipLayers } from './precip'
import { mistLayers } from './mist'
import { coversOf, skyAt, skyGeom, type SkyGeom } from './sky'
import { rayLayersOf } from './rays'
import { smokeLayers } from './smoke'
import { mixRgb } from './tone'
import type { Box, FallMark, LayerDesc, LayerOf, SceneBox, Sheen } from './types'
import { q, tone, whole, WHITE, lightPart } from './weatherShared'

export { mistiness, mistLayers } from './mist'
export { precipLayers } from './precip'
export { inView, NEAR_ALT, precipOf } from './shafts'
export { smokeLayers } from './smoke'

/*
 * The weather (stage C7, docs/design/CANVAS-SCENE-PLAN.md §4), from the one world state:
 * - rain and snow fall only from the banks the world makes rain or snow (`world.rain.cells`, `world.snowfall.cells`), at
 *   their true azimuths: a curtain under each far bank down to the horizon, falling streaks (or flakes) inside it, and
 *   round the eye the near rain under the raining banks overhead; all slanted by the one wind and drifting with the cloud
 *   layer that makes them. When none of those banks is in view, a heavy bank with its curtain stands cut by the frame's
 *   edge on the side the rain truly lies (the true-scene plan's edge mark);
 * - the ground's sheen after rain (`world.ground.wet`), the darkening being the planes' own (C2);
 * - mist and fog lying level in the low ground, the valleys first, from `world.air.mist` (`mist.ts`);
 * - dust grains (`air.dustWeight`) and wind streaks in a gale;
 * - crepuscular rays from a low sun behind broken cloud;
 * - chimney smoke and cooling-tower steam from the marks that have them, carried by the wind.
 * Animation is laid at composite time (`anim.ts`): falling tiles moved as patterns, drifting tiles, strips of frames.
 */

/**
 * Dust drifts over the land and the low sky. In a gale (≥ 10 m/s) the sky's wind streaks fade as the dust fades in.
 * Each tile keeps its pattern and drift as its opacity changes.
 */
export function grainLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'grains'>[] {
  const dustWeight = world.air.dustWeight
  const galeWeight = world.wind.ms >= 10 ? 1 - dustWeight : 0
  if (dustWeight === 0 && galeWeight === 0) return []
  const across = world.wind.across
  const dir = Math.abs(across) > 0.05 ? Math.sign(across) : 1
  const sx = box.width / SCENE_W
  const dark = world.night.dark
  const out: LayerOf<'grains'>[] = []
  const add = (dust: boolean, weight: number) => {
    if (weight === 0) return
    const speed = dir * (dust ? 6 + 4 * world.wind.ms : 25 + 6 * world.wind.ms) * sx
    const period = whole(dust ? 120 : 260, box.dpr)
    const opacity = weight * (1 - 0.6 * dark)
    const rgb = dust ? mixRgb(hazeOf(world), [0.85, 0.72, 0.5], 0.35 * (1 - dark))
      : mixRgb(skyAt(world, box)(10), WHITE, 0.5 * (1 - dark))
    const marks = (id: string, h: number, n: number): FallMark[] => {
      const r = seeded(hashId(`${world.place.id}:${id}`))
      return Array.from({ length: n }, () => ({ x: r() * period, y: r() * h, len: dust ? 1 + 3 * r() : 18 + 40 * r(), r: dust ? 0.4 + 0.5 * r() : 0.5,
        alpha: (dust ? 0.12 + 0.18 * r() : 0.04 + 0.07 * r()) * opacity }))
    }
    const id = dust ? 'grains.sky' : 'grains.gale'
    const skyTop = Math.max(0, Math.floor(geom.horizon - (dust ? 110 : 200)))
    const skyH = Math.max(1, Math.ceil((dust ? box.skyHeight : geom.horizon - 10) - skyTop))
    // The grains suspended in the sky keep its atmospheric palette. The
    // land's aerial light is calibrated separately for terrain receivers.
    const skyRgb = dust ? mixRgb(illustratedHazeOf({ ...world, light: halfDepthLightOf(world.light) }), [0.85, 0.72, 0.5], 0.35 * (1 - dark)) : rgb
    const toneKey = (color: typeof rgb) => [tone(color), Math.round(opacity * 255)]
    out.push({ kind: 'grains', id, surface: 'sky', z: 10.5, soft: true, rgb: skyRgb, marks: marks('grains.sky', skyH, dust ? 70 : 12),
      bounds: { x: 0, y: skyTop, w: period, h: skyH }, animated: { mode: 'drift', speed, period },
      key: layerKey(id, skyBoxKey(box, true), period, skyTop, skyH, toneKey(skyRgb)) })
    if (dust) {
      out.push({ kind: 'grains', id: 'grains.land', surface: 'land', z: 50, soft: true, rgb, marks: marks('grains.land', box.landHeight, 60),
        bounds: { x: 0, y: 0, w: period, h: box.landHeight }, animated: { mode: 'drift', speed: speed * 1.4, period },
        key: layerKey('grains.land', landBoxKey(box, true), period, toneKey(rgb)) })
    }
  }
  add(false, galeWeight)
  add(true, dustWeight)
  return out
}

/**
 * How broken the cloud is for rays (0–1): low and mid cloud with gaps to cast the shadows, and the sky as a whole not
 * closed (the high deck too: under a full veil there are no gaps for the light).
 */
export function brokenness(world: WorldState): number {
  const { low, mid, high } = coversOf(world)
  const u = 1 - (1 - low) * (1 - mid)
  const all = 1 - (1 - u) * (1 - high)
  return smoothstep(0.18, 0.4, u) * (1 - smoothstep(0.78, 0.93, all))
}

/**
 * The wet ground's sheen (land, after rain: `ground.wet`): short level strokes over the near ridge's face where wet rock,
 * roads and flats send back the sky above them, stronger the wetter, the brighter the sky; out of the text zones.
 */
export function sheenLayer(world: WorldState, box: SceneBox, clear: readonly Box[]): LayerOf<'sheen'> | null {
  const wet = world.ground.wet
  if (wet < 0.12 || (world.snow && world.snow.amount > 0.3)) return null
  const sx = box.width / SCENE_W
  const dark = world.night.dark
  const sky = skyAt(world, box)
  const rgb = mixRgb(sky(18), WHITE, 0.3 * (1 - dark))
  const bright = (1 - 0.8 * dark) * (0.6 + 0.4 * (1 - world.light.direct * 0.3))
  const r = seeded(hashId(`${world.place.id}:sheen`))
  const strokes: Sheen[] = []
  const n = Math.round(70 * wet)
  for (let i = 0; i < n * 3 && strokes.length < n; i++) {
    const xr = r() * SCENE_W
    const crest = crestAt(world.terrain.near.points, xr)
    const v = r(), w = (3 + 9 * r()) * sx
    if (crest >= box.landHeight - 4) continue
    const y = crest + (box.landHeight - crest) * (0.3 + 0.68 * v)
    const x = xr * sx - w / 2
    if (clear.some((b) => x < b.x + b.w && x + w > b.x && y > b.y - 1 && y < b.y + b.h + 1)) continue
    strokes.push({ x, y, w, alpha: wet * bright * (0.1 + 0.2 * r()) * (0.5 + 0.5 * v) })
  }
  if (!strokes.length) return null
  return { kind: 'sheen', id: 'sheen', surface: 'land', z: 31, strokes, rgb,
    bounds: { x: 0, y: 0, w: box.width, h: box.landHeight },
    key: layerKey('sheen', landBoxKey(box)),
    light: lightPart(layerKey('sheen', 'light', world.keys.terrain, q(wet, 0.05), tone(rgb), q(bright, 0.05),
      clear.map((b) => [b.x, b.y, b.w, b.h])), rgb) }
}

/** Every weather layer of the scene (C7), on both surfaces. */
export function weatherLayers(world: WorldState, box: SceneBox, clear: readonly Box[],
  geom: SkyGeom = skyGeom(world, box)): LayerDesc[] {
  const rays = rayLayersOf(world, box, geom)
  const sheen = sheenLayer(world, box, clear)
  return [...precipLayers(world, box, geom), ...rays, ...mistLayers(world, box), ...grainLayers(world, box, geom),
    ...smokeLayers(world, box), ...(sheen ? [sheen] : [])]
}
