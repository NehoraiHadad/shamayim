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
}

/** Soft lower edge of the cap (px): the snow thins out over this band instead of stopping on a ruled line. */
const FADE = 5
/** How far (px) the line wanders up and down. */
const RAG = 12

/**
 * White over the ridge tops above the snow line, drawn inside the ridge's own SVG right after its path (so houses and
 * marks stay on top). Thicker with the amount; it fades in calmly when the snow starts.
 */
export function SnowCap({ d, snow, elevations, placeM }: Props) {
  const id = `snow${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const y = heightY(snow.lineM, elevations, placeM)
  if (y === null || y <= 0) return null
  const edge = Math.min(SCENE_H + FADE, y)
  return (
    <g className={styles.snow} style={{ '--snow': snow.amount.toFixed(2) } as CSSProperties}>
      <defs>
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={edge - FADE} y2={edge + 2}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* Wobbles the snow line a few px up and down, so it reaches down gullies instead of stopping on a level. */}
        <filter id={`${id}f`} filterUnits="userSpaceOnUse" x="0" y="-8" width={SCENE_W} height={SCENE_H + 16}>
          <feTurbulence type="fractalNoise" baseFrequency=".04 .08" numOctaves="2" seed="7" />
          {/* Blue held at .5 so nothing moves sideways (that would nick the ridge's edges); red moves it up and down. */}
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 0 0 .5  0 0 0 0 1" />
          <feDisplacementMap in="SourceGraphic" scale={RAG} xChannelSelector="B" yChannelSelector="R" />
        </filter>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="0" y={-RAG} width={SCENE_W} height={SCENE_H + 2 * RAG}>
          <rect y={-RAG} width={SCENE_W} height={Math.min(SCENE_H, edge + 2) + 2 * RAG} fill={`url(#${id}g)`} filter={`url(#${id}f)`} />
        </mask>
      </defs>
      <path d={d} mask={`url(#${id}m)`} />
    </g>
  )
}
