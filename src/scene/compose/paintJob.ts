import { cacheRatio } from '../model/keys'
import type { LayerDesc } from '../model/types'
import type { Ctx2D, Hand, PaintEnv, Painter, Scratch } from '../paint'

/** A layer's canvas in device px: whole pixels, so it is laid into the surface 1:1. */
export interface DeviceRect { x: number; y: number; w: number; h: number }

export function deviceRect(desc: LayerDesc, ratio: number): DeviceRect {
  const { x, y, w, h } = desc.bounds
  const x0 = Math.floor(x * ratio + 1e-6), y0 = Math.floor(y * ratio + 1e-6)
  return { x: x0, y: y0, w: Math.max(1, Math.ceil((x + w) * ratio - 1e-6) - x0), h: Math.max(1, Math.ceil((y + h) * ratio - 1e-6) - y0) }
}

/** The pixel ratio a layer is cached at and the key its form canvas holds (the layer's key, its ratio and bounds). */
export function formKeyOf(desc: LayerDesc, dpr: number): { ratio: number; key: string } {
  const ratio = cacheRatio(dpr, desc.soft)
  const { x, y, w, h } = desc.bounds
  return { ratio, key: `${desc.key}@${ratio}:${x},${y},${w},${h}` }
}

/** The key a layer's light canvas holds, or null when the layer has no light part (or no light painter). */
export const lightKeyOf = (desc: LayerDesc, painter: Painter | undefined) => (painter?.light && desc.light ? desc.light.key : null)

/**
 * Paints one part of a layer (its form or its light) on a context of the layer's device size: cleared, then the painter
 * called in scene px (the transform takes scene px to the canvas's device px). The same on the main thread (`LayerCache`)
 * and in the paint worker (`paintWorker.ts`), so both give the same pixels.
 */
export function paintPart(ctx: Ctx2D, size: { width: number; height: number }, desc: LayerDesc, ratio: number, rect: DeviceRect,
  paint: Painter['form'], phase: number, hand: Hand, scratch: (w: number, h: number) => Scratch) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, size.width, size.height)
  ctx.setTransform(ratio, 0, 0, ratio, -rect.x, -rect.y)
  const env: PaintEnv = { hand, phase, scale: ratio, canvas: (w, h) => scratch(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h))) }
  paint(ctx, desc, env)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

/** One part of one layer for the paint worker to paint. */
export interface PaintJob {
  id: string
  part: 'form' | 'light'
  /** The key the painted canvas will hold (the form key, or the light key). */
  key: string
  /** The form key it was painted for (a light is only laid over the form it was painted for). */
  formKey: string
  desc: LayerDesc
  ratio: number
  rect: DeviceRect
  phase: number
  hand: Hand
}

export interface PaintRequest { batch: number; jobs: PaintJob[] }

export interface PaintResult {
  id: string
  part: 'form' | 'light'
  key: string
  formKey: string
  ratio: number
  rect: DeviceRect
  bitmap: ImageBitmap
  /** The worker's time for this part (ms), raster included. */
  ms: number
}

export interface PaintReply { batch: number; results: PaintResult[]; error?: string }
