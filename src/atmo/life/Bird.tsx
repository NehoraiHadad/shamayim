import type { CSSProperties } from 'react'
import type { EventKind } from './types'
import styles from './Life.module.css'

interface Props {
  kind: EventKind
  dir: 1 | -1
  ink: string
  style?: CSSProperties
  index?: number
}

export function Bird({ kind, dir, ink, style, index = 0 }: Props) {
  const swift = kind === 'swifts'
  const raptor = kind === 'raptor'
  const left = swift ? 'M8 5 Q5 3 2 6.5' : 'M8 5 Q5 2.6 1 4'
  const right = swift ? 'M8 5 Q11 3 14 6.5' : 'M8 5 Q11 2.6 15 4'
  const width = swift ? 7 : raptor ? 14 : kind === 'storks' ? 11 : 12
  const body = kind === 'cranes' ? 'M5.5 5H11' : kind === 'storks' ? 'M6 5H10' : null
  return (
    <svg
      className={styles.bird}
      data-bird={kind}
      data-index={index}
      viewBox="0 0 16 8"
      style={{ ...style, width, color: ink, transform: `scaleX(${dir})` }}
      aria-hidden="true"
    >
      <path data-wing="left" d={left} />
      <path data-wing="right" d={right} />
      {body && <path className={styles.body} d={body} />}
      {raptor && <><path className={styles.fingers} d="M1 4L3 3.5M1.4 5L3.4 4" /><path className={styles.fingers} d="M15 4L13 3.5M14.6 5L12.6 4" /></>}
    </svg>
  )
}
