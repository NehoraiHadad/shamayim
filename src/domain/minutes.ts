import type { LocalTime } from './types'

const parts = (value: LocalTime) => [Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1,
  Number(value.slice(8, 10)), Number(value.slice(11, 13)), Number(value.slice(14, 16))] as const
const stamp = (value: LocalTime) => Date.UTC(...parts(value))

/** Wall-clock minute arithmetic, deliberately independent of the device timezone. */
export function addMinutes(value: LocalTime, amount: number): LocalTime {
  return new Date(stamp(value) + Math.round(amount) * 60_000).toISOString().slice(0, 16)
}

export function minutesBetweenLocal(from: LocalTime, to: LocalTime): number {
  return Math.round((stamp(to) - stamp(from)) / 60_000)
}
