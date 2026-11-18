import { useId, useMemo } from 'react'
import { DEPTH, STEP, shadowRuns } from './shadowRuns'
import { groundAt } from './sceneLight'

type Point = readonly [number, number]

interface Props {
  /** The near profile (the valley floor and the hills either side). */
  path: string
  points: readonly Point[]
  ray: Point | null
  /** How strongly the sun lights the land (0..1); the shadow is as deep as the light it takes away. */
  day: number
}

/**
 * The ridge's shadow on the valley floor at a low sun: a soft-edged darker band that slides across the floor as the
 * sun climbs (out of the valley by mid-morning) and climbs the eastern slopes before sunset.
 */
export function FloorShadow({ path, points, ray, day }: Props) {
  const id = useId()
  const runs = useMemo(() => ray ? shadowRuns(points, ray) : [], [points, ray])
  if (!runs.length || day <= .05) return null
  // Each run as a band along the ground surface, DEPTH deep, so the shadow lies on the land rather than cutting it.
  const band = ([a, b]: [number, number]) => {
    const xs = Array.from({ length: Math.round((b - a) / STEP) + 1 }, (_, i) => a + i * STEP)
    const top = xs.map((x) => `${x} ${(groundAt(points, x) - 2).toFixed(1)}`)
    const bottom = xs.reverse().map((x) => `${x} ${(groundAt(points, x) + DEPTH).toFixed(1)}`)
    return `M${top.join('L')}L${bottom.join('L')}Z`
  }
  const d = runs.map(band).join('')
  return <>
    <clipPath id={`${id}c`}><path d={path} /></clipPath>
    <filter id={`${id}b`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.5" /></filter>
    <g clipPath={`url(#${id}c)`}>
      <path d={d} fill="#0B1030" fillOpacity={(.3 * day).toFixed(3)} filter={`url(#${id}b)`} />
    </g>
  </>
}
