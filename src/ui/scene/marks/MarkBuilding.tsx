import { useId } from 'react'
import { seat } from '../../../data/landmarks/seat'
import { hashId } from '../../../data/landmarks/settlement'
import type { MarkLife, PlacedMark } from '../../../data/landmarks/types'
import { curated, planeOf, specOf } from './hillPlane'
import { CastShadow } from './generic/shadow'
import { ContactShadow, LightRig, type LightSide } from './LightRig'
import styles from './marks.module.css'

export interface BuildingContext {
  ground: (x: number) => number
  /** Sun position in px, or null when there is no sun-side light (night, overcast, heavy haze). */
  sunX: number | null
  night: boolean
  life: MarkLife
  motion: boolean
  /** An hour readout sits at the top; marks reaching into it are dimmed. */
  readout: boolean
  /** Far ridge: silhouette at 0.6, no lit side, no windows, aviation light only (ILLUSTRATION.md R1). */
  far?: boolean
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const FAR_SCALE = .6

/** One building-like mark seated on the slope, toned by plane, lit from the sun side (ILLUSTRATION.md §2). */
export function MarkBuilding({ mark, x, ground, sunX, night, life, motion, readout, far = false }:
  { mark: PlacedMark; x: number } & BuildingContext) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const spec = specOf(mark)
  if (!spec) return null
  const plane = far ? 'line' : planeOf(mark)
  const depth = clamp(Math.abs(mark.dy) / 1.5)
  const h = spec.h(far ? mark.hPx / FAR_SCALE : mark.hPx)
  const scale = far ? FAR_SCALE : plane === 'behind' ? 1 - .2 * depth : 1
  const seated = seat(ground, x, spec.w * scale, 0, far || curated(mark) || Boolean(mark.absorbed))
  if (!seated) return null
  const base = plane === 'face' ? ground(x) + 3 + 9 * depth
    : seated.baseY + (plane === 'behind' ? .25 * depth * h * scale : 0)
  const side: LightSide | null = far || night || plane === 'behind' || sunX == null || spec.litWidth === 0 ? null
    : sunX < x - 40 ? 'w' : sunX > x + 40 ? 'e' : 'top'
  const props = { h, night: night && !far, seed: hashId(mark.id), litShare: life.litShare,
    spin: motion && mark.kind === 'turbine' && life.turbinePeriodS != null, sway: motion && life.sway != null }
  const [beaconX, beaconY] = spec.beacon?.(h) ?? [0, -h]
  const dim = readout && base - h * scale < 22
  /** Self-lit glyphs are drawn with the sun on the left: mirror for an east sun, flat tones without one. */
  const self = spec.selfLit && !far
  const mirror = self && sunX != null && sunX > x ? -1 : 1
  const lit = !night && !far && plane !== 'behind'
  return <g transform={`translate(${x.toFixed(1)} ${(base + .5).toFixed(1)}) scale(${scale * mirror} ${scale})`}
    opacity={dim ? .35 : undefined}
    className={[plane === 'behind' ? styles.back : '', self && (!side || !lit) ? styles.flat : ''].join(' ') || undefined}>
    {/* Ground skirt: fills any dip of the ridge under a flat base, so no sky shows beneath the mark. */}
    {plane === 'line' && <rect className={styles.skirt} x={-spec.w / 2 - 1} y={-.5} width={spec.w + 2} height={5} />}
    {lit && (self ? side && <CastShadow w={spec.w} h={h} /> : <ContactShadow w={spec.w} side={side} />)}
    <spec.Draw {...props} />
    {side && !self && <LightRig id={id} spec={spec} props={props} side={side} />}
    {life.aviation && mark.tall && <circle className={styles.aviation} cx={beaconX} cy={beaconY - .4}
      r={far ? 1.4 : .85} />}
  </g>
}
