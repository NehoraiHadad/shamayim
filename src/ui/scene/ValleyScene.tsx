import { useId, useMemo, type CSSProperties } from 'react'
import { skylineData } from '../../data/city/skylineData'
import { waterGlints, waterLayer } from '../../data/water/glint'
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
import { Water } from './Water'
import { waterLight } from './waterLight'
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
  // The sea-level datum is a note on the land below sea level; water in view is drawn as water (`Water`).
  const datum = below
  const water = terrain.water
  const light = useMemo(() => water?.length ? waterLight(at, place, terrain, skyline, cloudCover) : null,
    [water, at, place, terrain, skyline, cloudCover])
  const glints = useMemo(() => water && light ? waterGlints(water, light.light, light.lit, terrain.camera) : [],
    [water, light, terrain.camera])
  const waterOn = (layer: 'near' | 'far') => {
    const spans = water?.filter((span) => waterLayer(span) === layer) ?? []
    return spans.length ? <Water spans={spans} layer={layer} moon={light?.moon}
      glints={glints.filter((glint) => waterLayer(water![glint.span]) === layer)} /> : undefined
  }
  // The hand-drawn valley has no sampled heights: its ridges are scaled from the place's depth below the sea line.
  const snowPlaceM = terrain.drawn ? forecast.elevation : null
  const night = markLife.litShare > 0
  const visibilityKm = air.haze.plainVisibilityKm ?? air.haze.visibilityKm
  const raster = city?.raster
  const towers = raster?.towers ?? city?.towers
  const citySkyline = useMemo(() => skylineData(place, sceneWidth, raster, terrain, towers),
    [place, sceneWidth, raster, terrain, towers])
  const hill = useMemo(() => hillScene({ place, terrain, landmarks, city, skyline: citySkyline, datum, width: sceneWidth,
    litShare: markLife.litShare,
    label: { text: elevationText, below } }),
  [place, terrain, landmarks, city, citySkyline, datum, sceneWidth, markLife.litShare, elevationText, below])
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
        snowPlaceM={snowPlaceM} mist={mist} mistColor={mistColor} water={waterOn('far')}
        city={terrain.farElevations?.length ? (plainClip) => <FarCity plainClip={plainClip} place={place} width={sceneWidth} ground={hill.ground}
          farGround={hill.farGround} terrain={terrain} night={night} hideFar={markLife.hideFar}
          visibilityKm={visibilityKm} hasSkyline={Boolean(hill.citySkyline)} /> : undefined} />
      <HillMarks layer="far" marks={hill.marks} labels={hill.labels} settlement={null} width={sceneWidth} ground={hill.farGround} sunX={null}
        night={night} life={markLife} visibilityKm={visibilityKm} readout={Boolean(readout)} />
      <NearLand terrain={terrain} datum={datum} water={waterOn('near')} snow={snow} snowPlaceM={snowPlaceM}
        lighting={lighting} ridgeLit={ridgeLit} />
      <HillMarks marks={hill.marks} settlement={hill.settlement} cityTowers={hill.cityTowers}
        citySkyline={hill.citySkyline} outside={hill.outside} visibilityKm={visibilityKm}
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
      {hill.notes.map((note) => (
        <span key={note.text} className={note.kind === 'datum' ? styles.seaLabel : styles.waterLabel}
          style={{ left: `${(note.left / sceneWidth * 100).toFixed(2)}%`, top: note.top }} aria-hidden="true">{note.text}</span>
      ))}
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
