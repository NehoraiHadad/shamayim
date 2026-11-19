import { useEffect, useMemo } from 'react'
import type { Surface } from '../compose/surface'
import type { LayerDesc, LayerOf } from '../model/types'
import { skyBackground } from '../paint/sky'
import { useSurface, type SurfaceSize } from './useSurface'

interface Props {
  layers: readonly LayerDesc[]
  size: SurfaceSize
  onReady?: () => void
  /** Receives the compositor (the harness drives scrub frames through it). */
  surfaceRef?: { current: Surface | null }
}

/**
 * The SkySurface (§1e, C6): one canvas over the sky's box. The sky's base (gradient, glows, Earth's shadow, haze band:
 * the `sky` layer) is laid as the canvas's own CSS background, from the same desc (`skyBackground`): the browser
 * composites it without a per-pixel paint on the main thread, which a full-surface canvas fill pays each time the light
 * moves (C1's sky scrub frame, ~20 ms in software raster ×4). The canvas holds the rest: the stars, the sun and moon, the
 * clouds (drifting), the lightning and the shimmer. In the app it is mounted inside `ui/Sky.tsx` (a portal from the
 * canvas scene), under the birds.
 */
export function SkyCanvas({ layers, size, onReady, surfaceRef }: Props) {
  const base = layers.find((layer): layer is LayerOf<'sky'> => layer.kind === 'sky') ?? null
  const rest = useMemo(() => layers.filter((layer) => layer.kind !== 'sky'), [layers])
  const background = useMemo(() => (base ? skyBackground(base) : undefined), [base])
  const { ref, surface } = useSurface('sky', rest, size, onReady)
  useEffect(() => { if (surfaceRef) surfaceRef.current = surface.current })
  return <canvas ref={ref} aria-hidden="true" data-sky-canvas
    style={{ position: 'absolute', left: 0, top: 0, width: size.width, height: size.height, display: 'block', zIndex: -1, background,
      pointerEvents: 'none' }} />
}
