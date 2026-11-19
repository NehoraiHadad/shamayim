import { memo, useId, useMemo } from 'react'
import type { AirState } from '../../atmo/airTypes'
import type { Place } from '../../config/place'
import { skylineData } from '../../data/city/skylineData'
import type { CityResult } from '../../data/city/types'
import type { Land } from '../../data/land/landPaint'
import type { Landmark, MarkLife } from '../../data/landmarks/types'
import type { SceneTerrain } from '../../data/terrain/terrain'
import type { DayPoint, LocalTime } from '../../domain/types'
import type { EchoGrid } from '../../domain/rainNowcast'
import { rainColumns } from '../../data/world/rainView'
import { FarLand } from './FarLand'
import { RainLayer } from './RainLayer'
import { LandLayer } from './LandLayer'
import { FarCity } from './marks/city/FarCity'
import { HillMarks } from './marks/HillMarks'
import { hillScene } from './marks/hillScene'
import { NearLand } from './NearLand'
import type { SnowFall } from './snowLine'
import { sunAt, sunOverRidge, sunPosition } from './sunPath'
import { useMoonlight } from './useMoonlight'
import { useRidgeLighting, type RidgeLightInput } from './useRidgeLighting'
import { useSceneSun } from './useSceneSun'
import { sceneSkyline } from './visibleSun'
import styles from './ValleyScene.module.css'

interface Props {
  /** Slot in the strip (its left edge is `slot` scene widths along). */
  slot: number
  /** Extra width drawn on each side and cut away, as a share of the shown width. */
  margin: number
  terrain: SceneTerrain
  sunTerrain: SceneTerrain
  day: DayPoint | undefined
  at: LocalTime
  place: Place
  lat: number
  air: AirState
  cloudCover: number
  moonCloud: number
  ridgeLight?: RidgeLightInput
  snow: SnowFall | null
  mist: number
  mistColor: string
  landmarks: Landmark[]
  city?: CityResult | null
  markLife: MarkLife
  land?: Land
  width: number
  readout: boolean
  showSea: boolean
  glowOpacity: number | null
  glowSide: 'east' | 'west' | null
  /** The newest radar frame around the place: rain drawn where it is. */
  rainGrid?: EchoGrid
}

/**
 * One backdrop sector of a turning view: everything beyond the stage, drawn once for a fixed heading (land, light,
 * snow, mist, far city, the land's colours, the marks on the ridges and the plain). A turn moves the strip it sits in;
 * nothing here is redrawn until the minute, the weather or the light changes.
 */
export const Backdrop = memo(function Backdrop({ slot, margin, terrain, sunTerrain, day, at, place, lat, air, cloudCover, moonCloud,
  ridgeLight, snow, mist, mistColor, landmarks, city, markLife, land, width, readout, showSea, glowOpacity, glowSide, rainGrid }: Props) {
  const shimmerId = `shimmer${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const skyline = useMemo(() => sceneSkyline(terrain), [terrain])
  const sunSkyline = useMemo(() => sceneSkyline(sunTerrain), [sunTerrain])
  const sun = day ? sunPosition(at, day.sunrise, day.sunset, place, skyline) : null
  const sunrise = day?.sunrise, sunset = day?.sunset
  const rim = useMemo(() => {
    if (!glowSide || !sunrise || !sunset) return null
    const crossing = sunOverRidge(glowSide === 'east' ? 0 : 1, sunrise, sunset, place, sunSkyline)
    return { ...sunAt(crossing.t, sunrise, sunset, place, skyline), y: crossing.y }
  }, [glowSide, sunrise, sunset, place, skyline, sunSkyline])
  const night = markLife.litShare > 0
  const visibilityKm = air.haze.plainVisibilityKm ?? air.haze.visibilityKm
  const raster = city?.raster
  const towers = raster?.towers ?? city?.towers
  const citySkyline = useMemo(() => skylineData(place, width, raster, terrain, towers), [place, width, raster, terrain, towers])
  const hill = useMemo(() => hillScene({ place, terrain, landmarks, city, skyline: citySkyline, showSea, width,
    litShare: markLife.litShare, label: { text: '', below: false }, withHome: false }),
  [place, terrain, landmarks, city, citySkyline, showSea, width, markLife.litShare])
  const moonlit = useMoonlight(ridgeLight, at, place, skyline, moonCloud, air.haze.farFade)
  const lighting = useRidgeLighting({ input: ridgeLight, at, day, place, lat, skyline, sunSkyline, perColumn: true, air, cloudCover,
    glow: glowOpacity !== null && rim ? { opacity: glowOpacity, x: rim.x } : null })
  const ridgeLit = lighting ?? moonlit
  const rain = useMemo(() => rainGrid && terrain.camera && terrain.angleY ? rainColumns(rainGrid, terrain.camera, terrain.angleY) : [],
    [rainGrid, terrain])
  const sightAt = terrain.sightAt
  const { world, sunX } = useSceneSun({ on: Boolean(ridgeLight), at, place, air, lighting,
    near: terrain.nearPoints, width, sun, night, cloudCover, rimX: rim?.x ?? null })
  return (
    <div className={styles.sector} style={{ left: `${((slot - margin) * 100).toFixed(4)}%`, width: `${((1 + 2 * margin) * 100).toFixed(4)}%`,
      clipPath: `inset(-80px ${(margin / (1 + 2 * margin) * 100).toFixed(4)}% 0)`, ...world?.style }}>
      {sightAt && rain.length > 0 && <RainLayer columns={rain} sightAt={sightAt} depth="behind" />}
      <FarLand terrain={terrain} lighting={ridgeLit} heat={air.heat.amplitude} shimmerId={shimmerId} snow={snow}
        snowPlaceM={null} mist={mist} mistColor={mistColor}
        city={terrain.farElevations?.length ? (plainClip) => <FarCity plainClip={plainClip} place={place} width={width} ground={hill.ground}
          farGround={hill.farGround} terrain={terrain} night={night} hideFar={markLife.hideFar}
          visibilityKm={visibilityKm} hasSkyline={Boolean(hill.citySkyline)} /> : undefined} />
      <HillMarks layer="far" marks={hill.marks} labels={hill.labels} settlement={null} width={width} ground={hill.farGround} sunX={null}
        night={night} life={markLife} visibilityKm={visibilityKm} readout={readout} />
      {sightAt && rain.length > 0 && <RainLayer columns={rain} sightAt={sightAt} depth="between" />}
      <NearLand terrain={terrain} showSea={showSea} snow={snow} snowPlaceM={null} lighting={lighting} ridgeLit={ridgeLit} />
      {land && <LandLayer place={place} land={land} terrain={terrain} nearFade={air.haze.nearFade} farFade={air.haze.farFade}
        day={sun ? .55 + .45 * (lighting?.day ?? 0) : 0} part="backdrop" />}
      {sightAt && rain.length > 0 && <RainLayer columns={rain} sightAt={sightAt} depth="front" />}
      <HillMarks marks={hill.marks} settlement={null} cityTowers={hill.cityTowers} citySkyline={hill.citySkyline}
        visibilityKm={visibilityKm} width={width} ground={hill.ground} sunX={sunX} night={night}
        shaded={world?.shaded} reach={world?.reach} life={markLife} readout={readout} />
    </div>
  )
})
