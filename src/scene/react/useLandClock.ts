import { useCallback, useEffect, useMemo, useState } from 'react'
import { ARRIVAL_END } from '../model/loading'
import type { LandClock } from '../model/types'
import type { WorldState } from '../../world/types'
import { scenePhase } from './useSurface'

interface ClockState {
  /** The land's status and eye level this clock last saw (a change of status starts or ends the mist). */
  status: WorldState['terrain']['status']
  horizonY: number
  /** When the mist began to show (the scene clock's phase, s), while the land is not known or arriving. */
  loadingAt: number | null
  /** The land is in: when its reveal began (null while its layers are being painted), the eye level the sky stood on. */
  reveal: { at: number | null; fromHorizonY: number; guessed: boolean; painted: readonly string[] } | null
}

/** The longest the reveal waits for the surfaces to paint the land (ms). */
const HOLD_MS = 4000

/**
 * The land's arrival in time (C8), the one place it touches the clock: when the mist began, and once the land is in, when
 * its reveal began, both as phases of the scene's one clock (`SCENE_EPOCH`, the phase every loop lays at). The reveal
 * waits until both surfaces have painted the land's layers (`ready`), so the land fades up from a canvas that is there,
 * and is dropped once it is over (the model then shows the land as it is). A frame is a pure function of the model
 * (built with this clock) and the phase.
 *
 * Returns the clock to build the model with (null when the land was known from the start: no mist, no reveal) and the
 * callback each surface calls when it has painted.
 */
export function useLandClock(world: WorldState) {
  const status = world.terrain.status
  const horizonY = world.relief.horizonY
  const [state, setState] = useState<ClockState>(() => ({ status, horizonY, loadingAt: status === 'ready' ? null : scenePhase(),
    reveal: null }))
  let shown = state
  if (state.status !== status) {
    // Adjusted while rendering (not in an effect), so no frame shows the land before its reveal is set up.
    shown = status !== 'ready'
      ? { status, horizonY, loadingAt: scenePhase(), reveal: null }
      : { status, horizonY, loadingAt: state.loadingAt ?? scenePhase(),
        reveal: { at: null, fromHorizonY: state.horizonY, guessed: state.status === 'loading', painted: [] } }
    setState(shown)
  } else if (state.horizonY !== horizonY) {
    setState({ ...state, horizonY })
  }

  const ready = useCallback((surface: 'sky' | 'land') => {
    setState((s) => {
      if (!s.reveal || s.reveal.at !== null || s.reveal.painted.includes(surface)) return s
      const painted = [...s.reveal.painted, surface]
      return { ...s, reveal: { ...s.reveal, painted, at: painted.length >= 2 ? scenePhase() : null } }
    })
  }, [])

  const start = shown.reveal?.at ?? null
  const pending = Boolean(shown.reveal) && start === null
  useEffect(() => {
    // A surface that never reports (no sky host, a lost worker) does not hold the land back for long.
    if (!pending) return
    const timer = setTimeout(() => setState((s) => (s.reveal && s.reveal.at === null ? { ...s, reveal: { ...s.reveal, at: scenePhase() } } : s)),
      HOLD_MS)
    return () => clearTimeout(timer)
  }, [pending])
  useEffect(() => {
    if (start === null) return
    const timer = setTimeout(() => setState((s) => ({ ...s, loadingAt: null, reveal: null })),
      Math.max(0, (start + ARRIVAL_END - scenePhase()) * 1000 + 60))
    return () => clearTimeout(timer)
  }, [start])

  const { loadingAt, reveal } = shown
  const clock = useMemo((): LandClock | null => (loadingAt === null && !reveal ? null
    : { loadingAt: loadingAt ?? 0, reveal: reveal && { at: reveal.at, fromHorizonY: reveal.fromHorizonY, guessed: reveal.guessed } }),
  [loadingAt, reveal])

  return { clock, ready }
}
