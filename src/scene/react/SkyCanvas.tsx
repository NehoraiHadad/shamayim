import { useCallback, useEffect, useMemo } from 'react'
import type { Surface } from '../compose/surface'
import { glideAt } from '../model/anim'
import type { LayerDesc, LayerOf } from '../model/types'
import { css } from '../paint/shared/base/hand'
import { DEFAULT_STYLE } from '../paint/painters'
import { onSkyCanvas, skyBackground } from '../paint/shared/sky/skyBackground'
import { STYLES } from '../paint/styles'
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
 * the `sky` layer) is laid as the canvas's own CSS background, from the same desc (`skyBackground`, or the style's own `skyBase`): the browser
 * composites it without a per-pixel paint on the main thread, which a full-surface canvas fill pays each time the light
 * moves (C1's sky scrub frame, ~20 ms in software raster ×4). The canvas holds the rest: the stars, the sun and moon, the
 * clouds (drifting), the lightning and the shimmer. In the app it is mounted inside `ui/Sky.tsx` (a portal from the
 * canvas scene), under the birds. While the land arrives (C8) the sky settles from the eye level it stood on to the land's:
 * the canvas's layers glide in the compositor, the base by its background's position (the gap it leaves filled with the
 * base's own colour at that edge).
 */
export function SkyCanvas({ layers, size, onReady, surfaceRef }: Props) {
  const base = layers.find((layer): layer is LayerOf<'sky'> => layer.kind === 'sky') ?? null
  const rest = useMemo(() => onSkyCanvas(layers), [layers])
  const { skyBase = skyBackground } = STYLES[size.style ?? DEFAULT_STYLE]
  const background = useMemo(() => (base ? skyBase(base) : undefined), [base, skyBase])
  const glide = base?.animated?.glide
  // The edge a glide uncovers takes the base's colour there: the top's when the sky stands low, the horizon's when high.
  const gap = base && glide ? css(base.stops[glide.dy > 0 ? 0 : base.stops.length - 1][1]) : undefined
  const onLaid = useCallback((phase: number, still: boolean, canvas: HTMLCanvasElement) => {
    const dy = glideAt(base?.animated, phase, still)
    canvas.style.backgroundPosition = `0 ${dy.toFixed(2)}px`
  }, [base])
  const { ref, surface } = useSurface('sky', rest, size, onReady, onLaid)
  useEffect(() => { if (surfaceRef) surfaceRef.current = surface.current })
  return <canvas ref={ref} aria-hidden="true" data-sky-canvas
    style={{ position: 'absolute', left: 0, top: 0, width: size.width, height: size.height, display: 'block', zIndex: -1,
      backgroundImage: background, backgroundRepeat: 'no-repeat', backgroundColor: gap,
      backgroundPosition: `0 ${glideAt(base?.animated, 0).toFixed(2)}px`, pointerEvents: 'none' }} />
}
