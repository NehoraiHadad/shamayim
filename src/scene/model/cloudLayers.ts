import { daylitShare } from '../../domain/cloudDaylight'
import { smoothstep } from '../../world/ridgeLighting'
import type { CloudLevel, WorldState } from '../../world/types'
import { towerLayerOf } from './cloudCells'
import { inDust } from './cloudDust'
import { sunlitTone } from './cloudSunlit'
import { cityLit } from './cityLight'
import { DECK_GREY, lightOn, RAIN_GREY, tonesAt, WHITE } from './cloudLight'
import { cloudSheetOf, OVERCAST_HORIZON } from './cloudSheet'
import { skyBoxKey } from './keys'
import { coversOf, skyStops } from './skyColour'
import { skyGeom, type SkyGeom } from './skyGeom'
import { mixRgb, scaleLight } from './tone'
import { lowSheetRgb, type Beyond } from './towerStorms'
import type { LayerOf, SceneBox } from './types'

/*
 * The clouds (C6, rebuilt on the field, SPEC §6.0: layers before shapes): each field layer as one sheet over the dome,
 * and the towers, which stand up out of any sheet, as sprites. One light per level (`lightOn`), the tones of the sky
 * behind (`tonesAt`). Pure: the world and the box.
 */

export type CloudLayerDesc = LayerOf<'cloudSheet'> | LayerOf<'cloudCells'>

const cloudMemo = new WeakMap<WorldState, { box: string; layers: CloudLayerDesc[] }>()

/** Reuse the physical cloud descriptors between the scene stack and its contrast solver. */
export function cloudLayersForSky(world: WorldState, box: SceneBox, geom?: SkyGeom): CloudLayerDesc[] {
  const key = skyBoxKey(box).join(',')
  const previous = cloudMemo.get(world)
  if (previous?.box === key) return previous.layers
  const layers = cloudLayersOf(world, box, geom)
  cloudMemo.set(world, { box: key, layers })
  return layers
}

/** How much of the field's rain falls from this level, 0–1 (the rate eases it in; mid and low share it). */
function rainWeightAt(world: WorldState, level: CloudLevel, rains: boolean): number {
  const rain = world.cloudField?.field.rain
  if (!rain) return Number(rains)
  const midWeight = rain.midWeight ?? Number(rain.level === 'mid')
  return smoothstep(0, 0.2, rain.rate) * (level === 'mid' ? midWeight : level === 'low' ? 1 - midWeight : 0)
}

export function cloudLayersOf(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): CloudLayerDesc[] {
  const stops = skyStops(world, box)
  const { low, mid, high } = coversOf(world)
  const union = 1 - (1 - low) * (1 - mid) * (1 - high)
  const { altitude } = world.bodies.sun
  const day = smoothstep(-8, 3, altitude)
  const out: CloudLayerDesc[] = []
  // The towers last: they stand before the low sheet, so they are seen against it.
  const towersLast = (s: NonNullable<WorldState['cloudField']>['snapshot'][number]) => Number(s.layer?.lattice === 'tower')
  let beyond: Beyond | null = null
  for (const snapshot of [...world.cloudField?.snapshot ?? []].sort((a, b) => towersLast(a) - towersLast(b))) {
    const fieldLayer = snapshot.layer
    if (!fieldLayer) continue
    const level: CloudLevel = fieldLayer.lattice === 'tower' ? 'low' : fieldLayer.lattice
    const cloud = world.clouds.find((l) => l.level === level)
    if (!cloud) continue
    const light = lightOn(world, box, geom, cloud)
    if (fieldLayer.lattice === 'tower') {
      const towers = towerLayerOf(world, box, geom, snapshot, light, stops, beyond)
      if (towers) out.push(towers)
      continue
    }
    const rain = rainWeightAt(world, level, cloud.rains)
    const tones = tonesAt(world, box, stops, level, geom.dome(4) * 0.6, union, rain, 3)
    // Six tenths cover still exposes the sides of Sc rolls; at deck closure (tonesOf's 0.95) the base is a diffuse slab.
    const closed = smoothstep(0.6, 0.95, fieldLayer.cover)
    const base = mixRgb(mixRgb(DECK_GREY, WHITE, 0.5), RAIN_GREY, rain)
    const grey = mixRgb(DECK_GREY, RAIN_GREY, rain)
    const body = inDust(world, mixRgb(tones.body, base, day), fieldLayer.baseKm)
    // Moonlight lifts the lit endpoint in proportion to the beam reaching the sheet; at moonset it merges into the body.
    const lit = light ? mixRgb(tones.body, mixRgb(light.rgb, tones.behind, tones.fade),
      light.sun || light.under > 0 ? 1 : light.strength * light.above) : tones.body
    // An open deck shows the sun the sides of its cells, a closed one its flat top.
    const facing = 1 - closed * (1 - Math.sin(Math.max(0, altitude) * Math.PI / 180))
    const colours = {
      body,
      // The Eddington boundary source at μ=0 has 2/5 of its zenith value.
      shade: inDust(world, mixRgb(tones.shade, mixRgb(grey, scaleLight(base, OVERCAST_HORIZON), closed), day), fieldLayer.baseKm),
      lit: light?.sun ? sunlitTone(world, fieldLayer.baseKm + fieldLayer.meanVKm / 2,
        light.above * facing * (1 - tones.fade), body, lit) : lit,
      closed: closed * day,
      daylit: daylitShare(altitude),
      light: light?.sun ? light.strength * light.above : 0,
    }
    // By night a deck over the towns gives their light back from its base (an overcast city night is not black).
    const sheet = cloudSheetOf(world, geom, snapshot, colours, cityLit(world, level, fieldLayer.cover))
    if (level === 'low') beyond = { rgb: lowSheetRgb(colours, light), cover: fieldLayer.cover, sheet: sheet ?? null }
    if (sheet) out.push(sheet)
  }
  return out
}
