import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Forecast, LocalTime } from '../../domain/types'
import { isolateNumbers } from '../../ui/isolateNumbers'
import { perfHud } from '../../ui/devParams'
import { SceneScrubber } from '../../ui/scene/SceneScrubber'
import { useWidth } from '../../ui/scene/useWidth'
import styles from '../../ui/scene/ValleyScene.module.css'
import { SCENE_H } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { layersOn, sceneModel } from '../model'
import { PerfHud } from './PerfHud'
import { sceneLabel } from './sceneLabel'
import { SceneOverlay } from './SceneOverlay'
import { SkyCanvas } from './SkyCanvas'
import { useSkyHost } from './useSkyHost'
import { useSurface } from './useSurface'

interface Props {
  world: WorldState
  forecast: Forecast
  now: LocalTime
  selected: LocalTime | null
  readout?: string | null
  first: LocalTime
  last: LocalTime
  onScrub: (time: LocalTime) => void
  onRelease: () => void
  onNow: () => void
}

/**
 * The valley on canvas (§1e, `?canvas=1`): the figure keeps its role and label, hosts the LandSurface, the HTML overlay
 * placed from the model and the scrubber. The world is built once in App (`useWorld`). From C6 the sky is drawn from the
 * same model, into the app's sky (`ui/Sky.tsx`) through a portal, with the figure's place in it measured (`useSkyHost`).
 */
export function SceneCanvas({ world, forecast, now, selected, readout = null, first, last, onScrub, onRelease, onNow }: Props) {
  const [sceneRef, width] = useWidth<HTMLElement>(375)
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  const host = useSkyHost(sceneRef)
  const box = useMemo(() => ({ width, skyHeight: host?.height ?? 0, landTop: host?.landTop ?? 0, landHeight: SCENE_H, dpr,
    skyWidth: host?.width ?? width, landLeft: host?.landLeft ?? 0 }), [width, dpr, host])
  const model = useMemo(() => sceneModel(world, box), [world, box])
  const land = useMemo(() => layersOn(model, 'land'), [model])
  const sky = useMemo(() => layersOn(model, 'sky'), [model])
  const { ref } = useSurface('land', land, { width, height: SCENE_H, dpr })
  const at = selected ?? now
  return (
    <>
      <figure className={styles.scene} ref={sceneRef} role="group" aria-label={sceneLabel(world, forecast, now, selected)}
        data-scene data-canvas>
        <canvas ref={ref} aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
        <SceneOverlay items={model.overlay} width={width} />
        <SceneScrubber at={at} now={now} first={first} last={last} readout={readout} onScrub={onScrub} onRelease={onRelease}
          onNow={onNow} />
      </figure>
      {readout && (
        <span className={styles.readout}>
          <span aria-hidden="true">{isolateNumbers(readout)}</span>
          <button type="button" onClick={onNow}>עכשיו</button>
        </span>
      )}
      {perfHud() && <PerfHud />}
      {host && createPortal(<SkyCanvas layers={sky} size={{ width: host.width, height: host.height, dpr }} />, host.element)}
    </>
  )
}
