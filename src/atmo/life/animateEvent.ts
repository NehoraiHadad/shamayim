import { rng } from './planEvent'
import type { EventPlan, FlockOffset } from './types'

interface Bounds { width: number; y: number; alpha: number }

function wingbeats(root: HTMLElement, plan: EventPlan, seed: number): Animation[] {
  const random = rng(seed + 41)
  return [...root.querySelectorAll<SVGPathElement>('[data-wing]')].map((wing) => {
    const right = wing.dataset.wing === 'right'
    let frames: Keyframe[] = [{ transform: `rotate(${right ? 8 : -8}deg)` }]
    let duration = 8000
    if (plan.kind === 'cranes') {
      frames = [{ transform: `rotate(${right ? 28 : -28}deg)` }, { transform: `rotate(${right ? -18 : 18}deg)` }]
      duration = 620
    } else if (plan.kind === 'storks') {
      const sign = right ? -1 : 1
      duration = 6000 + random() * 4000
      const end = 2100 / duration
      frames = [0, .05, .17, .29, .41, .53, .65, .77, 1].map((part, i) => ({
        offset: i === 8 ? 1 : part * end,
        transform: `rotate(${sign * (i === 0 || i >= 7 ? -8 : i % 2 ? -28 : 18)}deg)`,
      }))
    } else if (plan.kind === 'swifts') {
      frames = [0, .083, .167, .25, .333, .4, 1].map((offset, i) => ({ offset, transform: `scaleY(${i < 6 && i % 2 ? .5 : 1})` }))
      duration = 1000
    }
    return wing.animate(frames, { duration, iterations: Infinity, direction: plan.kind === 'cranes' ? 'alternate' : 'normal', easing: 'ease-in-out', delay: -random() * duration })
  })
}

function flock(root: HTMLElement, plan: EventPlan, bounds: Bounds, offsets: FlockOffset[], seed: number): Animation[] {
  const start = plan.dir > 0 ? -40 : bounds.width + 40
  const end = plan.dir > 0 ? bounds.width + 40 : -40
  const migration = plan.kind === 'cranes' || plan.kind === 'storks'
  const scale = migration ? (root.dataset.autumn === 'true' ? [.8, 1.15] : [1.15, .8]) : [1, 1]
  const rise = migration ? (root.dataset.autumn === 'true' ? -18 : 18) : 0
  const main = root.animate([
    { transform: `translate3d(${start}px,0,0) scale(${scale[0]})` },
    { transform: `translate3d(${end}px,${rise}px,0) scale(${scale[1]})` },
  ], { duration: plan.durationMs, easing: 'linear', fill: 'both' })
  const random = rng(seed + 73)
  const followers = [...root.querySelectorAll<HTMLElement>('[data-bird-wrap]')].map((bird, i) => {
    const base = offsets[i] ?? { x: 0, y: 0 }
    const drift = plan.kind === 'storks' ? 4 : i ? 1.5 : 0
    return bird.animate([
      { transform: `translate(${base.x * plan.dir - drift}px,${base.y - drift}px)` },
      { transform: `translate(${base.x * plan.dir + drift}px,${base.y + drift}px)` },
    ], { duration: 3000 + random() * 4000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' })
  })
  return [main, ...followers, ...wingbeats(root, plan, seed)]
}

function swifts(root: HTMLElement, plan: EventPlan, bounds: Bounds, seed: number): Animation[] {
  const random = rng(seed + 101)
  return [...root.querySelectorAll<HTMLElement>('[data-swift]')].flatMap((bird, index) => {
    const dir = index < Math.ceil(plan.count * .6) ? plan.dir : -plan.dir
    const start = dir > 0 ? -40 : bounds.width + 40
    const end = dir > 0 ? bounds.width + 40 : -40
    const c1 = (random() - .5) * 44
    const c2 = (random() - .5) * 44
    const frames = Array.from({ length: 9 }, (_, step) => {
      const t = step / 8; const mt = 1 - t
      const y = 3 * mt * mt * t * c1 + 3 * mt * t * t * c2
      return { transform: `translate3d(${start + (end - start) * t}px,${y}px,0)`, opacity: step === 0 || step === 8 ? 0 : 1 }
    })
    const flight = bird.animate(frames, { duration: 4500, delay: random() * 2500, easing: 'ease-in-out', fill: 'both' })
    return [flight, ...wingbeats(bird, plan, seed + index)]
  })
}

function raptor(root: HTMLElement, plan: EventPlan, bounds: Bounds, seed: number): Animation[] {
  const random = rng(seed + 151); const cx = bounds.width * (.25 + random() * .5)
  const frames = Array.from({ length: 37 }, (_, i) => {
    const t = i / 36; const a = t * Math.PI * 6
    return { transform: `translate3d(${cx + Math.cos(a) * 13 + plan.dir * 81 * t}px,${Math.sin(a) * 4.5 - 13.5 * t}px,0)` }
  })
  const circle = root.animate(frames, { duration: 27000, easing: 'linear', fill: 'both' })
  const fade = root.animate([{ opacity: 0 }, { opacity: bounds.alpha, offset: .055 }, { opacity: bounds.alpha, offset: .944 }, { opacity: 0 }], { duration: 27000 })
  const bird = root.querySelector<SVGElement>('[data-bird]')!
  const bank = bird.animate([{ transform: `scaleX(${plan.dir}) rotate(-12deg)` }, { transform: `scaleX(${plan.dir * .45})` }, { transform: `scaleX(${plan.dir}) rotate(12deg)` }], { duration: 9000, iterations: 3 })
  return [circle, fade, bank]
}

export function animateEvent(root: HTMLElement, plan: EventPlan, bounds: Bounds, offsets: FlockOffset[], seed: number): Animation[] {
  if (plan.kind === 'swifts') return swifts(root, plan, bounds, seed)
  if (plan.kind === 'raptor') return raptor(root, plan, bounds, seed)
  if (plan.kind === 'meteor') {
    const angle = 28 + (seed % 13); const x = bounds.width * (.15 + ((seed >>> 8) % 70) / 100)
    return [root.animate([
      { transform: `translate3d(${x}px,0,0) rotate(${angle}deg)`, opacity: bounds.alpha },
      { transform: `translate3d(${x + plan.dir * 80}px,${Math.tan(angle * Math.PI / 180) * 80}px,0) rotate(${angle}deg)`, opacity: bounds.alpha, offset: 2 / 3 },
      { transform: `translate3d(${x + plan.dir * 120}px,${Math.tan(angle * Math.PI / 180) * 120}px,0) rotate(${angle}deg)`, opacity: 0 },
    ], { duration: 450, easing: 'ease-out', fill: 'both' })]
  }
  return flock(root, plan, bounds, offsets, seed)
}
