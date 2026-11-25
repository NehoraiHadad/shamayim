import { useState } from 'react'
import { addMinutes } from '../domain/minutes'
import { sameLocalHour } from '../domain/now'
import { datePart } from '../domain/time'
import type { Forecast, LocalTime } from '../domain/types'
import { dayName } from '../text/format'
import { dailyPrecipitationLabel } from '../text/precipitation'
import { DayRow } from './DayRow'
import { DayDetail } from './week/DayDetail'
import { middaySky } from './week/middaySky'
import styles from './WeekList.module.css'

interface Props {
  forecast: Forecast
  now: LocalTime
}

/** Seven days starting today; one shared temperature scale; tap a day for its hours. */
export function WeekList({ forecast, now }: Props) {
  const [openDate, setOpenDate] = useState<string | null>(null)
  const today = datePart(now)
  const days = forecast.days
  const start = days.findIndex((d) => d.date >= today)
  if (start === -1) return null
  const week = days.slice(start, start + 7)
  const nowTemp = week[0].date === today && sameLocalHour(forecast.current.time, now)
    ? forecast.current.temperature : undefined
  const scaleMin = Math.floor(Math.min(...week.map((d) => d.tempMin), nowTemp ?? Infinity))
  const scaleMax = Math.ceil(Math.max(...week.map((d) => d.tempMax), nowTemp ?? -Infinity))
  const tomorrow = datePart(addMinutes(now, 24 * 60))

  return (
    <section aria-labelledby="week-title">
      <h2 id="week-title" className={styles.title}>השבוע הקרוב</h2>
      <ol className={styles.list}>
        {week.map((d, i) => {
          const isToday = d.date === today
          const precipitation = dailyPrecipitationLabel(d, forecast.hours)
          return (
            <DayRow
              key={d.date}
              day={d}
              sky={middaySky(d, forecast)}
              precipitation={precipitation}
              index={i}
              name={dayName(d.date, today, tomorrow)}
              scaleMin={scaleMin}
              scaleMax={scaleMax}
              isToday={isToday}
              nowTemp={isToday ? nowTemp : undefined}
              open={openDate === d.date}
              onToggle={() => setOpenDate((cur) => (cur === d.date ? null : d.date))}
              detail={
                <DayDetail day={d} forecast={forecast} now={now} nextDate={days[start + i + 1]?.date}
                  precipitation={precipitation} />
              }
            />
          )
        })}
      </ol>
    </section>
  )
}
