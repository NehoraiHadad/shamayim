import { useMemo } from 'react'
import { airInput } from './atmo/airInput'
import { Atmosphere } from './atmo/Atmosphere'
import { mapAir } from './atmo/mapAir'
import { Life } from './atmo/life/Life'
import { mapLife } from './atmo/life/mapLife'
import { openMeteoIcon } from './data/openMeteo/provider'
import { usePlace } from './data/usePlace'
import { useForecast } from './data/useForecast'
import { useTerrain } from './data/terrain/terrain'
import { rollForward } from './domain/now'
import { composeSummary } from './text/compose'
import { wearTip } from './text/wear'
import { pickTheme } from './theme/pickTheme'
import { DARK_SHEET, themeVars } from './theme/skyThemes'
import { Attribution } from './ui/Attribution'
import { forcedTheme, forcedWeather } from './ui/devParams'
import { Hero } from './ui/Hero'
import { HourlyStrip } from './ui/hourly/HourlyStrip'
import { describeHour } from './ui/hourly/stripLayout'
import { next24h } from './ui/hourly/timeline'
import { useIntro } from './ui/motion/useIntro'
import { ValleyScene } from './ui/scene/ValleyScene'
import { Sentence } from './ui/Sentence'
import { Sheet } from './ui/Sheet'
import { Sky } from './ui/Sky'
import { ErrorState, LoadingState } from './ui/States'
import { StatusLine } from './ui/StatusLine'
import { TopBar } from './ui/TopBar'
import { useHourSelection } from './ui/useHourSelection'
import { useNow } from './ui/useNow'
import { useThemeChrome } from './ui/useThemeChrome'
import { WearCard } from './ui/WearCard'
import { WeekList } from './ui/WeekList'

export default function App() {
  const { place, recent, selectPlace } = usePlace()
  const { forecast: raw, status, freshness, error, refresh } = useForecast(place, openMeteoIcon)
  const terrain = useTerrain(place)
  const now = useNow(place.timezone)
  const forecast = useMemo(() => (raw ? rollForward(raw, now) : null), [raw, now])
  const today = forecast?.days.find((d) => d.date === now.slice(0, 10))
  const themeId = forcedTheme() ?? (forecast ? pickTheme(forecast, today, now) : 'night')
  const sentences = useMemo(() => (forecast ? composeSummary(forecast, now) : []), [forecast, now])
  const hourly = useMemo(() => (forecast ? next24h(forecast, now) : []), [forecast, now])
  const wear = useMemo(() => (forecast ? wearTip(forecast, now) : null), [forecast, now])
  const [selected, select] = useHourSelection()
  const selectedSlot = hourly.find((s) => s.type === 'hour' && s.time === selected)
  const shown = useMemo(() => (forecast ? { ...airInput(forecast, now, place.lat, selected), ...forcedWeather() } : null), [forecast, now, place.lat, selected])
  const air = useMemo(() => (shown ? mapAir(shown) : null), [shown])
  const life = useMemo(() => (shown && air ? mapLife(shown, air) : null), [shown, air])
  const intro = useIntro(Boolean(forecast))
  useThemeChrome(themeId)

  const classes = ['app', DARK_SHEET.has(themeId) ? 'dark-sheet' : '', intro ? 'intro' : ''].join(' ')
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
    <div className={classes} style={themeVars(themeId)}>
      <Sky theme={themeId} cloudCover={forecast?.current.cloudCover ?? 0}>
        {air && <Atmosphere air={air} theme={themeId} night={themeId === 'night'} glide={selected ? 320 : 520} />}
        {life && air && shown && <Life life={life} air={air} sunElevation={shown.sunElevation} intro={intro} />}
      </Sky>
      <main className="sky-area" data-air-band>
        <TopBar place={place} recent={recent} onSelectPlace={selectPlace} status={statusLine} />
        {!forecast && status === 'error' && <ErrorState message={error} onRetry={refresh} />}
        {!forecast && status !== 'error' && <LoadingState />}
        {forecast && (
          <>
            <Hero current={forecast.current} />
            <Sentence sentences={sentences} />
            <HourlyStrip slots={hourly} label="24 השעות הקרובות" selected={selected} onSelect={select} />
          </>
        )}
      </main>
      {forecast && (
        <div className="lower">
          <ValleyScene
            forecast={forecast}
            now={now}
            selected={selected}
            lat={place.lat}
            readout={selectedSlot?.type === 'hour' ? describeHour(selectedSlot) : null}
            air={air!}
            cloudCover={shown?.cloudCover ?? 0}
            terrain={terrain}
            mist={life && life.mist >= .15 ? life.mist : 0}
            mistColor={shown && shown.sunElevation < 0 ? '#8E97B8' : shown && shown.sunElevation < 6 ? '#E6D3C4' : '#C9D2D8'}
          />
          <div className="paper" data-intro="sheet">
            <Sheet>
              <WearCard tip={wear} />
              <WeekList forecast={forecast} now={now} />
            </Sheet>
            <Attribution withAir={Boolean(forecast.air)} withOsm={place.usesOsm} />
          </div>
        </div>
      )}
    </div>
  )
}
