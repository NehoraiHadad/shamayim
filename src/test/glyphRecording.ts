import type { Ctx2D } from '../scene/paint/shared/base/hand'

const FORM = new Set(['save', 'restore', 'translate', 'scale', 'rotate', 'transform', 'beginPath', 'moveTo',
  'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'rect', 'closePath', 'clip', 'fill', 'stroke', 'fillRect', 'strokeRect'])
const rounded = (args: unknown[]) => args.map((arg) => typeof arg === 'number' ? Math.round(arg * 1e6) / 1e6 : arg)
const colour = (value: string) => {
  const [r, g, b, alpha = 1] = (value.match(/[\d.]+/g) ?? []).map(Number)
  return [r / 255, g / 255, b / 255, alpha]
}
export function recording() {
  const form: unknown[][] = [], light: unknown[][] = [], channels: number[] = []
  const paint = (op: string, value: unknown) => {
    light.push([op, value])
    if (typeof value === 'string') channels.push(...colour(value))
  }
  let gradientId = 0
  const ctx = new Proxy({}, {
    get: (_, key: string) => typeof key === 'symbol' ? undefined : (...args: unknown[]) => {
      if (FORM.has(key)) form.push([key, ...rounded(args)])
      if (key.startsWith('create') && key.endsWith('Gradient')) {
        light.push([key, ...rounded(args)])
        return {
          id: gradientId++,
          addColorStop(offset: number, value: string) {
            light.push(['offset', offset])
            paint('stop', value)
          },
        }
      }
    },
    set: (_, key: string, value: unknown) => {
      if (key === 'fillStyle' || key === 'strokeStyle') paint(key, value)
      return true
    },
  }) as Ctx2D
  return { form, light, channels, ctx }
}
