import { expect, vi } from 'vitest'
import * as heightSolver from './heightLabel'
import { DOT_R } from './layout'
import { heightLabelBox } from './sceneClearance'
import { SCENE_W } from './sceneBox'

export function measureHeightLabel<T>(place: string, build: () => T): T {
  const { besideDot } = heightSolver
  const solver = vi.spyOn(heightSolver, 'besideDot')
  let args: Parameters<typeof besideDot> | undefined
  let world: T
  try {
    world = build()
    args = solver.mock.calls[0]
  } finally {
    solver.mockRestore()
  }
  if (!args) throw new Error(`Missing height solve for ${place}`)
  const input = args
  // Measure the median of seven solves on the world build's actual inputs.
  const samples = Array.from({ length: 7 }, () => {
    const start = performance.now()
    const spot = besideDot(...input)
    return { ms: performance.now() - start, spot }
  }).sort((a, b) => a.ms - b.ms)
  const { ms, spot } = samples[3]
  if (!spot) throw new Error(`Missing tethered badge for ${place}`)
  const [dot, text, width] = input
  const center = dot.x * SCENE_W / width
  const { x, y, w, h } = heightLabelBox({ ...spot, text, below: false, backed: true }, SCENE_W)
  const dx = Math.max(x - center, center - x - w, 0), dy = Math.max(y - dot.y, dot.y - y - h, 0)
  const distance = Math.hypot(dx, dy) - DOT_R
  const side = y + h <= dot.y ? 'above' : y >= dot.y ? 'below' : spot.x < center ? 'left' : 'right'
  const { marks, fabric } = spot
  console.log(JSON.stringify({ place, ms, side, distance, marks, fabric }))
  expect(ms).toBeLessThanOrEqual(3)
  return world
}
