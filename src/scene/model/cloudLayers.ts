import { SKY_THEMES } from '../../theme/skyThemes'
import { smoothstep } from '../../world/ridgeLighting'
import type { CloudLevel, WorldState } from '../../world/types'
import { towerLayerOf } from './cloudCells'
import { cloudBeam, litTone } from './cloudBeam'
import { cityLit } from './cityLight'
import { linearLuminance } from './landRadiance'
import { DECK_GREY, lightOn, RAIN_GREY, tonesAt, transmissionAbove, WHITE } from './cloudLight'
import { cloudSheetOf, OVERCAST_HORIZON } from './cloudSheet'
import { coversOf, skyGeom, skyStops, type SkyGeom } from './sky'
import { labOf, mixRgb, rgbOf, rgbOfLab, scaleLight } from './tone'
import { lowSheetRgb, type Beyond } from './towerStorms'
import type { LayerOf, SceneBox } from './types'

/*
 * The clouds (C6, rebuilt on the field, SPEC §6.0: layers before shapes): each field layer as one sheet over the dome,
 * and the towers, which stand up out of any sheet, as sprites. One light per level (`lightOn`), the tones of the sky
 * behind (`tonesAt`). Pure: the world and the box.
 */

export type CloudLayerDesc = LayerOf<'cloudSheet'> | LayerOf<'cloudCells'>

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
  // Start the display exposure at nautical dusk. A 30° span spreads the roughly 0.6 Oklab
  // lightness range over 0.02 per degree, leaving room for changing sky fill at sunset.
  // Oklab interpolation gives equal perceptual lightness changes for equal steps of exposure.
  const altitude = world.bodies.sun.altitude
  const day = Math.min(1, Math.max(0, (altitude + 12) / 30))
  const skyWeight = smoothstep(-12, -8, altitude)
  const { palette, ambient } = world.light
  const skyFill = mixRgb(ambient, rgbOf(palette.horizon), 0.5)
  const sky = labOf(skyFill)
  const night = SKY_THEMES.night
  const nightFill = labOf(mixRgb(rgbOf(night.mid), rgbOf(night.horizon), 0.5))
  // The colour from the horizon-to-mid band modulates the cloud fill. For diffuse downwelling
  // light the band below the sky model's 30° mid stop supplies sin²(30°) = 1/4 of projected sky.
  const twilightFill = rgbOfLab({ ...sky, l: nightFill.l + (sky.l - nightFill.l) / 4 })
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
    const solar = cloudBeam(world, cloud, fieldLayer)
    const light = lightOn(world, box, geom, cloud, solar)
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
    // The sky supplies the chromaticity of diffuse light. Cover reduces saturation as droplets scatter it.
    const sunlit = labOf(base)
    const clear = 1 - union
    const fill = rgbOfLab({ l: sunlit.l, a: sunlit.a + sky.a * clear, b: sunlit.b + sky.b * clear })
    const diffuse = mixRgb(mixRgb(tones.body, twilightFill, skyWeight), fill, day)
    const body = litTone(diffuse, solar.relay, 1)
    const bodyLight = labOf(body)
    const shadeLight = labOf(mixRgb(grey, scaleLight(base, OVERCAST_HORIZON), closed)).l
    // Both faces see the same diffuse source. The underside receives less of it as the deck closes.
    const shade = mixRgb(tones.shade, rgbOfLab({ ...bodyLight, l: bodyLight.l - day * (sunlit.l - shadeLight) }), skyWeight)
    // A slab intercepts DNI in proportion to the beam's projected area. The thin high veil
    // scatters through its volume, whose optically thin intercept is independent of that angle.
    const incidence = level === 'high' ? 1 : Math.abs(Math.sin(altitude * Math.PI / 180))
    const through = incidence * (light?.above ?? transmissionAbove(world, cloud)) * (1 - tones.fade)
    const direct = litTone(body, solar.direct, day * through)
    // Diffuse fill is the unit in cloudBeam. Only the direct fraction of the incident light
    // can reverse the drawn relief when the underside faces the low sun.
    const beamToSky = linearLuminance(solar.direct) * through
    const lowSun = cloud.litUnderside * beamToSky / (1 + beamToSky)
    const lit = light && !light.sun && light.under === 0
      ? litTone(direct, light.rgb, light.strength * light.above * (1 - tones.fade) * (1 - skyWeight))
      : direct
    const colours = { body, shade, lit, closed: closed * day,
      light: light?.sun ? light.strength * light.above : 0, lowSun }
    // By night a deck over the towns gives their light back from its base (an overcast city night is not black).
    const sheet = cloudSheetOf(world, geom, snapshot, colours, cityLit(world, level, fieldLayer.cover))
    if (level === 'low') beyond = { rgb: lowSheetRgb(colours, light), cover: fieldLayer.cover, sheet }
    if (sheet) out.push(sheet)
  }
  return out
}
