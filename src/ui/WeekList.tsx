import { useState } from 'react'
import type { Forecast, LocalTime } from '../domain/types'
import { dayName } from '../text/format'
import { DayRow } from './DayRow'
import { DayDetail } from './week/DayDetail'
import styles from './WeekList.module.css'

interface Props {
  forecast: Forecast
  now: LocalTime
}

/** Seven days starting today; one shared temperature scale; tap a day for its hours. */
export function WeekList({ forecast, now }: Props) {
  const [openDate, setOpenDate] = useState<string | null>(null)
  const today = now.slice(0, 10)
  const nowTemp = forecast.current.temperature
  const days = forecast.days
  const start = days.findIndex((d) => d.date === today)
  const week = days.slice(Math.max(0, start), Math.max(0, start) + 7)
  if (!week.length) return null
  const scaleMin = Math.floor(Math.min(...week.map((d) => d.tempMin), nowTemp))
  const scaleMax = Math.ceil(Math.max(...week.map((d) => d.tempMax), nowTemp))
  const tomorrow = week[1]?.date

  return (
    <section className={styles.week} aria-labelledby="week-title">
      <h2 id="week-title" className={styles.title}>7 הימים הקרובים</h2>
      <ol className={styles.list}>
        {week.map((d, i) => {
          const isToday = d.date === today
          return (
            <DayRow
              key={d.date}
              day={d}
              index={i}
              name={dayName(d.date, today, tomorrow)}
              scaleMin={scaleMin}
              scaleMax={scaleMax}
              isToday={isToday}
              nowTemp={isToday ? nowTemp : undefined}
              open={openDate === d.date}
              onToggle={() => setOpenDate((cur) => (cur === d.date ? null : d.date))}
              detail={
                <DayDetail day={d} forecast={forecast} now={now} nextDate={days[days.indexOf(d) + 1]?.date} />
              }
            />
          )
        })}
      </ol>
    </section>
  )
}
