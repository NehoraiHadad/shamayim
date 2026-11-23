import type { RGB } from '../../../model/types'
import { css, type Ctx2D } from '../base/hand'

export type ReceiverInk = readonly [RGB, RGB?]

export function mapInk([lit, shade]: ReceiverInk, map: (rgb: RGB) => RGB): ReceiverInk {
  return [map(lit), shade && map(shade)]
}

export function mixInk([lit, shade]: ReceiverInk, [other, dark]: ReceiverInk,
  mix: (a: RGB, b: RGB) => RGB): ReceiverInk {
  return [mix(lit, other), (shade || dark) && mix(shade ?? lit, dark ?? other)]
}

/** Trace the current path for one target, or share a single Path2D across both receiver endpoints. */
export function receiverBrush(ctx: Ctx2D, shade?: Ctx2D) {
  let shared: Path2D | undefined
  return {
    path(): CanvasPath {
      if (shade) return shared = new Path2D()
      ctx.beginPath()
      return ctx
    },
    fill(ink: ReceiverInk, alpha: number) {
      ctx.fillStyle = css(ink[0], alpha)
      if (shade && shared) {
        shade.fillStyle = css(ink[1] ?? ink[0], alpha)
        ctx.fill(shared); shade.fill(shared)
      } else ctx.fill()
    },
    stroke(ink: ReceiverInk, alpha: number, width: number) {
      ctx.strokeStyle = css(ink[0], alpha)
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      if (shade && shared) {
        shade.strokeStyle = css(ink[1] ?? ink[0], alpha)
        shade.lineWidth = width
        shade.lineCap = 'round'
        ctx.stroke(shared); shade.stroke(shared)
      } else ctx.stroke()
    },
  }
}

export type ReceiverBrush = ReturnType<typeof receiverBrush>
