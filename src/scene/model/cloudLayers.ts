import { smoothstep } from '../../world/ridgeLighting'
import type { CloudLevel, WorldState } from '../../world/types'
import { towerLayerOf } from './cloudCells'
import { beamIncidence, cloudBeam, deckClosure, diffuseIlluminance, litTone } from './cloudBeam'
import { atCloudLuminance, limitCloudChroma } from './cloudChromaticity'
import { cloudFill, tintFill, twilightCloudFill, twilightWeight } from './cloudExposure'
import { cityLit } from './cityLight'
import { linearLuminance } from './landRadiance'
import { DECK_GREY, lightOn, RAIN_GREY, referenceCloudBeam, referenceCloudDay, tonesAt, transmissionAbove, WHITE } from './cloudLight'
import { cloudSheetOf, OVERCAST_HORIZON } from './cloudSheet'
import { coversOf, skyGeom, skyStops, type SkyGeom } from './sky'
import { mixLight, mixRgb, scaleLight } from './tone'
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
  const stops = skyStops(world, box, false)
  const { low, mid, high } = coversOf(world)
  const union = 1 - (1 - low) * (1 - mid) * (1 - high)
  const altitude = world.bodies.sun.altitude
  const day = referenceCloudDay(altitude)
  const sky = cloudFill(world)
  const twilight = twilightWeight(altitude)
  const rose = twilight ? twilightCloudFill(world) : sky
  const diffuse = diffuseIlluminance(altitude, world.light.diffuse)
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
    const above = transmissionAbove(world, cloud)
    const light = lightOn(world, box, geom, cloud, above)
    if (fieldLayer.lattice === 'tower') {
      const towers = towerLayerOf(world, box, geom, snapshot, light, stops, beyond, solar)
      if (towers) out.push(towers)
      continue
    }
    const rain = rainWeightAt(world, level, cloud.rains)
    const tones = tonesAt(world, box, stops, level, geom.dome(4) * 0.6, union, rain, 3)
    // Six tenths cover still exposes the sides of Sc rolls; at deck closure (tonesOf's 0.95) the base is a diffuse slab.
    const closed = deckClosure(fieldLayer.cover)
    const base = mixRgb(mixRgb(DECK_GREY, WHITE, 0.5), RAIN_GREY, rain)
    const grey = mixRgb(DECK_GREY, RAIN_GREY, rain)
    const incidence = beamIncidence(fieldLayer, altitude)
    const beam = linearLuminance(solar.direct) * incidence * above
    const relay = linearLuminance(solar.relay)
    const referenceBody = mixRgb(tones.body, base, day)
    const referenceShade = mixRgb(tones.shade, mixRgb(grey, scaleLight(base, OVERCAST_HORIZON), closed), day)
    const referenceLit = light ? mixRgb(tones.body, referenceCloudBeam(light, tones),
      light.sun || light.under > 0 ? 1 : light.strength * light.above) : tones.body
    const fill = tintFill(referenceBody, sky, (1 - union) * diffuse / (diffuse + beam + relay))
    const diffuseBody = tintFill(fill, rose, twilight * diffuse / (diffuse + beam + relay))
    const body = tintFill(diffuseBody, solar.relay, relay / (diffuse + relay))
    // In a deck with appreciable directional light, the away-facing face keeps more of the cool sky fill.
    const away = mixLight(body, fill, twilight * beam / (diffuse + beam + relay))
    const shade = atCloudLuminance(away, referenceShade)
    const direct = litTone(body, solar.direct, incidence * above * (1 - tones.fade) / (1 + diffuse))
    const lowSun = cloud.litUnderside * beam / (diffuse + beam + relay)
    const litColour = atCloudLuminance(direct, referenceLit)
    const lit = light?.moonRgb ? referenceLit : twilight ? mixLight(litColour,
      limitCloudChroma(litColour, body), twilight) : litColour
    const colours = { body, shade, lit, closed,
      light: light?.sun ? light.strength * light.above : 0, lowSun }
    // By night a deck over the towns gives their light back from its base (an overcast city night is not black).
    const sheet = cloudSheetOf(world, geom, snapshot, colours, cityLit(world, level, fieldLayer.cover))
    if (level === 'low') beyond = {
      rgb: lowSheetRgb(colours, light), cover: fieldLayer.cover, sheet,
      referenceRgb: lowSheetRgb({ body: referenceBody, shade: referenceShade, lit: referenceLit }, light),
    }
    if (sheet) out.push(sheet)
  }
  return out
}
