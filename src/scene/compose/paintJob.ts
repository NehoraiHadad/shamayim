import { frameCount, framePhase } from '../model/anim'
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
  return { ratio, key: `${desc.key}@${ratio}:${x},${y},${w},${h}${stripKey(desc)}` }
}

/** A strip's frames are part of what its canvas holds (C7). */
const stripKey = (desc: LayerDesc) => (desc.animated?.frames ? `#${desc.animated.frames.count}/${desc.animated.frames.fps}` : '')

/** The key a layer's light canvas holds, or null when the layer has no light part (or no light painter). */
export const lightKeyOf = (desc: LayerDesc, painter: Painter | undefined) =>
  (painter?.light && desc.light ? desc.light.key + stripKey(desc) : null)

/**
 * Paints one part of a layer (its form or its light) on a context of the layer's device size: cleared, then the painter
 * called in scene px (the transform takes scene px to the canvas's device px). The same on the main thread (`LayerCache`)
 * and in the paint worker (`paintWorker.ts`), so both give the same pixels.
 */
export function paintPart(ctx: Ctx2D, size: { width: number; height: number }, desc: LayerDesc, ratio: number, rect: DeviceRect,
  paint: Painter['form'], phase: number, hand: Hand, scratch: (w: number, h: number) => Scratch, only?: readonly number[]) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  if (!only) ctx.clearRect(0, 0, size.width, size.height)
  const canvas = (w: number, h: number) => scratch(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)))
  const count = frameCount(desc.animated)
  if (count === 1) {
    ctx.setTransform(ratio, 0, 0, ratio, -rect.x, -rect.y)
    paint(ctx, desc, { hand, phase, scale: ratio, canvas })
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return
  }
  // A strip (C7): each frame painted at its own phase in its own band of the canvas, clipped to it (`only`: those frames
  // alone, each band cleared first; the main thread's cache paints a strip's frames as they are first laid).
  for (let i = 0; i < count; i++) {
    if (only && !only.includes(i)) continue
    if (only) ctx.clearRect(0, i * rect.h, rect.w, rect.h)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, i * rect.h, rect.w, rect.h)
    ctx.clip()
    ctx.setTransform(ratio, 0, 0, ratio, -rect.x, -rect.y + i * rect.h)
    const env: PaintEnv = { hand, phase: framePhase(desc.animated, i), scale: ratio, canvas }
    paint(ctx, desc, env)
    ctx.restore()
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

/** A layer's canvas in device px: its frame, times the frames of a strip stacked down it (C7). */
export const canvasSize = (desc: LayerDesc, rect: DeviceRect) => ({ w: rect.w, h: rect.h * frameCount(desc.animated) })

const EMPTY_F32 = new Float32Array(0)
const EMPTY_U8 = new Uint8Array(0)

/**
 * Trims form-only buffers from a descriptor before posting a `light`-only job across the Worker boundary
 * so scrub frames never clone palettes, terraces, field quads, orchard rows or desert strata unnecessarily.
 */
export function lightJobDesc(desc: LayerDesc): LayerDesc {
  if (desc.kind !== 'plane' && desc.kind !== 'canopy') return desc
  const hasLift = desc.kind === 'canopy' ? desc.lift !== null : !desc.canopyId && desc.light.lift !== null
  const veg = desc.vegetation
  return {
    ...desc,
    ...(desc.kind === 'plane' ? {
      surfaceTone: { palette: [], cols: 0, rows: 0, cells: [], source: '' },
      terraces: [],
      gullies: desc.light.lift ? desc.gullies : [],
    } : {}),
    vegetation: {
      ...veg,
      trees: hasLift ? veg.trees : EMPTY_F32,
      treeMeta: hasLift ? veg.treeMeta : EMPTY_U8,
      tufts: hasLift ? veg.tufts : EMPTY_F32,
      tuftMeta: desc.kind === 'canopy' ? veg.tuftMeta : EMPTY_U8,
      fields: EMPTY_F32, fieldMeta: EMPTY_U8,
      rows: EMPTY_F32, rowMeta: EMPTY_U8,
      strata: EMPTY_F32, strataMeta: EMPTY_U8,
      tones: [],
    },
  }
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
