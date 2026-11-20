import { azimuthAt, type Camera } from '../../domain/camera'
import { computePanorama, RAYS, type HeightAt, type HorizonRay, type Panorama } from '../terrain/panorama'

/**
 * The world around a place, with no screen in it: the horizon in every direction (one ray every `WORLD_STEP` degrees,
 * clockwise from north). A view (`viewPanorama`) takes the rays a camera sees, in screen order; the land is then drawn
 * from that slice exactly as the south panorama always was. Sun, moon and shadows are decided against the world, never
 * against what happens to be on screen.
 */
export const WORLD_STEP = 1.25
export const WORLD_RAYS = 360 / WORLD_STEP

/** A place's whole horizon: rays at 0°, 1.25°, … 358.75°. Today's south panorama is an exact subset of it. */
export function computeWorld(heightAt: HeightAt, groundM: number): Panorama {
  return computePanorama(heightAt, groundM, WORLD_RAYS, (i) => i * WORLD_STEP)
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** The world's ray at any azimuth: exact on the 1.25° grid, otherwise blended from its two neighbours. */
export function worldRay(world: Panorama, azimuth: number): HorizonRay {
  const n = world.rays.length
  const raw = ((((azimuth % 360) + 360) % 360) / 360) * n
  // On the grid (to rounding), the ray itself.
  const position = Math.abs(raw - Math.round(raw)) < 1e-6 ? Math.round(raw) : raw
  const i = Math.floor(position) % n
  const t = position - Math.floor(position)
  const a = world.rays[i]
  if (t === 0) return a
  const b = world.rays[(i + 1) % n]
  const near = t < 0.5 ? a : b
  return {
    azimuth: ((azimuth % 360) + 360) % 360,
    profile: a.profile.map((sample, k) => ({ angle: mix(sample.angle, b.profile[k].angle, t), seen: sample.seen && b.profile[k].seen })),
    near: { ...near.near, angle: mix(a.near.angle, b.near.angle, t) },
    far: { ...near.far, angle: mix(a.far.angle, b.far.angle, t) },
    seaKm: near.seaKm,
  }
}

/** The slice of the world a camera sees: `RAYS` rays from the left edge to the right edge, in screen order. */
export function viewPanorama(world: Panorama, camera: Camera, rays = RAYS): Panorama {
  return {
    eyeM: world.eyeM,
    groundM: world.groundM,
    rays: Array.from({ length: rays }, (_, i) => worldRay(world, azimuthAt(i / (rays - 1), camera))),
  }
}

/** The horizon's angle (deg) in a direction, the higher of the near ridge and the far horizon. */
export function horizonAngle(world: Panorama, azimuth: number): number {
  const ray = worldRay(world, azimuth)
  return Math.max(ray.near.angle, ray.far.angle)
}
