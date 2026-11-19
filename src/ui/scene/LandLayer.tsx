import { useMemo } from 'react'
import type { Place } from '../../config/place'
import { BAND_KM, backdropLand, stageLand, type Land, type Paint } from '../../data/land/landPaint'
import type { SceneTerrain } from '../../data/terrain/terrain'
import styles from './ValleyScene.module.css'

interface Props {
  place: Place
  land: Land
  terrain: SceneTerrain
  /** How much the sun lights the land (0 at night … 1 at a clear noon). */
  day: number
  /** Haze over the middle distance and the far land (0..1). */
  nearFade: number
  farFade: number
  /** Draw only the backdrop's ground (a sector of the strip) or only the stage's (the current heading). */
  part?: 'backdrop' | 'stage'
}

/** Opacity of the land's own colour by distance band: haze takes the far part first. */
const bandAlpha = (band: number, nearFade: number, farFade: number) => {
  const km = band * BAND_KM + BAND_KM / 2
  const haze = km < 3 ? .3 * nearFade : .5 * nearFade + .3 * farFade * Math.min(1, (km - 3) / 8)
  return (.18 + .37 * Math.exp(-km / 5)) * (1 - haze)
}

/**
 * The land in its real cover and this week's colour (`data/land`): the backdrop's visible ground and the stage's
 * ground and trees, laid over the land's own tone. By day the colour shows; toward night it fades into the tone.
 */
export function LandLayer({ place, land, terrain, day, nearFade, farFade, part }: Props) {
  const back = useMemo(() => part === 'stage' ? [] : backdropLand(place, land, terrain, 375), [place, land, terrain, part])
  const stage = useMemo(() => part !== 'backdrop' && terrain.stage && terrain.camera && terrain.horizonY !== undefined
    ? stageLand(place, land, terrain.camera, terrain.horizonY) : null, [place, land, terrain, part])
  if (!back.length && !stage) return null
  // A tint over the land's own tone: full by day, a trace at night (the tone itself carries the hour).
  const strength = .15 + .85 * Math.max(0, Math.min(1, day))
  const draw = (paints: Paint[], kind: string) => paints.map(p => (
    <path key={`${kind}${p.fill}${p.band}`} d={p.d} className={p.fill === 'water' ? styles.landWater : undefined}
      fill={p.fill === 'water' ? undefined : p.fill} opacity={(bandAlpha(p.band, nearFade, farFade) * strength).toFixed(3)} />
  ))
  return (
    <svg className={styles.landColour} viewBox="0 0 375 128" preserveAspectRatio="none" aria-hidden="true">
      <defs><filter id="landSoft" x="-2%" y="-10%" width="104%" height="120%"><feGaussianBlur stdDeviation="1.1 .5" /></filter></defs>
      {/* The backdrop's colours are soft washes (data at 100 m, seen across kilometres), never a mosaic of cells. */}
      <g filter="url(#landSoft)">{draw(back, 'b')}</g>
      {stage && draw(stage.ground, 's')}
      {stage && draw(stage.trees, 't')}
    </svg>
  )
}
