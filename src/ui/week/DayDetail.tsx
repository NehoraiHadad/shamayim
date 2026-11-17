import { THRESHOLDS as T } from '../../config/thresholds'
import { clockOf } from '../../domain/time'
import type { DayPoint, Forecast, LocalTime } from '../../domain/types'
import { airLabel, formatProb, uvLabel } from '../../text/format'
import { mm } from '../../text/phrases'
import { HourlyStrip } from '../hourly/HourlyStrip'
import { buildTimeline } from '../hourly/timeline'
import styles from './DayDetail.module.css'

interface Props {
  day: DayPoint
  forecast: Forecast
  now: LocalTime
  nextDate: string | undefined
}

const CONFIDENCE_TEXT = {
  high: 'המודלים מסכימים',
  medium: 'הבדלים קלים בין המודלים',
  low: 'המודלים חלוקים, תחזית פחות ודאית',
} as const

/** Expanded day: that day's hours plus the numbers behind the row. */
export function DayDetail({ day, forecast, now, nextDate }: Props) {
  const from = `${day.date}T00:00`
  const to = nextDate ? `${nextDate}T00:00` : `${day.date}T23:59`
  const slots = buildTimeline(forecast, from, to, now, 2)
  const prob = day.precipProbMax ?? 0
  const confidence = day.confidence ?? (day.lowConfidence ? 'low' : 'high')
  const tiles = [
    { label: 'גשם', value: prob >= T.showRainProb ? `${formatProb(prob)} · ${mm(day.precipSum)}` : 'לא צפוי' },
    { label: 'משבי רוח', value: `עד ${Math.round(day.windGustsMax)} קמ״ש` },
    { label: 'זריחה', value: <bdi>{clockOf(day.sunrise)}</bdi> },
    { label: 'שקיעה', value: <bdi>{clockOf(day.sunset)}</bdi> },
  ]
  const air = (forecast.air ?? []).filter((a) => a.time.startsWith(day.date))
  const uv = air.map((a) => a.uv).filter((v): v is number => v !== null)
  const pm = air.filter((a) => a.time >= day.sunrise && a.time <= day.sunset)
    .map((a) => a.pm10).filter((v): v is number => v !== null)
  if (uv.length) tiles.push({ label: 'קרינת UV', value: uvLabel(Math.max(...uv)) })
  if (pm.length) tiles.push({ label: 'איכות אוויר', value: airLabel(Math.max(...pm), T.dust.light, T.dust.heavy) })

  return (
    <div className={styles.detail}>
      {slots.length > 1 && <HourlyStrip slots={slots} label="לפי שעות" tone="sheet" />}
      <dl className={styles.tiles}>
        {tiles.map((t) => (
          <div key={t.label} className={styles.tile}>
            <dt>{t.label}</dt>
            <dd>{t.value}</dd>
          </div>
        ))}
      </dl>
      <p className={`${styles.confidence} ${styles[confidence]}`}>
        <span className={styles.meter} aria-hidden="true">
          <i /><i /><i />
        </span>
        {CONFIDENCE_TEXT[confidence]}
      </p>
    </div>
  )
}
