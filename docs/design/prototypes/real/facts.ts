import { skyGeom } from '../../../../src/scene/model/sky'
import { SCENE_H } from '../../../../src/world/sceneBox'
import type { WorldState } from '../../../../src/world/types'

/**
 * What the concept painters need of the world that the layers do not carry yet (REAL-STYLE.md, "Contract needs"): where
 * the light comes from. The page fills it before the scene mounts; phase 2 moves each field into its layer's desc.
 */
export interface LightFacts {
  /** The sun in sky px and its altitude, deg. */
  sun: { x: number; y: number; altitude: number }
  /** The moon in sky px, and its altitude, deg. */
  moon: { x: number; y: number; altitude: number }
  /** y of eye level in sky px. */
  horizon: number
}

export const FACTS: { light: LightFacts } = {
  light: { sun: { x: 187, y: 0, altitude: 40 }, moon: { x: 187, y: 0, altitude: -10 }, horizon: 372 },
}

export function readFacts(world: WorldState) {
  const geom = skyGeom(world, { width: window.innerWidth, skyHeight: 300 + SCENE_H, landTop: 300, landHeight: SCENE_H,
    dpr: window.devicePixelRatio || 1 })
  const at = (body: { azimuth: number; altitude: number }) =>
    ({ x: geom.x(body.azimuth), y: geom.dome(body.altitude), altitude: body.altitude })
  const { sun, moon } = world.bodies
  FACTS.light = { sun: at(sun), moon: at(moon), horizon: geom.horizon }
}

/** The light's side across the picture: −1 left … 1 right. */
export function lightSide(): number {
  const { sun, moon } = FACTS.light, lamp = sun.altitude > -4 ? sun : moon
  return Math.max(-1, Math.min(1, (lamp.x - 187) / 110))
}
