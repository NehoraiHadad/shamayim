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
import { HourlyStrip } from './ui/hourly/HourlyStrip'
import { next24h } from './ui/hourly/timeline'
import { LoadingState, ErrorState } from './ui/States'
import { Ridge } from './ui/Ridge'
import { Sentence } from './ui/Sentence'
import { Sky } from './ui/Sky'
import { StatusLine } from './ui/StatusLine'
import { SunArc } from './ui/SunArc'
import { TopBar } from './ui/TopBar'
import { useNow } from './ui/useNow'
import { forcedTheme } from './ui/devParams'
import { WeekList } from './ui/WeekList'
import { Sheet } from './ui/Sheet'
import { WearCard } from './ui/WearCard'
import { wearTip } from './text/wear'

const place = SHADMOT_MEHOLA

export default function App() {
  const { forecast: raw, status, freshness, error, refresh } = useForecast(place, openMeteoIcon)
  const now = useNow(place.timezone)
  const forecast = useMemo(() => (raw ? rollForward(raw, now) : null), [raw, now])
  const today = forecast?.days.find((d) => d.date === now.slice(0, 10))
  const themeId = forcedTheme() ?? (forecast ? pickTheme(forecast, today, now) : 'night')
  const sentences = useMemo(() => (forecast ? composeSummary(forecast, now) : []), [forecast, now])
  const hourly = useMemo(() => (forecast ? next24h(forecast, now) : []), [forecast, now])
  const wear = useMemo(() => (forecast ? wearTip(forecast, now) : null), [forecast, now])
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
            <HourlyStrip slots={hourly} label="24 השעות הקרובות" />
            {today && <SunArc now={now} sunrise={today.sunrise} sunset={today.sunset} />}
          </>
        )}
      </main>
      {forecast && (
        <div className="lower">
          <Ridge />
          <Sheet>
            <WearCard tip={wear} />
            <WeekList forecast={forecast} now={now} />
          </Sheet>
          <Attribution withAir={Boolean(forecast.air)} />
        </div>
      )}
    </div>
  )
}
