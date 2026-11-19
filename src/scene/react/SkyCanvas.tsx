import { useEffect } from 'react'
import type { Surface } from '../compose/surface'
import type { LayerDesc } from '../model/types'
import { useSurface, type SurfaceSize } from './useSurface'

interface Props {
  layers: readonly LayerDesc[]
  size: SurfaceSize
  onReady?: () => void
  /** Receives the compositor (the harness drives scrub frames through it). */
  surfaceRef?: { current: Surface | null }
}

/**
 * The SkySurface (§1e): one canvas over the sky's box. Stage C6 mounts it in `ui/Sky.tsx` under `?canvas=1`; until
 * then the scene harness shows it.
 */
export function SkyCanvas({ layers, size, onReady, surfaceRef }: Props) {
  const { ref, surface } = useSurface('sky', layers, size, onReady)
  useEffect(() => { if (surfaceRef) surfaceRef.current = surface.current })
  return <canvas ref={ref} aria-hidden="true"
    style={{ position: 'absolute', inset: 0, width: size.width, height: size.height, display: 'block' }} />
}
