import { lazy, Suspense, useMemo } from 'react'
import { airInput, sunElevation } from './atmo/airInput'
import { dustShare } from './world/airParts'
import { mapAir } from './world/mapAir'
import { useLandmarks } from './data/landmarks/useLandmarks'
import { coverMarks } from './data/landmarks/coverMarks'
import { useLandCover } from './data/land/useLand'
import { useCity } from './data/city/useCity'
import { useObservedCloud } from './data/overhead/useObservedCloud'
import { useRainOutlook } from './data/overhead/useRainOutlook'
import { openMeteoIcon } from './data/openMeteo/provider'
import { usePlace } from './data/usePlace'
import { useForecast } from './data/useForecast'
import { useTerrain } from './data/terrain/terrain'
import { rollForward } from './domain/now'
import { withObservedCloud } from './domain/observedCloud'
import { sightingsNow } from './domain/cloudSightings'
import { entryHeadline, rainIsNear } from './domain/rainVerdict'
import { composeSummary } from './text/compose'
import { wearTip } from './text/wear'
import { pickTheme } from './theme/pickTheme'
import { sheetVars, useSheetPaper } from './theme/sheetLight'
import { skyLight, skyLightVars } from './theme/skyLight'
import { DARK_SHEET, SKY_THEMES, themeVars } from './theme/skyThemes'
import { Attribution } from './ui/Attribution'
import { forcedSightings, forcedTheme, forcedWeather } from './ui/devParams'
import { Hero } from './ui/Hero'
import { HourlyStrip } from './ui/hourly/HourlyStrip'
import { describeHour } from './ui/hourly/stripLayout'
import { next24h } from './ui/hourly/timeline'
import { useIntro } from './ui/motion/useIntro'
import { OverheadEntry } from './ui/overhead/OverheadEntry'
import { OverheadPage } from './ui/overhead/OverheadPage'
import { clockIn, firstRainHour } from './ui/overhead/timing'
import { useOverheadDialog } from './ui/overhead/useOverheadDialog'
import { SceneFallback } from './scene/react/SceneFallback'
import { Sentence } from './ui/Sentence'
import { Sheet } from './ui/Sheet'
import { Sky } from './ui/Sky'
import { ErrorState, LoadingState } from './ui/States'
import { StatusLine } from './ui/StatusLine'
import { TopBar } from './ui/TopBar'
import { useSceneTime } from './ui/scrub/useSceneTime'
import { withVisibleSun } from './world/visibleSun'
import { useNow } from './ui/useNow'
import { useThemeChrome } from './ui/useThemeChrome'
import { WearCard } from './ui/WearCard'
import { WeekList } from './ui/WeekList'

/**
 * The valley scene, drawn on canvas (docs/design/CANVAS-SCENE-PLAN.md): its world, model, painters and compositor load as
 * their own chunk, so the page's text and the sky's CSS gradient paint first; until it arrives the figure's place is held.
 */
const CanvasScene = lazy(() => import('./scene/react/CanvasScene'))

export default function App() {
  const { place, recent, selectPlace } = usePlace()
  const { now, arrivalMs, receiptTime } = useNow(place.timezone)
  const { forecast: raw, status, freshness, error, refresh } = useForecast(place, openMeteoIcon, receiptTime)
  const terrain = useTerrain(place)
  // The scene's own pool: beyond the place only landmarks (C5).
  const landmarks = useLandmarks(place, Boolean(terrain.sightAt), false, true)
  // Trees the satellite sees round the place, where the map names no grove: part of the place's portrait.
  const cover = useLandCover(place)
  const marks = useMemo(() => [...landmarks.marks, ...coverMarks(place, cover, landmarks.marks)], [landmarks.marks, place, cover])
  const city = useCity(place)
  const observedCloud = useObservedCloud(place, receiptTime)
  const outlook = useRainOutlook(place)
  // The satellite's cloud around the place corrects "now" (fading over ~2.5 h); later hours stay the model's.
  // Each day also learns when the sun is really seen to rise and set over the land around (horizon panorama).
  const timeline = useMemo(() => raw ? withVisibleSun(rollForward(raw, now), terrain, place) : null, [raw, now, terrain, place])
  const forecast = useMemo(() => timeline ? withObservedCloud(timeline, observedCloud, now, arrivalMs) : null,
    [timeline, observedCloud, now, arrivalMs])
  const today = forecast?.days.find((d) => d.date === now.slice(0, 10))
  const forced = forcedTheme()
  const themeId = forced ?? (forecast ? pickTheme(forecast, today, now) : 'night')
  const sentences = useMemo(() => (forecast ? composeSummary(forecast, now) : []), [forecast, now])
  const hourly = useMemo(() => (forecast ? next24h(forecast, now) : []), [forecast, now])
  const wear = useMemo(() => (forecast ? wearTip(forecast, now) : null), [forecast, now])
  const sceneTime = useSceneTime(now)
  const selected = sceneTime.at
  const selectedSlot = hourly.find((s) => s.type === 'hour' && s.time.slice(0, 13) === selected?.slice(0, 13))
  // Single clouds the satellite sees near the place: only for "now", on a mostly clear sky (see `cloudSightings.ts`).
  const weather = useMemo(() => {
    if (!timeline) return null
    const forced = forcedWeather()
    const options = { arrivalMs, observedCloud }
    return airInput(timeline, now, place, selected, forced, options)
  }, [timeline, now, place, selected, arrivalMs, observedCloud])
  const seenClouds = useMemo(() => {
    const pinned = forcedSightings()
    if (pinned) return pinned.map((s) => ({ ...s, strength: 1 }))
    return selected || !weather ? [] : sightingsNow(observedCloud, now, weather.cloudCover, arrivalMs)
  }, [selected, weather, observedCloud, now, arrivalMs])
  const shown = useMemo(() => weather ? { ...weather, cloudsSeen: selected ? 0 : seenClouds.length } : null,
    [weather, selected, seenClouds])
  const air = useMemo(() => (shown ? mapAir(shown) : null), [shown])
  // The scene's world state (`src/world/`): one state, built from the data, drives the sky and the land.
  const worldInput = useMemo(() => (timeline ? { place, forecast: timeline, now, selected, arrivalMs, observedCloud, terrain,
    landmarks: marks, seatCandidates: landmarks.seatCandidates, city, seenClouds, forced: forcedWeather() } : null),
    [place, timeline, now, selected, arrivalMs, observedCloud, terrain, marks, landmarks.seatCandidates, city, seenClouds])
  const light = useMemo(() => shown ? skyLight({ altitude: shown.sunElevation, rising: shown.localHour < 12,
    cloudCover: shown.cloudCover, wet: Math.min(1, shown.rainMmH / 0.8), pm10: shown.opticalPm10,
    air: air ? { visibilityKm: air.haze.visibilityKm, dustWeight: dustShare(shown) } : undefined }) : SKY_THEMES[themeId],
  [shown, themeId, air])
  const intro = useIntro(Boolean(forecast))
  const paper = useSheetPaper(useMemo(() => sunElevation(now, place), [now, place]), themeId)
  const darkSheet = forced ? DARK_SHEET.has(themeId) : paper.dark
  // The wear card's clothesline is drawn by the scene's chunk from the scene's own world, on the sheet's paper.
  const sheet = forced ? SKY_THEMES[themeId] : paper
  const wearLine = useMemo(() => (wear ? { garments: wear.garments, paper: { sheet: sheet.sheet, ink: sheet.sheetInk, muted: sheet.sheetMuted,
    accent: sheet.sheetAccent } } : null), [wear, sheet.sheet, sheet.sheetInk, sheet.sheetMuted, sheet.sheetAccent])
  const overhead = useOverheadDialog()
  const modelRain = forecast ? firstRainHour(forecast.hours, now) : undefined
  // The radar's verdict on the rain nearby; the model only fills in when the radar sees nothing close.
  const rain = useMemo(() => ({ outlook, forecastRainAt: modelRain?.time.slice(11, 16) ?? null,
    clockIn: (m: number) => clockIn(now, m) }), [outlook, modelRain, now])
  const rainHeadline = entryHeadline(outlook, rain.clockIn, rain.forecastRainAt)
  const rainy = Boolean(modelRain) || rainIsNear(outlook)
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
      {/* The scene draws the sky itself (clouds, stars, the bodies) into the sky's host; the CSS gradient is its first paint. */}
      {/* The birds, the aircraft and the meteors are the sky canvas's own (C10). */}
      <Sky />
      <main>
        <div className="sky-area" data-air-band>
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
        </div>
        {forecast && (
          <div className="lower">
            {worldInput && (
              <Suspense fallback={<SceneFallback />}>
                <CanvasScene input={worldInput} forecast={worldInput.forecast} now={now} selected={selected}
                  temperature={selectedSlot?.type === 'hour' ? selectedSlot.temp : forecast.current.temperature}
                  readout={selectedSlot?.type === 'hour' ? describeHour(selectedSlot, selected ?? undefined) : null}
                  first={hourly.find((slot) => slot.type === 'hour')?.time ?? now}
                  last={[...hourly].reverse().find((slot) => slot.type === 'hour')?.time ?? now}
                  onScrub={sceneTime.scrub} onRelease={sceneTime.release} onNow={sceneTime.toNow} wear={wearLine} />
              </Suspense>
            )}
            <div className="paper" data-intro="sheet">
              <Sheet>
                <OverheadEntry rainy={rainy} headline={rainHeadline} position="top" onOpen={overhead.show} />
                <WearCard tip={wear} />
                <WeekList forecast={forecast} now={now} />
                <OverheadEntry rainy={rainy} headline={rainHeadline} position="bottom" onOpen={overhead.show} />
              </Sheet>
              <Attribution withAir={Boolean(forecast.air)} withOsm={place.usesOsm} withLandmarks={landmarks.usesOsm} />
            </div>
          </div>
        )}
      </main>
      <OverheadPage open={overhead.open} place={place} rain={rain} onClose={overhead.close} />
    </div>
  )
}
