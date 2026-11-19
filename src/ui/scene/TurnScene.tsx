import { useMemo, type CSSProperties } from 'react'
import { sunPosition as sunSky } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import type { SceneTerrain } from '../../data/terrain/terrain'
import { SECTOR_HEADINGS, SECTOR_MARGIN, SECTOR_SPAN, turnView } from '../../data/world/useWorld'
import { clockOf, datePart } from '../../domain/time'
import { isolateNumbers } from '../isolateNumbers'
import { Backdrop } from './Backdrop'
import { cloudSeenAttrs } from './cloudSeen'
import { Compass } from './Compass'
import { LandLayer } from './LandLayer'
import { HillMarks } from './marks/HillMarks'
import { StageSketch } from './marks/StageSketch'
import { stageScene } from './marks/stageScene'
import { Moon } from './Moon'
import { SceneScrubber } from './SceneScrubber'
import { nextSunEvent, twilight } from './sceneModel'
import type { Skyline } from './skyline'
import { Sun } from './Sun'
import { sunAt, sunOverRidge, sunPosition } from './sunPath'
import { useRidgeLighting } from './useRidgeLighting'
import { useSceneSun } from './useSceneSun'
import { useHeading } from './useHeading'
import { useWidth } from './useWidth'
import type { ValleySceneProps } from './valleySceneTypes'
import { sceneSkyline } from './visibleSun'
import styles from './ValleyScene.module.css'

type Props = Omit<ValleySceneProps, 'terrain' | 'turn'> & {
  sectors: SceneTerrain[]
  sunTerrain: SceneTerrain
}

/** Strip slots, left to right: the west sector wrapped round, the three sectors, the north-east one wrapped round. */
const SLOTS = [2, 0, 1, 2, 0]
const SECTOR_DEG = 120

/**
 * The turning view (`docs/design/TURN-VIEW-PLAN.md`): the backdrop as a strip of three fixed sectors that a turn only
 * slides, and over it, redone every frame, what depends on the heading: the sky's bodies, the stage (the place from
 * the pole) and the compass. The sun is judged against the land in its own direction (`sunTerrain`), never the screen.
 */
export function TurnScene({ forecast, now, selected, lat, readout = null, air, cloudCover, moonCloud = cloudCover, ridgeLight,
  snow = null, sectors, sunTerrain, land, mist = 0, mistColor = '#C9D2D8', place, landmarks, city, markLife,
  first, last, onScrub, onRelease, onNow, seenClouds = null }: Props) {
  const [sceneRef, sceneWidth] = useWidth<HTMLElement>(375)
  // The heading lives here: a turn redraws only this scene's heading-bound parts, never the rest of the page.
  const { heading, moving, drag, glide } = useHeading(180)
  const at = selected ?? now
  const view = useMemo(() => turnView(heading), [heading])
  const skyline: Skyline = useMemo(() => Object.assign(() => view.horizonY,
    { peak: view.horizonY, horizon: view.horizonY, camera: view.camera }), [view])
  const sunSkyline = useMemo(() => sceneSkyline(sunTerrain), [sunTerrain])
  const day = forecast.days.find((d) => d.date === datePart(at))
  const sun = day ? sunPosition(at, day.sunrise, day.sunset, place, skyline) : null
  const disc = day ? sunPosition(at, day.sunrise, day.sunset, place, skyline, 0.08) : null
  const glow = twilight(day, at)
  const sunrise = day?.sunrise, sunset = day?.sunset
  // Where the sun really crosses the land (judged in its own direction), then where that direction stands in the view.
  const crossing = useMemo(() => glow && sunrise && sunset
    ? sunOverRidge(glow.side === 'east' ? 0 : 1, sunrise, sunset, place, sunSkyline) : null,
  [glow?.side, sunrise, sunset, place, sunSkyline]) // eslint-disable-line react-hooks/exhaustive-deps
  const rim = crossing && sunrise && sunset ? { ...sunAt(crossing.t, sunrise, sunset, place, skyline), y: crossing.y } : null
  const event = nextSunEvent(forecast.days, now)
  const below = forecast.elevation < 0
  const elevation = Math.round(forecast.elevation)
  const elevationText = `${elevation < 0 ? `−${Math.abs(elevation)}` : elevation} מ׳`
  const showSea = forecast.elevation < 50 || sunTerrain.seaInView
  const night = markLife.litShare > 0
  const stage = useMemo(() => stageScene({ place, landmarks, raster: city?.raster, camera: view.camera, horizonY: view.horizonY,
    stage: view.stage, width: sceneWidth, label: { text: elevationText } }), [place, landmarks, city, view, sceneWidth, elevationText])
  const stageTerrain = useMemo<SceneTerrain>(() => ({ ...sunTerrain, camera: view.camera, horizonY: view.horizonY, stage: view.stage }),
    [sunTerrain, view])
  const lighting = useRidgeLighting({ input: ridgeLight, at, day, place, lat, skyline, sunSkyline, air, cloudCover,
    glow: glow && rim ? { opacity: glow.opacity, x: rim.x } : null })
  const { look, world, sunX, afterglow } = useSceneSun({ on: Boolean(ridgeLight), at, place, air, lighting,
    near: [[0, view.stage.farY], [375, view.stage.farY]], width: sceneWidth, sun, night, cloudCover, rimX: rim?.x ?? null })
  // The strip: slot k's left edge is k scene widths along; the view's left edge is (heading − 60°) from slot 1's.
  const offset = (((heading % 360) + 360) % 360 + SECTOR_DEG / 2) / SECTOR_DEG
  const visible = [Math.floor(offset), Math.floor(offset) + 1]
  const label = [
    sun && !selected ? 'השמש מעל האופק.' : '',
    event ? `${event.rise ? 'זריחה' : 'שקיעה'} ב־${clockOf(event.time)}.` : '',
    below ? `היישוב ${Math.abs(elevation)} מטר מתחת לפני הים.` : `גובה היישוב ${elevation} מטר.`,
  ].filter(Boolean).join(' ')
  return (
    <>
    <figure className={styles.scene} ref={sceneRef} role="group" aria-label={label} data-scene {...afterglow}
      {...cloudSeenAttrs(selected ? null : seenClouds, view.camera)}
      data-haze={air.haze.farFade > 0.5 || (snow?.falling && snow.lineM <= forecast.elevation) ? 'heavy' : undefined}
      style={{ '--far-fade': air.haze.farFade.toFixed(2), '--near-fade': air.haze.nearFade.toFixed(2) } as CSSProperties}>
      {glow && rim && <div className={styles.glow} style={{ opacity: glow.opacity, left: `${(rim.x * 100).toFixed(2)}%`, top: `${rim.y.toFixed(1)}px` }} />}
      <Moon at={at} timeZone={place.timezone} lat={place.lat} lon={place.lon} cloudCover={moonCloud} farFade={air.haze.farFade} skyline={skyline} />
      <Sun point={disc} travel={day ? (t: number) => sunAt(t, day.sunrise, day.sunset, place, skyline) : null} cloudCover={cloudCover}
        coin={air.sunCoin} look={look} />
      <div className={styles.stripClip}>
      <div className={styles.strip} style={{ transform: `translate3d(${(-offset * 100).toFixed(3)}%, 0, 0)` }}>
        {visible.map(slot => (
          <Backdrop key={slot} slot={slot} terrain={sectors[SLOTS[slot]]} sunTerrain={sunTerrain} day={day} at={at} place={place}
            lat={lat} air={air} cloudCover={cloudCover} moonCloud={moonCloud} ridgeLight={ridgeLight} snow={snow} mist={mist}
            mistColor={mistColor} landmarks={landmarks} city={city} markLife={markLife} land={land} width={sceneWidth * SECTOR_SPAN / SECTOR_DEG}
            margin={SECTOR_MARGIN / SECTOR_DEG}
            readout={Boolean(readout)} showSea={showSea} glowOpacity={glow?.opacity ?? null} glowSide={glow?.side ?? null} />
        ))}
      </div>
      </div>
      {land && <LandLayer place={place} land={land} terrain={stageTerrain} nearFade={air.haze.nearFade} farFade={air.haze.farFade}
        day={sun ? .55 + .45 * (lighting?.day ?? 0) : 0} part="stage" />}
      {/* The heading-bound light goes on the stage only: on the figure it would restyle the whole backdrop each frame. */}
      <div className={styles.stageLayer} style={world?.style as CSSProperties | undefined}>
      {moving
        ? <StageSketch settlement={stage.settlement} width={sceneWidth} night={night} />
        : <HillMarks marks={[]} settlement={stage.settlement} width={sceneWidth} ground={() => stage.centerY} sunX={sunX} night={night}
          shaded={world?.shaded} reach={world?.reach} life={markLife} readout={Boolean(readout)} />}
      </div>
      <span className={styles.village} style={{ left: '50%', top: stage.centerY }} aria-hidden="true" />
      <span className={styles.depth} style={{ left: stage.label.x, top: stage.label.y }} aria-hidden="true">
        <bdi>{elevationText.replace(' מ׳', '')}</bdi> מ׳
      </span>
      <Compass camera={view.camera} onDrag={drag} onGlide={glide}
        sunAzimuth={sun ? sunSky(utcOf(at, place.timezone), place.lat, place.lon).azimuth : null} />
      <SceneScrubber at={at} now={now} first={first} last={last} readout={readout} onScrub={onScrub} onRelease={onRelease} onNow={onNow} />
    </figure>
    {readout && (
      <span className={styles.readout}>
        <span aria-hidden="true">{isolateNumbers(readout)}</span>
        <button type="button" onClick={onNow}>עכשיו</button>
      </span>
    )}
    </>
  )
}

export { SECTOR_HEADINGS }
