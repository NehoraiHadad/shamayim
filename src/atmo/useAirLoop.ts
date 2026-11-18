import { useEffect, useRef, useState, type RefObject } from 'react'
import type { AirState } from './airTypes'
import type { AirPalette } from './gl/palette'
import { AirRenderer } from './gl/renderer'
import { readLayout } from './layout'
import { AirMotion, withoutParticles } from './motion'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const saveData = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ?? false
const AIR_HZ = 15

/**
 * Runs the air: one rAF loop that pauses when hidden, draws a single frame on calm days and
 * under reduced motion, and steps quality down (never up) when frames run long.
 * Returns false when WebGL is unavailable so the caller can show the CSS fallback.
 */
export function useAirLoop(canvas: RefObject<HTMLCanvasElement | null>, state: AirState, pal: AirPalette, glide: number): boolean {
  const [supported, setSupported] = useState(true)
  const live = useRef({ state, pal, glide, changed: true })
  const kickRef = useRef<() => void>(() => {})
  useEffect(() => {
    live.current = { state, pal, glide, changed: true }
    kickRef.current()
  }, [state, pal, glide])

  useEffect(() => {
    if (!canvas.current) return
    let r: AirRenderer
    try {
      r = new AirRenderer(canvas.current)
    } catch {
      queueMicrotask(() => setSupported(false))
      return
    }
    const still = reducedMotion() || saveData()
    r.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    r.still = still
    // Particles begin after 260 ms and ramp in, so rain never hides the hero reveal.
    const motion = new AirMotion(withoutParticles(live.current.state))
    const start = performance.now()
    let raf = 0
    let last = start
    let lastAir = -1
    let lastAnchor = ''
    let slow = 0
    let tier = 0
    let introDone = false

    const frame = (nowMs: number) => {
      raf = 0
      const t = (nowMs - start) / 1000
      const dt = Math.min(0.05, (nowMs - last) / 1000)
      if (tier < 4 && t > 2) slow = dt > 0.02 ? slow + dt : Math.max(0, slow - dt)
      if (slow > 2) {
        tier++
        slow = 0
        if (tier === 1) r.dpr = 1
        if (tier === 2) r.octaves = 2
        if (tier === 3) r.octaves = 1
      }
      last = nowMs
      const L = readLayout()
      r.resize(L.w, L.h)
      const cur = live.current
      if (!introDone && (t > 0.26 || still)) {
        introDone = true
        motion.set(cur.state, t, still ? 1 : 520)
        cur.changed = false
      } else if (introDone && cur.changed) {
        motion.set(cur.state, t, still ? 1 : cur.glide)
        cur.changed = false
      }
      motion.step(still ? t + 5 : t, still ? 0 : dt)
      // Redraw at once when the layout changes (resize, sheet reflow), not on the next 15 Hz air tick.
      const anchor = `${L.w},${L.h},${L.bandTop},${L.bandBottom},${L.sceneTop}`
      if (t - lastAir >= 1 / AIR_HZ || still || anchor !== lastAnchor) {
        r.drawAir(t, motion, L, cur.pal)
        lastAir = t
        lastAnchor = anchor
      }
      r.drawFrame(t, motion, L, cur.pal)
      const settled = t - motion.lastSet > cur.glide / 1000 + 0.1
      const stop = still ? introDone && settled : cur.state.calm && introDone && settled
      if (!stop && !document.hidden && tier < 4) raf = requestAnimationFrame(frame)
    }
    const kick = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame) }
    kickRef.current = kick
    kick()
    document.addEventListener('visibilitychange', kick)
    window.addEventListener('resize', kick)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', kick)
      window.removeEventListener('resize', kick)
      r.dispose()
    }
  }, [canvas])

  return supported
}
