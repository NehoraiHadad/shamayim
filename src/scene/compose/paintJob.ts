import { frameCount, framePhase } from '../model/anim'
import { cacheRatio } from '../model/keys'
import type { LayerDesc } from '../model/types'
import { styleKey, type Ctx2D, type Hand, type PaintEnv, type Painter, type Scratch } from '../paint'
import type { SceneStyle } from '../sceneStyle'
import { shadeKeyOf } from './paintReceiver'

/** A layer's canvas in device px: whole pixels, so it is laid into the surface 1:1. */
export interface DeviceRect { x: number; y: number; w: number; h: number }

export function deviceRect(desc: LayerDesc, ratio: number): DeviceRect {
  const { x, y, w, h } = desc.bounds
  const x0 = Math.floor(x * ratio + 1e-6), y0 = Math.floor(y * ratio + 1e-6)
  return { x: x0, y: y0, w: Math.max(1, Math.ceil((x + w) * ratio - 1e-6) - x0), h: Math.max(1, Math.ceil((y + h) * ratio - 1e-6) - y0) }
}

/** The pixel ratio a layer is cached at and the key its form canvas holds (the layer's key, its ratio, bounds and style). */
export function formKeyOf(desc: LayerDesc, dpr: number, style: SceneStyle = 'real'): { ratio: number; key: string } {
  const ratio = cacheRatio(dpr, desc.soft)
  const { x, y, w, h } = desc.bounds
  return { ratio, key: `${desc.key}@${ratio}:${x},${y},${w},${h}${stripKey(desc)}${styleKey(desc, style)}` }
}

/** A strip's frames are part of what its canvas holds (C7). */
export const stripKey = (desc: LayerDesc) => (desc.animated?.frames ? `#${desc.animated.frames.count}/${desc.animated.frames.fps}` : '')

export const beamKeyOf = (desc: LayerDesc) => desc.light ? desc.light.key + stripKey(desc) : null

/** The key a layer's light canvas holds, or null when there is no light painter. */
export function lightKeyOf(desc: LayerDesc, painter: Painter | undefined, style: SceneStyle = 'real') {
  if (!painter?.light || !desc.light) return null
  const shade = shadeKeyOf(desc)
  return beamKeyOf(desc) + styleKey(desc, style) + (shade ? `:${shade}` : '')
}

/**
 * Paints one part of a layer (its form or its light) on a context of the layer's device size: cleared, then the painter
 * called in scene px (the transform takes scene px to the canvas's device px). The same on the main thread (`LayerCache`)
 * and in the paint worker (`paintWorker.ts`), so both give the same pixels.
 */
export function paintPart(ctx: Ctx2D, size: { width: number; height: number }, desc: LayerDesc, ratio: number, rect: DeviceRect,
  paint: Painter['form'], phase: number, hand: Hand, scratch: (w: number, h: number) => Scratch, only?: readonly number[],
  style?: SceneStyle, shade?: Ctx2D, pose?: number) {
  const targets = shade ? [ctx, shade] : [ctx]
  for (const target of targets) {
    target.setTransform(1, 0, 0, 1, 0, 0)
    target.globalCompositeOperation = 'source-over'
    target.globalAlpha = 1
    if (!only) target.clearRect(0, 0, size.width, size.height)
  }
  const canvas = (w: number, h: number) => scratch(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)))
  const count = pose === undefined ? frameCount(desc.animated) : 1
  if (count === 1) {
    for (const target of targets) target.setTransform(ratio, 0, 0, ratio, -rect.x, -rect.y)
    paint(ctx, desc, { hand, style, phase: pose === undefined ? phase : framePhase(desc.animated, pose), scale: ratio, canvas, shade })
    for (const target of targets) target.setTransform(1, 0, 0, 1, 0, 0)
    return
  }
  // A strip (C7): each frame painted at its own phase in its own band of the canvas, clipped to it (`only`: those frames
  // alone, each band cleared first; the main thread's cache paints a strip's frames as they are first laid).
  for (let i = 0; i < count; i++) {
    if (only && !only.includes(i)) continue
    for (const target of targets) {
      if (only) target.clearRect(0, i * rect.h, rect.w, rect.h)
      target.save()
      target.beginPath()
      target.rect(0, i * rect.h, rect.w, rect.h)
      target.clip()
      target.setTransform(ratio, 0, 0, ratio, -rect.x, -rect.y + i * rect.h)
    }
    const env: PaintEnv = { hand, style, phase: framePhase(desc.animated, i), scale: ratio, canvas, shade }
    paint(ctx, desc, env)
    for (const target of targets) target.restore()
  }
}

/** A layer's canvas in device px: its frame, times the frames of a strip (1 for a still layer). */
export const canvasSize = (desc: LayerDesc, rect: DeviceRect) => ({ w: rect.w, h: rect.h * frameCount(desc.animated) })

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
  style?: SceneStyle
  /** Subset of strip frame indices to paint in this batch (for chunked multi-frame strips). */
  frames?: readonly number[]
  /** Whether this job completes the part and transfers its bitmap (defaults to true). */
  final?: boolean
  /** Publish a copy of frame zero while the strip remains staged. */
  preview?: true
  progressive?: boolean
  /** The job paints both solar endpoints in the same invocation. */
  shade?: true
  /** A cold canopy may publish frame zero with just its beam image before requesting its pair. */
  coldPreview?: true
  /** A new lit terrain receiver takes precedence over other queued land work during a scrub. */
  scrubReceiver?: true
}

export interface PaintRequest { batch: number; jobs: PaintJob[]; discard?: string[] }

export const paintSlot = (id: string, part: PaintJob['part']) => `${id}:${part}`

export interface PaintResult {
  id: string
  part: 'form' | 'light'
  key: string
  formKey: string
  ratio: number
  rect: DeviceRect
  /** Transferred bitmap on completion, or null for an intermediate strip chunk still staged in the worker. */
  bitmap: ImageBitmap | null
  shade?: ImageBitmap | null
  /** Additional paired canopy poses, individually drawable at their device size. */
  poses?: PaintPose[]
  preview?: true
  /** The worker's time for this part (ms), raster included. */
  ms: number
}

export interface PaintPose { bitmap: ImageBitmap; shade: ImageBitmap }

export function resultBitmaps({ bitmap, shade, poses }: Pick<PaintResult, 'bitmap' | 'shade' | 'poses'>) {
  return [bitmap, shade, ...(poses ?? []).flatMap((pose) => [pose.bitmap, pose.shade])]
}

export interface PaintReply { batch: number; results: PaintResult[]; error?: string }
