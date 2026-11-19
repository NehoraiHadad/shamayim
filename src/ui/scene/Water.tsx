import type { Glint } from '../../data/water/glint'
import type { WaterSpan } from '../../data/water/waterInView'
import styles from './ValleyScene.module.css'
import { glintPath, waterPath } from './waterPaths'

interface Props {
  spans: readonly WaterSpan[]
  glints: readonly Glint[]
  layer: 'near' | 'far'
  /** The light is the moon (a silver path), not the sun. */
  moon?: boolean
}

/**
 * Large water in view (`waterInView`), flat at its true place: it takes the sky's tone (still water mirrors the sky
 * over it, the far part the sky at the horizon), paled by the haze like the land on its plane.
 */
export function Water({ spans, glints, layer, moon = false }: Props) {
  if (!spans.length) return null
  return (
    <g className={layer === 'far' ? styles.waterFar : styles.waterNear} data-water={layer}>
      {spans.map((span) => <path key={`${span.name ?? 'lake'}-${Math.round(span.from)}`} d={waterPath(span)} className={styles.water} />)}
      {glints.map((glint) => <path key={`glint-${glint.span}`} d={glintPath(glint)} className={styles.glint}
        data-light={moon ? 'moon' : undefined} opacity={Math.min(1, glint.opacity).toFixed(2)} />)}
    </g>
  )
}
