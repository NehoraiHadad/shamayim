import { useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Forecast, LocalTime } from '../../domain/types'
import { isolateNumbers } from '../../ui/isolateNumbers'
import { perfHud } from '../../ui/devParams'
import { SceneScrubber } from './SceneScrubber'
import { useWidth } from './useWidth'
import styles from './Scene.module.css'
import { SCENE_H } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { DEFAULT_STYLE, type SceneStyle } from '../paint/painters'
import { STYLES } from '../paint/styles'
import { layersOn, sceneModel, type LifeClock } from '../model'
import { PerfHud } from './PerfHud'
import { sceneLabel } from './sceneLabel'
import { SceneOverlay } from './SceneOverlay'
import { SkyCanvas } from './SkyCanvas'
import { useLandClock } from './useLandClock'
import { useSkyHost } from './useSkyHost'
import { reducedMotion, useSurface } from './useSurface'
import { WearCanvas, type WearLine } from './WearCanvas'
import { useWearHost } from './useWearHost'

interface Props {
  world: WorldState
  life: LifeClock
  /** The hand the valley is painted with. */
  style?: SceneStyle
  forecast: Forecast
  now: LocalTime
  selected: LocalTime | null
  temperature: number
  readout?: string | null
  first: LocalTime
  last: LocalTime
  onScrub: (time: LocalTime) => void
  onRelease: () => void
  onNow: () => void
  /** The wear card's line (its garments and paper), drawn from this world into the card's box; null: no card. */
  wear?: WearLine | null
}

/**
 * The valley on canvas (§1e): the figure keeps its role and label (as the SVG scene's, C9), hosts the LandSurface, the HTML overlay
 * placed from the model and the scrubber. The world is built once in App (`useWorld`). From C6 the sky is drawn from the
 * same model, into the app's sky (`ui/Sky.tsx`) through a portal, with the figure's place in it measured (`useSkyHost`).
 * From C8, while the place's land is not known the land's place holds a mist and the labels wait; the land's arrival is
 * timed by `useLandClock`. The wear card's clothesline is drawn from the same world, into the card (`WearCanvas`).
 */
export function SceneCanvas({ world, life, forecast, now, selected, temperature, readout = null, first, last, onScrub, onRelease, onNow, wear = null,
  style = DEFAULT_STYLE }: Props) {
  const [sceneRef, width] = useWidth<HTMLElement>(375)
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  const host = useSkyHost(sceneRef)
  const box = useMemo(() => ({ width, skyHeight: host?.height ?? 0, landTop: host?.landTop ?? 0, landHeight: SCENE_H, dpr,
    skyWidth: host?.width ?? width, landLeft: host?.landLeft ?? 0 }), [width, dpr, host])
  const { clock, labelStyle, ready } = useLandClock(world)
  const still = typeof window !== 'undefined' && reducedMotion()
  const model = useMemo(() => sceneModel(world, box, clock, { ...life, still }, STYLES[style].light), [world, box, clock, life, still, style])
  const land = useMemo(() => layersOn(model, 'land'), [model])
  const sky = useMemo(() => layersOn(model, 'sky'), [model])
  const label = sceneLabel(world, forecast, now, selected, { temperature, hasLightning: sky.some((layer) => layer.kind === 'flash') })
  const onLand = useCallback(() => ready('land'), [ready])
  const onSky = useCallback(() => ready('sky'), [ready])
  const { ref } = useSurface('land', land, { width, height: SCENE_H, dpr, style }, onLand)
  // The wear card's clothesline is drawn from this same world (the shown hour's wind, light and weather), into the
  // card's own box through a portal, as the sky is.
  const wearHost = useWearHost(Boolean(wear))
  return (
    <>
      <figure className={styles.scene} ref={sceneRef} role="group" aria-label={label}
        data-scene data-canvas>
        <canvas ref={ref} aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
        <SceneOverlay items={model.overlay} width={width} style={labelStyle} />
        <SceneScrubber at={selected} now={now} first={first} last={last} readout={readout} onScrub={onScrub} onRelease={onRelease}
          onNow={onNow} />
      </figure>
      {readout && (
        <span className={styles.readout}>
          <span aria-hidden="true">{isolateNumbers(readout)}</span>
          <button type="button" onClick={onNow}>עכשיו</button>
        </span>
      )}
      {perfHud() && <PerfHud />}
      {host && createPortal(<SkyCanvas layers={sky} size={{ width: host.width, height: host.height, dpr, style }} onReady={onSky} />,
        host.element)}
      {wear && wearHost && createPortal(<WearCanvas world={world} garments={wear.garments} paper={wear.paper} width={wearHost.width} />,
        wearHost.element)}
    </>
  )
}
