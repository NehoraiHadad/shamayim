import type { ReactNode } from 'react'
import type { BuildingProps, BuildingSpec } from './generic/buildingSpecs'
import styles from './marks.module.css'

export type LightSide = 'w' | 'e' | 'top'

/**
 * Sun within this many px of a body's own x (10° of the 250° panorama at 375 px): we look at it against the light, so
 * its side faces take sin 10° × cos(altitude) < 0.17 of the beam, no more than skylight. Inside this spell it is drawn
 * backlit (both faces flat) and its lit side swaps there, instead of every house mirroring in one frame as the sun
 * crosses the cluster.
 */
export const BACKLIT_PX = 15

/** Which side face takes the sun: west or east of the body, or null when backlit or no sun. */
export function sunSideOf(sunX: number | null, x: number): 'w' | 'e' | null {
  if (sunX == null) return null
  return sunX < x - BACKLIT_PX ? 'w' : sunX > x + BACKLIT_PX ? 'e' : null
}

/**
 * The one named light (the sun) on a glyph, clipped to its own silhouette: a lit strip on the sun side (R4) and a
 * core shadow on the far side, so every body shows three tones (lit / body / shade). `top` (sun overhead) lights the
 * top edge only and casts no side shadow.
 */
export function LightRig({ id, spec, props, side }: { id: string; spec: BuildingSpec; props: BuildingProps; side: LightSide }) {
  return <SunStrip id={id} w={spec.w} h={props.h} litWidth={spec.litWidth ?? .35} side={side}>
    <spec.Draw {...props} night={false} spin={false} sway={false} />
  </SunStrip>
}

/** The rig for any body: `children` is its silhouette (drawn white into the mask), `w` × `h` around the base point. */
export function SunStrip({ id, w, h, litWidth = .35, side, children }:
  { id: string; w: number; h: number; litWidth?: number; side: LightSide; children: ReactNode }) {
  const half = w / 2
  const shadeWidth = w * .25
  return <>
    <mask id={id} maskUnits="userSpaceOnUse" x={-half - 2} y={-h - 4} width={w + 4} height={h + 12}>
      <g className={styles.maskWhite}>{children}</g>
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
