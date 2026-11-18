import type { CSSProperties, ReactNode } from 'react'
import type { BuildingProps, BuildingSpec } from './generic/buildingSpecs'
import styles from './marks.module.css'

export type LightSide = 'w' | 'e' | 'top'

/** Panorama scale: 250° of bearing across 375 px. */
const PX_PER_DEG = 1.5
/** A side face takes its full drawn light from this angle between the sun and the body's bearing. */
const FULL_LIGHT_DEG = 30

/**
 * Which side face takes the sun, and how much of its drawn light (`k`, 0–1, the CSS `--sun-k`). A side wall square to
 * the line of sight gets the beam in proportion to sin δ, δ the sun's bearing off the body's: as the sun crosses
 * behind the body the lit face dims to the wall tone, the side swaps at δ = 0 where nothing shows, and the other face
 * brightens; no house ever mirrors in one frame.
 */
export function sunLightOf(sunX: number | null, x: number): { side: 'w' | 'e'; k: number } | null {
  if (sunX == null) return null
  const delta = (sunX - x) / PX_PER_DEG
  const k = Math.min(1, Math.abs(Math.sin(delta * Math.PI / 180)) / Math.sin(FULL_LIGHT_DEG * Math.PI / 180))
  return { side: delta <= 0 ? 'w' : 'e', k: Math.round(k * 100) / 100 }
}

/** The `--sun-k` style for a group whose lit faces, cast shadows and strips follow `sunLightOf`. */
export const sunStyle = (k: number) => ({ '--sun-k': k }) as CSSProperties

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
          <rect className={styles.shade} style={{ opacity: 'calc(.55 * var(--sun-k, 1))' }} x={side === 'w' ? half - shadeWidth : -half - 2} y={-h - 4}
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
