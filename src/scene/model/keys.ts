//# allFunctionsCalledOnLoad
import { partKey } from '../../world/keys'
import type { RGB } from '../../world/types'
import type { SceneBox } from './types'

/**
 * Layer keys (§1d): a hash of a layer's exact inputs, numbers rounded to what can change a pixel. Colours count in
 * 1/256 steps; the box and the cache's pixel ratio are in every key; `phase` never is.
 */
export function byteKey(bytes: Uint8Array) {
  let hash = 2166136261
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619)
  return (hash >>> 0).toString(36)
}

export const colourKey = (rgb: RGB) => rgb.map((c) => Math.round(c * 255))

/**
 * The pixel ratio a layer is cached at: the device's, for every layer. The plan's cap for soft layers (`min(dpr, 2)`)
 * is not used: a cached bitmap is never scaled up (the anidoodle contract), and a 1:1 blit is the fast path (a scaled
 * `drawImage` of the sky cost 22 ms against 2.7 ms in software raster, CPU ×4, dpr 2.75). `soft` stays in the model
 * for a later memory cap that only ever scales down.
 */
export const cacheRatio = (dpr: number, _soft = false) => dpr

export function layerKey(...parts: unknown[]): string {
  return partKey(parts, 2)
}

/** The part of the box a land layer depends on. */
export const landBoxKey = (box: SceneBox, soft = false) => [box.width, box.landHeight, cacheRatio(box.dpr, soft)]
/** The part of the box a sky layer depends on. */
export const skyBoxKey = (box: SceneBox, soft = false) => [box.width, box.skyHeight, box.landTop, cacheRatio(box.dpr, soft),
  box.skyWidth ?? box.width, box.landLeft ?? 0]
