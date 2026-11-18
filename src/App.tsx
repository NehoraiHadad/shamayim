import { useMemo } from 'react'
import { airInput, sunElevation } from './atmo/airInput'
import { Atmosphere } from './atmo/Atmosphere'
import { mapAir } from './atmo/mapAir'
import { Life } from './atmo/life/Life'
import { mapLife } from './atmo/life/mapLife'
import { mapMarks } from './atmo/life/mapMarks'
import { useLandmarks } from './data/landmarks/useLandmarks'
import { openMeteoIcon } from './data/openMeteo/provider'
import { usePlace } from './data/usePlace'
import { useForecast } from './data/useForecast'
import { useTerrain } from './data/terrain/terrain'
import { rollForward } from './domain/now'
import { composeSummary } from './text/compose'
import { wearTip } from './text/wear'
import { pickTheme } from './theme/pickTheme'
import { sheetVars, useSheetPaper } from './theme/sheetLight'
import { skyLight, skyLightVars } from './theme/skyLight'
import { DARK_SHEET, SKY_THEMES, themeVars } from './theme/skyThemes'
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
import { useSceneTime } from './ui/scrub/useSceneTime'
import { useNow } from './ui/useNow'
import { useThemeChrome } from './ui/useThemeChrome'
import { WearCard } from './ui/WearCard'
import { WeekList } from './ui/WeekList'

export default function App() {
  const { place, recent, selectPlace } = usePlace()
  const { forecast: raw, status, freshness, error, refresh } = useForecast(place, openMeteoIcon)
  const terrain = useTerrain(place)
  const landmarks = useLandmarks(place)
  const now = useNow(place.timezone)
  const forecast = useMemo(() => (raw ? rollForward(raw, now) : null), [raw, now])
  const today = forecast?.days.find((d) => d.date === now.slice(0, 10))
  const forced = forcedTheme()
  const themeId = forced ?? (forecast ? pickTheme(forecast, today, now) : 'night')
  const sentences = useMemo(() => (forecast ? composeSummary(forecast, now) : []), [forecast, now])
  const hourly = useMemo(() => (forecast ? next24h(forecast, now) : []), [forecast, now])
  const wear = useMemo(() => (forecast ? wearTip(forecast, now) : null), [forecast, now])
  const sceneTime = useSceneTime(now)
  const selected = sceneTime.at
  const selectedSlot = hourly.find((s) => s.type === 'hour' && s.time.slice(0, 13) === selected?.slice(0, 13))
  const shown = useMemo(() => (forecast ? { ...airInput(forecast, now, place, selected), ...forcedWeather() } : null), [forecast, now, place, selected])
  const air = useMemo(() => (shown ? mapAir(shown) : null), [shown])
  const light = useMemo(() => shown ? skyLight({ altitude: shown.sunElevation, rising: shown.localHour < 12,
    cloudCover: shown.cloudCover, wet: Math.min(1, shown.precipitation / 0.8), pm10: shown.pm10 }) : SKY_THEMES[themeId], [shown, themeId])
  const palette = useMemo(() => forced ? SKY_THEMES[themeId] : { ...SKY_THEMES[themeId], ...light }, [forced, themeId, light])
  const life = useMemo(() => (shown && air ? mapLife(shown, air) : null), [shown, air])
  const markLife = useMemo(() => (shown && air ? mapMarks(shown, air) : null), [shown, air])
  const intro = useIntro(Boolean(forecast))
  const paper = useSheetPaper(useMemo(() => sunElevation(now, place), [now, place]), themeId)
  const darkSheet = forced ? DARK_SHEET.has(themeId) : paper.dark
  useThemeChrome(forced ? SKY_THEMES[themeId].top : light.top)

  const classes = ['app', darkSheet ? 'dark-sheet' : '', intro ? 'intro' : ''].join(' ')
  const statusLine = (
    <StatusLine
      status={status}
      freshness={freshness}
      fetchedAt={forecast?.fetchedAt ?? null}
      failure={error?.cause ?? null}
      onRefresh={refresh}
    />
  )

  return (
    <div className={classes} data-scrubbing={sceneTime.scrubbing || undefined} style={{ ...themeVars(themeId), ...(forced ? {} : { ...skyLightVars(light), ...sheetVars(paper) }) }}>
      <Sky altitude={shown?.sunElevation ?? -18} cloudCover={shown?.cloudCover ?? 0}>
        {air && <Atmosphere air={air} palette={palette} night={(shown?.sunElevation ?? -18) < -6}
          glide={sceneTime.scrubbing ? 120 : sceneTime.rewinding ? 900 : selected ? 320 : 520} />}
        {life && air && shown && <Life life={life} air={air} sunElevation={shown.sunElevation} intro={intro} />}
      </Sky>
      <main className="sky-area" data-air-band>
        <TopBar place={place} recent={recent} onSelectPlace={selectPlace} status={statusLine} />
        {!forecast && status === 'error' && <ErrorState failure={error} onRetry={refresh} />}
        {!forecast && status !== 'error' && <LoadingState />}
        {forecast && (
          <>
            <Hero current={forecast.current} />
            <Sentence sentences={sentences} />
            <HourlyStrip slots={hourly} label="24 השעות הקרובות" selected={selected} onSelect={sceneTime.pick}
              onScrub={sceneTime.scrub} onRelease={sceneTime.release} scrubbing={sceneTime.scrubbing} />
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
            readout={selectedSlot?.type === 'hour' ? describeHour(selectedSlot, selected ?? undefined) : null}
            air={air!}
            cloudCover={shown?.cloudCover ?? 0}
            terrain={terrain}
            mist={life && life.mist >= .15 ? life.mist : 0}
            mistColor={shown && shown.sunElevation < 0 ? '#8E97B8' : shown && shown.sunElevation < 6 ? '#E6D3C4' : '#C9D2D8'}
            place={place}
            landmarks={landmarks.marks}
            markLife={markLife!}
            onScrub={sceneTime.scrub}
            onRelease={sceneTime.release}
            onNow={sceneTime.toNow}
            first={hourly.find((slot) => slot.type === 'hour')?.time ?? now}
            last={[...hourly].reverse().find((slot) => slot.type === 'hour')?.time ?? now}
          />
          <div className="paper" data-intro="sheet">
            <Sheet>
              <WearCard tip={wear} />
              <WeekList forecast={forecast} now={now} />
            </Sheet>
            <Attribution withAir={Boolean(forecast.air)} withOsm={place.usesOsm} withLandmarks={landmarks.usesOsm} />
          </div>
        </div>
      )}
    </div>
  )
}
