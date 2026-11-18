import { useId, type CSSProperties } from 'react'
import { SCENE_H, SCENE_W } from './sceneBox'
import { heightY, type SnowFall } from './snowLine'
import styles from './SnowCap.module.css'

interface Props {
  /** The ridge's land path; the cap is that same shape above the snow line. */
  d: string
  snow: SnowFall
  /** Sampled ridge heights (m), west to east; absent on the hand-drawn valley. */
  elevations?: readonly number[]
  placeM: number | null
  /**
   * Where the snow reaches down to, west to east (horizon panorama: each direction's slope has its own height, so the
   * line follows the land). Without it the line is level, at `heightY`.
   */
  edge?: readonly (readonly [number, number])[]
}

/** Soft lower edge of the cap (px): the snow thins out over this band instead of stopping on a ruled line. */
const FADE = 5
/** How far (px) the line wanders up and down. */
const RAG = 12

const f = (n: number) => Math.round(n * 10) / 10

/**
 * White over the ridge tops above the snow line, drawn inside the ridge's own SVG right after its path (so houses and
 * marks stay on top). Thicker with the amount; it fades in calmly when the snow starts.
 */
export function SnowCap({ d, snow, elevations, placeM, edge }: Props) {
  const id = `snow${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const level = edge ? null : heightY(snow.lineM, elevations, placeM)
  const line = edge ?? (level === null ? null : [[0, level], [SCENE_W, level]] as const)
  if (!line || line.every(([, y]) => y <= 0)) return null
  // The snow-covered sky-side of the line, a little above it so the blurred edge thins out right at the line.
  const bottom = (y: number) => f(Math.min(SCENE_H + FADE, y) - FADE / 2)
  const shape = `M0 ${-RAG}H${SCENE_W}V${bottom(line[line.length - 1][1])}`
    + [...line].reverse().map(([x, y]) => `L${f(x)} ${bottom(y)}`).join('') + 'Z'
  return (
    <g className={styles.snow} style={{ '--snow': snow.amount.toFixed(2) } as CSSProperties}>
      <defs>
        {/* Softens the lower edge, then wobbles it a few px up and down, so it reaches down gullies instead of stopping
            on a level. */}
        <filter id={`${id}f`} filterUnits="userSpaceOnUse" x="0" y={-RAG} width={SCENE_W} height={SCENE_H + 2 * RAG}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={`0 ${FADE / 2.5}`} result="soft" />
          <feTurbulence type="fractalNoise" baseFrequency=".04 .08" numOctaves="2" seed="7" />
          {/* Blue held at .5 so nothing moves sideways (that would nick the ridge's edges); red moves it up and down. */}
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 0 0 .5  0 0 0 0 1" />
          <feDisplacementMap in="soft" scale={RAG} xChannelSelector="B" yChannelSelector="R" />
        </filter>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="0" y={-RAG} width={SCENE_W} height={SCENE_H + 2 * RAG}>
          <path d={shape} fill="#fff" filter={`url(#${id}f)`} />
        </mask>
      </defs>
      <path d={d} mask={`url(#${id}m)`} />
    </g>
  )
}
