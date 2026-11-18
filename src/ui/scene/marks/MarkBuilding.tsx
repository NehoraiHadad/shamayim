import { useId } from 'react'
import { hashId } from '../../../data/landmarks/hash'
import type { MarkLife, PlacedMark } from '../../../data/landmarks/types'
import { CastShadow } from './generic/shadow'
import { ContactShadow, LightRig, type LightSide } from './LightRig'
import { markGeometry } from './markBox'
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
  /** Lit scene: whether ground at this px x stands in a ridge's shadow, and cast-shadow length per unit height. */
  shaded?: (x: number) => boolean
  reach?: number
  /** Far ridge: silhouette at 0.6, no lit side, no windows, aviation light only (ILLUSTRATION.md R1). */
  far?: boolean
}

/** One building-like mark seated on the slope, toned by plane, lit from the sun side (ILLUSTRATION.md §2). */
export function MarkBuilding({ mark, x, ground, sunX, night, life, motion, readout, far = false, shaded, reach }:
  { mark: PlacedMark; x: number } & BuildingContext) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const geometry = markGeometry(mark, x, ground, far)
  if (!geometry) return null
  const { spec, plane, h, scale, base } = geometry
  const side: LightSide | null = far || night || plane === 'behind' || sunX == null || spec.litWidth === 0
    || shaded?.(x) ? null
    : sunX < x - 40 ? 'w' : sunX > x + 40 ? 'e' : 'top'
  const props = { h, night: night && !far, seed: hashId(mark.id), litShare: life.litShare,
    spin: motion && mark.kind === 'turbine' && life.turbinePeriodS != null, sway: motion && life.sway != null }
  const [beaconX, beaconY] = spec.beacon?.(h) ?? [0, -h]
  const dim = readout && base - h * scale < 22
  /**
   * Self-lit glyphs draw their lit faces on the left. A building never turns round with the sun: curated landmarks keep
   * the form they are drawn in, a generic one (a village mosque's minaret) faces one way by its seed. When the sun is
   * on the drawn lit side the glyph shows its own faces; otherwise it goes flat and takes the rig's sun-side strip.
   */
  const self = spec.selfLit && !far
  const form = self && mark.kind !== 'custom' && props.seed % 2 ? -1 : 1
  const asDrawn = self && side !== null && (side === 'top' || (side === 'w') === (form === 1))
  const localSide: LightSide | null = side && side !== 'top' && form < 0 ? (side === 'w' ? 'e' : 'w') : side
  const lit = !night && !far && plane !== 'behind'
  return <g transform={`translate(${x.toFixed(1)} ${(mark.layer === 'plain' ? base : base + .5).toFixed(1)}) scale(${scale * form} ${scale})`}
    opacity={dim ? .35 : undefined}
    className={[mark.layer === 'plain' ? styles.plainMark : '', plane === 'behind' ? styles.back : '', self && (!asDrawn || !lit) ? styles.flat : ''].join(' ') || undefined}>
    {/* Ground skirt: fills any dip of the ridge under a flat base, so no sky shows beneath the mark. */}
    {plane === 'line' && mark.layer !== 'plain' && <rect className={styles.skirt} x={-spec.w / 2 - 1} y={-.5} width={spec.w + 2}
      height={5 + (mark.lift ?? 0) / scale} />}
    {lit && (asDrawn ? <CastShadow w={spec.w} h={h} reach={reach} /> : <ContactShadow w={spec.w} side={localSide} />)}
    <spec.Draw {...props} />
    {localSide && !asDrawn && <LightRig id={id} spec={spec} props={props} side={localSide} />}
    {life.aviation && mark.tall && <circle className={styles.aviation} cx={beaconX} cy={beaconY - .4}
      r={far ? 1.4 : .85} />}
  </g>
}
