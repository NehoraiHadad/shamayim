import { smoothstep } from '../../world/ridgeLighting'
import type { CloudLayer, WorldState } from '../../world/types'
import { tonesAt, type CloudLight, type Tones } from './cloudLight'
import type { SkyGeom } from './sky'
import { mixRgb } from './tone'
import type { RGB, SceneBox } from './types'

// The sheet's representative bank is 3 km away, in the lower sky.
export const SHEET_TONE_ALTITUDE = 4

export function sheetTones(world: WorldState, box: SceneBox, geom: SkyGeom, stops: [number, RGB][], cloud: CloudLayer, union: number) {
  const rain = world.cloudField?.field.rain
  const mid = rain?.midWeight ?? Number(rain?.level === 'mid')
  // Mid and low share the rain. The rate eases into the rain tone at 0.2 mm/h.
  const rainWeight = rain ? smoothstep(0, 0.2, rain.rate) * (cloud.level === 'mid' ? mid : cloud.level === 'low' ? 1 - mid : 0)
    : Number(cloud.rains)
  return { rain: rainWeight, tones: tonesAt(world, box, stops, cloud.level, geom.dome(SHEET_TONE_ALTITUDE) * 0.6, union, rainWeight, 3) }
}

export function sheetLitTone(tones: Tones, light: CloudLight | null): RGB {
  // Moonlight lifts the lit endpoint in proportion to its beam; at moonset it merges into the body.
  return light ? mixRgb(tones.body, mixRgb(light.rgb, tones.behind, tones.fade),
    light.sun || light.under > 0 ? 1 : light.strength * light.above) : tones.body
}
