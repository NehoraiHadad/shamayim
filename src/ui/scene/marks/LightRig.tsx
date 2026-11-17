import type { BuildingProps, BuildingSpec } from './generic/buildingSpecs'
import styles from './marks.module.css'

export type LightSide = 'w' | 'e' | 'top'

/**
 * The one named light (the sun) on a glyph, clipped to its own silhouette: a lit strip on the sun side (R4) and a
 * core shadow on the far side, so every body shows three tones (lit / body / shade). `top` (sun overhead) lights the
 * top edge only and casts no side shadow.
 */
export function LightRig({ id, spec, props, side }: { id: string; spec: BuildingSpec; props: BuildingProps; side: LightSide }) {
  const { w } = spec
  const { h } = props
  const half = w / 2
  const litWidth = spec.litWidth ?? .35
  const shadeWidth = w * .25
  return <>
    <mask id={id} maskUnits="userSpaceOnUse" x={-half - 2} y={-h - 4} width={w + 4} height={h + 12}>
      <g className={styles.maskWhite}><spec.Draw {...props} night={false} spin={false} sway={false} /></g>
    </mask>
    <g mask={`url(#${id})`}>
      {side === 'top'
        ? <rect className={styles.lit} x={-half - 2} y={-h - 4} width={w + 4} height={5.5} />
        : <>
          <rect className={styles.lit} x={side === 'w' ? -half - 2 : half - w * litWidth} y={-h - 4}
            width={w * litWidth + 2} height={h + 4} />
          <rect className={styles.shade} opacity={.55} x={side === 'w' ? half - shadeWidth : -half - 2} y={-h - 4}
            width={shadeWidth + 2} height={h + 4} />
        </>}
    </g>
  </>
}

/** Contact shadow: a 1 px band where the base meets the ground, reaching 1.5 px further on the side away from the sun. */
export function ContactShadow({ w, side }: { w: number; side: LightSide | null }) {
  const reach = side === 'w' ? 0 : side === 'e' ? -1.5 : -.75
  return <rect className={styles.shade} x={-w / 2 + reach} y={-.5} width={w + 1.5} height={1.5} opacity={.8} />
}
