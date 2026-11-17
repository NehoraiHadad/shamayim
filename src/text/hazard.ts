import { THRESHOLDS as T } from '../config/thresholds'
import { hourOf } from '../domain/time'
import type { Forecast, LocalTime } from '../domain/types'
import { windowFacts, type WindowFacts } from './facts'
import { afterMinutes, nowcastOf } from './nowcast'
import { dayPartOf, FROM, mm, nowcastPhrase } from './phrases'

const amountOf = (w: WindowFacts) => w.rainMm >= 1 ? `, כ־${mm(w.rainMm)}` : ''
const floodOf = (w: WindowFacts) => w.thunder || w.rainMm >= T.rain.floodMm ? '. חשש לשיטפונות בנחלים' : ''
const imminent = (w: WindowFacts, now: LocalTime) => !w.rainStart || w.rainStart <= afterMinutes(now, 60)

export function rainContext(f: Forecast, now: LocalTime) {
  const change = nowcastOf(f.nowcast, now)
  let lead = change ? nowcastPhrase(change) : null
  function afterStop(w: WindowFacts): WindowFacts {
    if (change?.kind !== 'stop') return w
    const from = afterMinutes(now, change.minutes + 60)
    const later = { ...f, hours: w.hours.filter((h) => h.time >= from) }
    return { ...windowFacts(later, from, afterMinutes(w.hours.at(-1)?.time ?? from, 60)), pm10Max: w.pm10Max }
  }
  function hazard(w: WindowFacts, when: string): string | null {
    if (w.pm10Max !== null && w.pm10Max >= T.dust.heavy) return `אובך כבד ${when}, עדיף למעט בפעילות בחוץ.`
    w = afterStop(w)
    if (w.rainProb < T.rain.possible) return null
    const amount = amountOf(w), flood = floodOf(w)
    if (change?.kind === 'start' && imminent(w, now)) {
      lead = `${nowcastPhrase(change).slice(0, -1)}${amount}${flood}.`
      return null
    }
    const start = imminent(w, now) ? 'בשעות הקרובות' : FROM[dayPartOf(hourOf(w.rainStart!))]
    const again = change?.kind === 'stop' ? ' שוב' : ''
    if (w.rainProb >= T.rain.heavy && w.rainMm >= T.rain.heavyMm) return `גשם משמעותי${again} ${start}${amount}${flood}.`
    if (w.rainProb >= T.rain.likely) return `צפוי גשם${again} ${start}${amount}${flood}.`
    return `ייתכן גשם מקומי${again} ${start}${flood}.`
  }
  return { hazard, afterStop, change, get lead() { return lead } }
}

/** Preserve existing sentence groups while keeping the complete summary within three sentences. */
export function limitSentences(groups: string[]): string[] {
  let left = 3
  return groups.flatMap((group) => {
    const parts = group.split(/(?<=\.)\s+/).slice(0, left)
    left -= parts.length
    return parts.length ? [parts.join(' ')] : []
  })
}
