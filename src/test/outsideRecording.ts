import type { LayerOf, SceneBox } from '../scene/model/types'
import type { Ctx2D, PaintEnv } from '../scene/paint/shared/base/hand'
import { PAINT_PASS } from '../scene/paint/shared/base/paintPass'

/** The figure's box the outside painters' tests lay the place in. */
export const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
export const FORM = new Set(['save', 'restore', 'translate', 'scale', 'rotate', 'transform', 'setTransform', 'beginPath',
  'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'rect', 'closePath', 'clip', 'fill',
  'stroke', 'fillRect', 'strokeRect'])
const env: PaintEnv = { hand: { grain: 1 }, phase: 0, scale: 1, canvas: () => ({
  canvas: {} as OffscreenCanvas,
  ctx: { createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {} } as unknown as Ctx2D,
}) }

function colour(value: string) {
  const [r, g, b, a = 1] = (value.match(/[\d.]+/g) ?? []).map(Number)
  return [r / 255, g / 255, b / 255, a]
}

interface Gradient { cast: boolean; halo: boolean; span: number; stops: number[][] }

/** What an outside painter laid: its form, its paint's channels, the casts, the lit windows, the halos and the emissions. */
export function recordOutside(paint: (ctx: Ctx2D, layer: LayerOf<'outside'>, env: PaintEnv) => void,
  layer: LayerOf<'outside'>, windowsOnly = false) {
  const form: [string, ...number[]][] = [], channels: number[] = []
  const casts: { span: number; alpha: number; path: typeof form }[] = []
  const halos: number[] = []
  const lit = new Set<string>(), emissions: unknown[] = []
  let emissive = false, pathStart = 0
  let fill: string | Gradient, stroke: string
  const ctx = new Proxy({}, {
    get: (_, op: string | symbol) => op === PAINT_PASS ? (kind: string, draw: () => void) => {
      emissive = kind === 'emission'
      draw()
      emissive = false
      return true
    } : (...args: number[]) => {
      if (op === 'createLinearGradient' || op === 'createRadialGradient') {
        const stops: number[][] = []
        // Casts have two stops across the ground. Round glyph bodies have a multi-stop falloff.
        const cast = op === 'createLinearGradient' && args[1] === 0 && args[3] === 0
        return { cast, halo: op === 'createRadialGradient' && args[5] === 1.3, span: args[2] - args[0], stops,
          addColorStop: (_: number, css: string) => { if (!windowsOnly) stops.push(colour(css)) } }
      }
      if (op === 'fillRect' && emissive && typeof fill === 'string') {
        const [, , w, h] = args
        if ((w === .55 || (w === .5 && h === .55)) && !fill.includes('/')) lit.add(args.join(','))
      }
      if (windowsOnly || typeof op !== 'string' || !FORM.has(op)) return
      if (op === 'beginPath') pathStart = form.length
      form.push([op, ...args])
      if (op === 'fill' && typeof fill !== 'string' && fill.cast && fill.stops.length === 2) {
        casts.push({ span: fill.span, alpha: fill.stops[0][3], path: form.splice(pathStart) })
      } else if (op === 'fill' || op === 'fillRect' || op === 'stroke') {
        const paint = op === 'stroke' ? stroke : fill
        if (emissive) emissions.push([op, args, typeof paint === 'string' ? paint : paint.stops])
        if (typeof paint !== 'string' && paint.halo) halos.push(paint.stops[0][3])
        channels.push(...(typeof paint === 'string' ? colour(paint) : paint.stops.flat()))
      }
    },
    set: (_, key: string, value: string | Gradient) => {
      if (key === 'fillStyle') fill = value
      if (key === 'strokeStyle' && typeof value === 'string') stroke = value
      return true
    },
  }) as Ctx2D
  paint(ctx, layer, env)
  return { form, channels, casts, lit, halos, emissions }
}
