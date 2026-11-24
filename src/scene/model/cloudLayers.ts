import { smoothstep } from '../../world/ridgeLighting'
import type { CloudLevel, WorldState } from '../../world/types'
import { towerLayerOf } from './cloudCells'
import { cityLit } from './cityLight'
import { DECK_GREY, lightOn, RAIN_GREY, WHITE } from './cloudLight'
import { cloudSheetOf, OVERCAST_HORIZON } from './cloudSheet'
import { sheetLitTone, sheetTones } from './cloudSheetLight'
import { coversOf, skyGeom, skyStops, type SkyGeom } from './sky'
import { mixRgb, scaleLight } from './tone'
import { lowSheetRgb, type Beyond } from './towerStorms'
import type { LayerOf, SceneBox } from './types'

/*
 * The clouds (C6, rebuilt on the field, SPEC §6.0: layers before shapes): each field layer as one sheet over the dome,
 * and the towers, which stand up out of any sheet, as sprites. One light per level (`lightOn`), the tones of the sky
 * behind (`tonesAt`). Pure: the world and the box.
 */

export type CloudLayerDesc = LayerOf<'cloudSheet'> | LayerOf<'cloudCells'>

export function cloudLayersOf(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): CloudLayerDesc[] {
  const stops = skyStops(world, box)
  const { low, mid, high } = coversOf(world)
  const union = 1 - (1 - low) * (1 - mid) * (1 - high)
  const day = smoothstep(-8, 3, world.bodies.sun.altitude)
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
    const { rain, tones } = sheetTones(world, box, geom, stops, cloud, union)
    // Six tenths cover still exposes the sides of Sc rolls; at deck closure (tonesOf's 0.95) the base is a diffuse slab.
    const closed = smoothstep(0.6, 0.95, fieldLayer.cover)
    const base = mixRgb(mixRgb(DECK_GREY, WHITE, 0.5), RAIN_GREY, rain)
    const grey = mixRgb(DECK_GREY, RAIN_GREY, rain)
    const colours = {
      body: mixRgb(tones.body, base, day),
      // The Eddington boundary source at μ=0 has 2/5 of its zenith value.
      shade: mixRgb(tones.shade, mixRgb(grey, scaleLight(base, OVERCAST_HORIZON), closed), day),
      lit: sheetLitTone(tones, light),
      closed: closed * day,
      light: light?.sun ? light.strength * light.above : 0,
    }
    // By night a deck over the towns gives their light back from its base (an overcast city night is not black).
    const sheet = cloudSheetOf(world, geom, snapshot, colours, cityLit(world, level, fieldLayer.cover))
    if (level === 'low') beyond = { rgb: lowSheetRgb(colours, light), cover: fieldLayer.cover, sheet }
    if (sheet) out.push(sheet)
  }
  return out
}
