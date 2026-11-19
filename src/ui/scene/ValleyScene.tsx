import { screenSide, SEA_LABEL_SIDE } from '../../domain/camera'
import { useId, useMemo, type CSSProperties } from 'react'
import { skylineData } from '../../data/city/skylineData'
import { clockOf, datePart } from '../../domain/time'
import { isolateNumbers } from '../isolateNumbers'
import { nextSunEvent, twilight } from './sceneModel'
import { Moon } from './Moon'
import { cloudSeenAttrs } from './cloudSeen'
import { FarLand } from './FarLand'
import { NearLand } from './NearLand'
import { useRidgeLighting } from './useRidgeLighting'
import { SceneScrubber } from './SceneScrubber'
import { sceneSkyline } from './visibleSun'
import { Sun } from './Sun'
import { useSceneSun } from './useSceneSun'
import { useMoonlight } from './useMoonlight'
import { useWidth } from './useWidth'
import { sunAt, sunOverRidge, sunPosition } from './sunPath'
import { FarCity } from './marks/city/FarCity'
import { HillMarks } from './marks/HillMarks'
import { hillScene } from './marks/hillScene'
import type { ValleySceneProps } from './valleySceneTypes'
import styles from './ValleyScene.module.css'

/** A true-bearing horizon once the DEM is available, with a drawn cross-section while it loads. */
export function ValleyScene({ forecast, now, selected, lat, readout = null, air, cloudCover, moonCloud = cloudCover, ridgeLight, snow = null, terrain, sunTerrain, mist = 0,
  mistColor = '#C9D2D8', place, landmarks, city, markLife, first, last, onScrub, onRelease, onNow, seenClouds = null }: ValleySceneProps) {
  const shimmerId = `shimmer${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [sceneRef, sceneWidth] = useWidth<HTMLElement>(375)
  const at = selected ?? now
  const skyline = useMemo(() => sceneSkyline(terrain), [terrain])
  // Physics first: whether the sun is over the land is decided against the land in its own direction (`sunTerrain`).
  const sunSkyline = useMemo(() => sunTerrain ? sceneSkyline(sunTerrain) : undefined, [sunTerrain])
  const day = forecast.days.find((d) => d.date === datePart(at))
  const sun = day ? sunPosition(at, day.sunrise, day.sunset, place, skyline) : null
  const disc = day ? sunPosition(at, day.sunrise, day.sunset, place, skyline, 0.08) : null
  const glow = twilight(day, at)
  // The glow stands on the ridge exactly where the sun comes over it (east) or goes behind it (west) today.
  const glowSide = glow?.side
  const sunrise = day?.sunrise
  const sunset = day?.sunset
  const rim = useMemo(() => {
    if (!glowSide || !sunrise || !sunset) return null
    const edge = glowSide === 'east' ? 0 : 1
    if (!sunSkyline) return sunOverRidge(edge, sunrise, sunset, place, skyline)
    // Where the sun really crosses the land, drawn where that direction stands in the view (same height: one eye level).
    const crossing = sunOverRidge(edge, sunrise, sunset, place, sunSkyline)
    return { ...sunAt(crossing.t, sunrise, sunset, place, skyline), y: crossing.y }
  }, [glowSide, sunrise, sunset, place, skyline, sunSkyline])
  const event = nextSunEvent(forecast.days, now)
  const below = forecast.elevation < 0
  const elevation = Math.round(forecast.elevation)
  const elevationText = `${elevation < 0 ? `−${Math.abs(elevation)}` : elevation} מ׳`
  const showSea = forecast.elevation < 50 || terrain.seaInView
  const seaOn = terrain.seaSide ? screenSide(terrain.seaSide, terrain.camera) : null
  // The hand-drawn valley has no sampled heights: its ridges are scaled from the place's depth below the sea line.
  const snowPlaceM = terrain.drawn ? forecast.elevation : null
  const night = markLife.litShare > 0
  const visibilityKm = air.haze.plainVisibilityKm ?? air.haze.visibilityKm
  const raster = city?.raster
  const towers = raster?.towers ?? city?.towers
  const citySkyline = useMemo(() => skylineData(place, sceneWidth, raster, terrain, towers),
    [place, sceneWidth, raster, terrain, towers])
  const hill = useMemo(() => hillScene({ place, terrain, landmarks, city, skyline: citySkyline, showSea, width: sceneWidth,
    litShare: markLife.litShare,
    label: { text: elevationText, below } }),
  [place, terrain, landmarks, city, citySkyline, showSea, sceneWidth, markLife.litShare, elevationText, below])
  const moonlit = useMoonlight(ridgeLight, at, place, skyline, moonCloud, air.haze.farFade)
  const lighting = useRidgeLighting({ input: ridgeLight, at, day, place, lat, skyline, sunSkyline, air, cloudCover,
    glow: glow && rim ? { opacity: glow.opacity, x: rim.x } : null })
  // By night the moon takes the sun's place on the ridges: the same light, faint and silver.
  const ridgeLit = lighting ?? moonlit
  const { look, world, sunX, afterglow } = useSceneSun({ on: Boolean(ridgeLight), at, place, air, lighting,
    near: terrain.nearPoints, width: sceneWidth, sun, night, cloudCover, rimX: rim?.x ?? null })
  const label = [
    sun && !selected ? 'השמש מעל האופק.' : '',
    event ? `${event.rise ? 'זריחה' : 'שקיעה'} ב־${clockOf(event.time)}.` : '',
    below ? `היישוב ${Math.abs(elevation)} מטר מתחת לפני הים.` : `גובה היישוב ${elevation} מטר.`,
  ].filter(Boolean).join(' ')
  return (
    <>
    <figure
      className={styles.scene}
      ref={sceneRef}
      role="group"
      aria-label={label}
      data-scene
      {...afterglow}
      {...cloudSeenAttrs(selected ? null : seenClouds, terrain.camera)}
      data-haze={air.haze.farFade > 0.5 || (snow?.falling && snow.lineM <= forecast.elevation) ? 'heavy' : undefined}
      style={{ '--far-fade': air.haze.farFade.toFixed(2), '--near-fade': air.haze.nearFade.toFixed(2),
        ...world?.style } as CSSProperties}
    >
      {glow && rim && <div className={styles.glow} style={{ opacity: glow.opacity, left: `${(rim.x * 100).toFixed(2)}%`, top: `${rim.y.toFixed(1)}px` }} />}
      <Moon at={at} timeZone={place.timezone} lat={place.lat} lon={place.lon} cloudCover={moonCloud}
        farFade={air.haze.farFade} skyline={skyline} />
      <Sun point={disc} travel={day ? (t: number) => sunAt(t, day.sunrise, day.sunset, place, skyline) : null} cloudCover={cloudCover} coin={air.sunCoin}
        look={look} />
      <FarLand terrain={terrain} lighting={ridgeLit} heat={air.heat.amplitude} shimmerId={shimmerId} snow={snow}
        snowPlaceM={snowPlaceM} mist={mist} mistColor={mistColor}
        city={terrain.farElevations?.length ? (plainClip) => <FarCity plainClip={plainClip} place={place} width={sceneWidth} ground={hill.ground}
          farGround={hill.farGround} terrain={terrain} night={night} hideFar={markLife.hideFar}
          visibilityKm={visibilityKm} hasSkyline={Boolean(hill.citySkyline)} /> : undefined} />
      <HillMarks layer="far" marks={hill.marks} labels={hill.labels} settlement={null} width={sceneWidth} ground={hill.farGround} sunX={null}
        night={night} life={markLife} visibilityKm={visibilityKm} readout={Boolean(readout)} />
      <NearLand terrain={terrain} showSea={showSea} snow={snow} snowPlaceM={snowPlaceM}
        lighting={lighting} ridgeLit={ridgeLit} />
      <HillMarks marks={hill.marks} settlement={hill.settlement} cityTowers={hill.cityTowers}
        citySkyline={hill.citySkyline} visibilityKm={visibilityKm}
        neighbours={hill.neighbours} width={sceneWidth} ground={hill.ground} sunX={sunX} night={night}
        shaded={world?.shaded} reach={world?.reach}
        life={markLife} readout={Boolean(readout)} />
      <span className={styles.village} style={{ left: terrain.centerLeft, top: hill.centerY }} aria-hidden="true" />
      <span
        className={styles.depth}
        style={{ left: hill.label.x, top: hill.label.y }}
        aria-hidden="true"
      >
        <bdi>{elevationText.replace(' מ׳', '')}</bdi> מ׳
      </span>
      {showSea && (
        <>
          <span className={styles.seaLabel} style={{ top: terrain.seaY - 14,
            ...(seaOn === 'left' ? { left: '6%', right: 'auto' }
              : seaOn === 'right' ? { right: '6%' } : SEA_LABEL_SIDE === 'right' ? { right: '27%' } : { left: '27%', right: 'auto' }) }}
            aria-hidden="true">פני הים</span>
        </>
      )}
      <SceneScrubber at={at} now={now} first={first} last={last} readout={readout} onScrub={onScrub} onRelease={onRelease}
        onNow={onNow} />
    </figure>
    {/* Outside the drawing: pinned to the bottom of the screen while a time is shown, so the scene stays clear. */}
    {readout && (
      <span className={styles.readout}>
        <span aria-hidden="true">{isolateNumbers(readout)}</span>
        <button type="button" onClick={onNow}>עכשיו</button>
      </span>
    )}
    </>
  )
}
