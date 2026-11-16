import type { DayPoint, LocalDate } from '../domain/types'
import { dayName } from '../text/format'
import { DayRow } from './DayRow'
import styles from './WeekList.module.css'

interface Props {
  days: DayPoint[]
  today: LocalDate
  nowTemp: number
}

/** Seven days starting today; one shared temperature scale across the week. */
export function WeekList({ days, today, nowTemp }: Props) {
  const start = days.findIndex((d) => d.date === today)
  const week = days.slice(Math.max(0, start), Math.max(0, start) + 7)
  if (!week.length) return null
  const scaleMin = Math.floor(Math.min(...week.map((d) => d.tempMin), nowTemp))
  const scaleMax = Math.ceil(Math.max(...week.map((d) => d.tempMax), nowTemp))
  const tomorrow = week[1]?.date

  return (
    <section className={styles.sheet} aria-labelledby="week-title">
      <div className={styles.handle} aria-hidden="true" />
      <h2 id="week-title" className={styles.title}>7 הימים הקרובים</h2>
      <ol className={styles.list}>
        {week.map((d, i) => (
          <DayRow
            key={d.date}
            day={d}
            index={i}
            name={dayName(d.date, today, tomorrow)}
            scaleMin={scaleMin}
            scaleMax={scaleMax}
            isToday={d.date === today}
            nowTemp={d.date === today ? nowTemp : undefined}
          />
        ))}
      </ol>
    </section>
  )
}
