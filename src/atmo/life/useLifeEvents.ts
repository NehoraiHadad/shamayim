import { useCallback, useEffect, useRef, useState } from 'react'
import { planEvent } from './planEvent'
import type { EventPlan, LifeState } from './types'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const saveData = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ?? false

export function useLifeEvents(life: LifeState, enabled: boolean) {
  const [event, setEvent] = useState<EventPlan | null>(null)
  const [reduceMotion, setReduceMotion] = useState(reduced)
  const dataSaver = saveData()
  const live = useRef(life)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const index = useRef(0)
  const active = useRef<EventPlan | null>(null)
  const eligibility = life.eligible.join(',')

  useEffect(() => { live.current = life }, [life])
  useEffect(() => { active.current = event }, [event])
  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const change = () => {
      const value = query?.matches ?? false
      setReduceMotion(value)
      if (value) { clearTimer(); active.current = null; setEvent(null) }
    }
    query?.addEventListener('change', change)
    return () => query?.removeEventListener('change', change)
  }, [clearTimer])

  const allowed = useCallback(() => enabled && !reduceMotion && !dataSaver && !document.hidden, [enabled, reduceMotion, dataSaver])

  const schedule = useCallback((first: boolean) => {
    clearTimer()
    if (!allowed() || active.current || !live.current.eligible.length) return
    const n = first ? 0 : index.current
    const next = planEvent(live.current, live.current.seed, n)
    if (!next) return
    timer.current = setTimeout(() => {
      timer.current = null
      const fresh = planEvent(live.current, live.current.seed, n)
      if (fresh && allowed()) setEvent(fresh)
    }, next.delayMs)
  }, [allowed, clearTimer])

  const complete = useCallback(() => {
    setEvent(null)
    active.current = null
    index.current += 1
    queueMicrotask(() => schedule(false))
  }, [schedule])

  useEffect(() => {
    if (reduceMotion || dataSaver) {
      clearTimer()
      active.current = null
      return
    }
    if (!event) schedule(index.current === 0)
  }, [event, life.seed, eligibility, reduceMotion, dataSaver, clearTimer, schedule])

  useEffect(() => {
    const visibility = () => {
      clearTimer()
      setEvent(null)
      active.current = null
      if (!document.hidden) {
        index.current = 0
        schedule(true)
      }
    }
    document.addEventListener('visibilitychange', visibility)
    return () => { document.removeEventListener('visibilitychange', visibility); clearTimer() }
  }, [clearTimer, schedule])

  return { event, complete, motionAllowed: !reduceMotion && !dataSaver }
}
