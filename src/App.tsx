import { useEffect, useMemo } from 'react'
import { SHADMOT_MEHOLA } from './config/place'
import { openMeteoIcon } from './data/openMeteo/provider'
import { useForecast } from './data/useForecast'
import { rollForward } from './domain/now'
import { composeSummary } from './text/compose'
import { pickTheme } from './theme/pickTheme'
import { SKY_THEMES, themeVars } from './theme/skyThemes'
import { Attribution } from './ui/Attribution'
import { Hero } from './ui/Hero'
import { LoadingState, ErrorState } from './ui/States'
import { Ridge } from './ui/Ridge'
import { Sentence } from './ui/Sentence'
import { Sky } from './ui/Sky'
import { StatusLine } from './ui/StatusLine'
import { SunArc } from './ui/SunArc'
import { TopBar } from './ui/TopBar'
import { useNow } from './ui/useNow'
import { WeekList } from './ui/WeekList'

const place = SHADMOT_MEHOLA

export default function App() {
  const { forecast: raw, status, freshness, error, refresh } = useForecast(place, openMeteoIcon)
  const now = useNow(place.timezone)
  const forecast = useMemo(() => (raw ? rollForward(raw, now) : null), [raw, now])
  const today = forecast?.days.find((d) => d.date === now.slice(0, 10))
  const themeId = forecast ? pickTheme(forecast, today, now) : 'night'
  const sentences = useMemo(() => (forecast ? composeSummary(forecast, now) : []), [forecast, now])
  const isNight = themeId === 'night' || themeId === 'dusk'

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SKY_THEMES[themeId].top)
  }, [themeId])

  const statusLine = (
    <StatusLine
      status={status}
      freshness={freshness}
      fetchedAt={forecast?.fetchedAt ?? null}
      hasError={Boolean(error)}
      onRefresh={refresh}
    />
  )

  return (
    <div className={`app ${isNight ? 'is-night' : ''}`} style={themeVars(themeId)}>
      <Sky theme={themeId} cloudCover={forecast?.current.cloudCover ?? 0} />
      <main className="sky-area">
        <TopBar place={place} elevation={forecast?.elevation ?? null} status={statusLine} />
        {!forecast && status === 'error' && <ErrorState message={error} onRetry={refresh} />}
        {!forecast && status !== 'error' && <LoadingState />}
        {forecast && (
          <>
            <Hero current={forecast.current} today={today} />
            <Sentence sentences={sentences} />
            {today && <SunArc now={now} sunrise={today.sunrise} sunset={today.sunset} />}
          </>
        )}
      </main>
      {forecast && (
        <div className="lower">
          <Ridge />
          <WeekList days={forecast.days} today={now.slice(0, 10)} nowTemp={forecast.current.temperature} />
          <Attribution withAir={Boolean(forecast.air)} />
        </div>
      )}
    </div>
  )
}
