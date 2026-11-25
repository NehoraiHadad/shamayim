import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { airInput, sunElevation } from './atmo/airInput'
import { dustShare } from './world/airParts'
import { mapAir } from './world/mapAir'
import { useLandmarks } from './data/landmarks/useLandmarks'
import { coverMarks } from './data/landmarks/coverMarks'
import { useLand, useLandCover } from './data/land/useLand'
import { useCity } from './data/city/useCity'
import { useHasFootprints } from './data/village/useVillageTile'
import { useObservedCloud } from './data/overhead/useObservedCloud'
import { useRainOutlook } from './data/overhead/useRainOutlook'
import { openMeteoIcon } from './data/openMeteo/provider'
import { usePlace } from './data/usePlace'
import { useForecast } from './data/useForecast'
import { useTerrain } from './data/terrain/terrain'
import { rollForward, sameLocalHour } from './domain/now'
import { withObservedCloud } from './domain/observedCloud'
import { entryHeadline, rainIsNear } from './domain/rainVerdict'
import { composeSummary } from './text/compose'
import { sceneFacts } from './text/sceneFacts'
import { restOfDayWearTip, wearTip } from './text/wear'
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
import { OverheadEntry } from './ui/overhead/OverheadEntry'
import { OverheadPage } from './ui/overhead/OverheadPage'
import { clockIn, firstRainHour } from './ui/overhead/timing'
import { useOverheadDialog } from './ui/overhead/useOverheadDialog'
import { SceneFallback } from './scene/react/SceneFallback'
import { SceneTimeReadout } from './ui/SceneTimeReadout'
import { Sentence } from './ui/Sentence'
import { Sheet } from './ui/Sheet'
import { Sky } from './ui/Sky'
import { StyleVotePanel } from './ui/styleVote/StyleVotePanel'
import { StyleVoteToggle } from './ui/styleVote/StyleVoteToggle'
import { useStyleVote } from './ui/styleVote/useStyleVote'
import { ErrorState, LoadingState } from './ui/States'
import { SpecialLine } from './ui/SpecialLine'
import { StatusLine } from './ui/StatusLine'
import { TopBar } from './ui/TopBar'
import { useSceneTime } from './ui/scrub/useSceneTime'
import { useSceneSightings } from './ui/scrub/useSceneSightings'
import { withVisibleSun } from './world/visibleSun'
import { useNow } from './ui/useNow'
import { useSpecialEvent } from './ui/useSpecialEvent'
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
  // Living-land observations (WorldCover, near S2, far GIBS, recent weather); never blocks first paint.
  const land = useLand(place, true)
  const marks = useMemo(() => [...landmarks.marks, ...coverMarks(place, cover, landmarks.marks)], [landmarks.marks, place, cover])
  const city = useCity(place)
  const footprints = useHasFootprints(place)
  const observedCloud = useObservedCloud(place, receiptTime)
  const outlook = useRainOutlook(place)
  // The satellite's cloud around the place corrects "now" (fading over ~2.5 h); later hours stay the model's.
  // Each day also learns when the sun is really seen to rise and set over the land around (horizon panorama).
  const timeline = useMemo(() => raw ? withVisibleSun(rollForward(raw, now), terrain, place) : null, [raw, now, terrain, place])
  const hasCurrent = timeline !== null && sameLocalHour(timeline.current.time, now)
  const forecast = useMemo(() => timeline && hasCurrent ? withObservedCloud(timeline, observedCloud, now, arrivalMs) : timeline,
    [timeline, hasCurrent, observedCloud, now, arrivalMs])
  const today = forecast?.days.find((d) => d.date === now.slice(0, 10))
  const forced = forcedTheme()
  const themeId = forced ?? (forecast ? pickTheme(forecast, today, now) : 'night')
  const sentences = useMemo(() => (forecast ? composeSummary(forecast, now) : []), [forecast, now])
  const hourly = useMemo(() => (forecast ? next24h(forecast, now) : []), [forecast, now])
  const wear = useMemo(() => (forecast ? wearTip(forecast, now) : null), [forecast, now])
  const restOfDayWear = useMemo(() => (forecast ? restOfDayWearTip(forecast, now) : null), [forecast, now])
  const sceneTime = useSceneTime(now)
  const nowButton = useRef<HTMLButtonElement>(null)
  const focusNowButton = useCallback(() => nowButton.current?.focus(), [])
  const selected = sceneTime.at
  const selectedSlot = hourly.find((s) => s.type === 'hour' && s.time.slice(0, 13) === selected?.slice(0, 13))
  const sceneHasForecast = hasCurrent || Boolean(selectedSlot)
  const readout = selectedSlot?.type === 'hour' ? describeHour(selectedSlot, selected ?? undefined) : null
  const weather = useMemo(() => {
    if (!timeline || !sceneHasForecast) return null
    const forced = forcedWeather()
    const options = { arrivalMs, observedCloud }
    return airInput(timeline, now, place, selected, forced, options)
  }, [timeline, sceneHasForecast, now, place, selected, arrivalMs, observedCloud])
  const { seenClouds, cloudsSeen } = useSceneSightings(weather, observedCloud, now, arrivalMs)
  const shown = useMemo(() => weather ? { ...weather, cloudsSeen } : null, [weather, cloudsSeen])
  const air = useMemo(() => (shown ? mapAir(shown) : null), [shown])
  // The scene's world state (`src/world/`): one state, built from the data, drives the sky and the land.
  const worldInput = useMemo(() => (timeline && sceneHasForecast ? { place, forecast: timeline, now, selected, arrivalMs, observedCloud, terrain,
    landmarks: marks, seatCandidates: landmarks.seatCandidates, cropAreas: landmarks.cropAreas, city, seenClouds, forced: forcedWeather(),
    land } : null),
    [place, timeline, sceneHasForecast, now, selected, arrivalMs, observedCloud, terrain, marks, landmarks.seatCandidates, landmarks.cropAreas, city, seenClouds,
      land])
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
  const special = useSpecialEvent(place, freshness === 'stale' ? null : forecast, now, terrain)
  const overhead = useOverheadDialog()
  const styleVote = useStyleVote()
  const modelRain = forecast ? firstRainHour(forecast.hours, now) : undefined
  // The radar's verdict on the rain nearby; the model only fills in when the radar sees nothing close.
  const rain = useMemo(() => ({ outlook, forecastRainAt: modelRain?.time.slice(11, 16) ?? null,
    clockIn: (m: number) => clockIn(now, m) }), [outlook, modelRain, now])
  const rainy = Boolean(modelRain) || rainIsNear(outlook)
  const rainHeadline = rainy ? entryHeadline(outlook, rain.clockIn, rain.forecastRainAt) : null
  useThemeChrome(forced ? SKY_THEMES[themeId].top : light.top)

  const [waters, setWaters] = useState<{ placeId: string; names: string[] } | null>(null)
  const onWaters = useCallback((placeId: string, names: string[]) => setWaters({ placeId, names }), [])
  const facts = forecast ? sceneFacts(place.nameHe, forecast.elevation, waters?.placeId === place.id ? waters.names : []) : null

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
      <main>
        {/* The scene paints into this host after the CSS gradient's first paint. */}
        <Sky />
        <div className="sky-area" data-air-band>
          <TopBar place={place} recent={recent} onSelectPlace={selectPlace} status={statusLine} />
          {!forecast && status === 'error' && <ErrorState failure={error} onRetry={refresh} />}
          {!forecast && status !== 'error' && <LoadingState />}
          {forecast && (
            <>
              <Hero current={forecast.current} now={now} />
              <Sentence sentences={sentences} />
              <HourlyStrip slots={hourly} label="24 השעות הקרובות" selected={selected} onSelect={sceneTime.pick}
                onScrub={sceneTime.scrub} onRelease={sceneTime.release} scrubbing={sceneTime.scrubbing} nowButton={nowButton} />
            </>
          )}
        </div>
        {forecast && (
          <div className="lower">
            {worldInput && (
              <Suspense fallback={<SceneFallback />}>
                <CanvasScene input={worldInput} forecast={worldInput.forecast} now={now} selected={selected}
                  temperature={selectedSlot?.type === 'hour' ? selectedSlot.temp : forecast.current.temperature}
                  readout={readout}
                  first={hourly.find((slot) => slot.type === 'hour')?.time ?? now}
                  last={[...hourly].reverse().find((slot) => slot.type === 'hour')?.time ?? now}
                  onScrub={sceneTime.scrub} onRelease={sceneTime.release} onNow={sceneTime.toNow} wear={wearLine} onWaters={onWaters}
                  sceneStyle={styleVote.style} />
              </Suspense>
            )}
            <div className="paper" data-intro="sheet">
              <Sheet overlapsScene={Boolean(worldInput)}>
                {readout && <SceneTimeReadout readout={readout} onNow={sceneTime.toNow} returnFocus={focusNowButton} />}
                <div className="forecast-tools">
                  <OverheadEntry headline={rainHeadline} onOpen={overhead.show} />
                  <StyleVoteToggle state={styleVote} />
                </div>
                <WearCard tip={wear} restOfDay={restOfDayWear} />
                <SpecialLine text={special} />
                <WeekList forecast={forecast} now={now} />
              </Sheet>
              <Attribution facts={facts} withAir={Boolean(forecast.air)} withOsm={place.usesOsm} withLandmarks={landmarks.usesOsm} withFootprints={footprints} />
            </div>
          </div>
        )}
      </main>
      {styleVote.open && (
        <StyleVotePanel state={styleVote} placeName={place.nameHe} at={selected ?? now} />
      )}
      <OverheadPage open={overhead.open} place={place} rain={rain} onClose={overhead.close} />
    </div>
  )
}
