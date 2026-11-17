import type { AirInput } from '../airTypes'

export type EventKind = 'storks' | 'cranes' | 'swifts' | 'raptor' | 'meteor'

export interface LifeState {
  mist: number
  twinkle: { amp: number; period: number } | null
  eligible: EventKind[]
  dir: 1 | -1
  autumn: boolean
  seed: number
  input: Pick<AirInput, 'date' | 'localHour'>
}

export interface EventPlan {
  kind: EventKind
  delayMs: number
  count: number
  laneY: 'high' | 'low' | 'free'
  dir: 1 | -1
  durationMs: number
}

export interface FlockOffset { x: number; y: number }
