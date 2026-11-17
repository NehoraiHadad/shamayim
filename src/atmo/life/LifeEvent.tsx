import { useEffect, useMemo, useRef } from 'react'
import { readLayout } from '../layout'
import { animateEvent } from './animateEvent'
import { Bird } from './Bird'
import { flockOffsets, rng } from './planEvent'
import type { EventPlan } from './types'
import styles from './Life.module.css'

interface Props {
  plan: EventPlan
  seed: number
  autumn: boolean
  ink: string
  valid: boolean
  onComplete: () => void
}

function lane(plan: EventPlan, seed: number) {
  const layout = readLayout(); const random = rng(seed + 211)
  if (plan.laneY === 'free') {
    const above = layout.bandTop
    const below = layout.sceneTop - layout.bandBottom
    if (Math.max(above, below) < 40) return { width: layout.w, y: layout.bandTop + (layout.bandBottom - layout.bandTop) / 2, alpha: .35 }
    return { width: layout.w, y: above >= below ? random() * Math.max(1, above - 40) : layout.bandBottom + random() * Math.max(1, below - 40), alpha: 1 }
  }
  const raw = plan.laneY === 'high' ? layout.sceneTop - 56 + random() * 32 : layout.sceneTop - 16 + random() * 36
  const y = Math.max(raw, layout.bandBottom + 8)
  return { width: layout.w, y, alpha: layout.sceneTop + 20 - y < 30 ? .4 : 1 }
}

export function LifeEvent({ plan, seed, autumn, ink, valid, onComplete }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const done = useRef(false)
  const bounds = useMemo(() => lane(plan, seed), [plan, seed])
  const offsets = useMemo(() => flockOffsets(plan.kind, plan.count, seed + 17), [plan, seed])
  useEffect(() => {
    if (!root.current) return
    done.current = false
    const animations = animateEvent(root.current, plan, bounds, offsets, seed)
    const finite = animations.filter((a) => a.effect?.getTiming().iterations !== Infinity)
    Promise.all(finite.map((a) => a.finished)).then(() => {
      if (!done.current) { done.current = true; onComplete() }
    }).catch(() => {})
    return () => animations.forEach((a) => a.cancel())
  }, [plan, bounds, offsets, seed, onComplete])
  useEffect(() => {
    if (valid || !root.current || done.current) return
    const fade = root.current.animate([{ opacity: bounds.alpha }, { opacity: 0 }], { duration: 300, fill: 'forwards' })
    fade.finished.then(() => { if (!done.current) { done.current = true; onComplete() } }).catch(() => {})
    return () => fade.cancel()
  }, [valid, bounds.alpha, onComplete])

  const flock = plan.kind === 'cranes' || plan.kind === 'storks'
  return (
    <div ref={root} data-life-event data-autumn={autumn} className={styles.event} style={{ top: bounds.y, opacity: bounds.alpha }}>
      {flock && offsets.map((_, index) => <span key={index} data-bird-wrap className={styles.birdWrap}><Bird kind={plan.kind} dir={plan.dir} ink={ink} index={index} /></span>)}
      {plan.kind === 'swifts' && Array.from({ length: plan.count }, (_, index) => <span key={index} data-swift className={styles.swift}><Bird kind="swifts" dir={index < Math.ceil(plan.count * .6) ? plan.dir : -plan.dir as 1 | -1} ink={ink} index={index} /></span>)}
      {plan.kind === 'raptor' && <span className={styles.birdWrap}><Bird kind="raptor" dir={plan.dir} ink={ink} /></span>}
      {plan.kind === 'meteor' && <span className={styles.meteor} style={{ background: plan.dir > 0 ? 'linear-gradient(90deg, transparent, rgba(255,255,255,.7))' : undefined }} />}
    </div>
  )
}
