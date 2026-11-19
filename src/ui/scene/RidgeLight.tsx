import { useId, useMemo } from 'react'
import { ridgePoints } from '../../data/terrain/profile'
import { ridgeLightPaths } from '../../world/ridgeLighting'
import type { RidgeTone } from '../../world/ridgeLightTone'
import styles from './ValleyScene.module.css'

interface Props {
  path: string
  points: readonly (readonly [number, number])[]
  ray: [number, number] | null
  /** The light's direction per x (a turning view's strip), when it is not one for the whole line. */
  rayAt?: (x: number) => readonly [number, number]
  noonWeight: number
  rimX: number | null
  depth: number
  tone: RidgeTone
  baseClass?: string
  shimmer?: string
}

export function RidgeLight({ path, points, ray, rayAt, noonWeight, rimX, depth, tone, baseClass, shimmer }: Props) {
  const clip = useId()
  const outline = useMemo(() => ridgePoints(path).filter(([x]) => x >= points[0]?.[0] && x <= points[points.length - 1]?.[0]),
    [path, points])
  const { crescent, rim } = useMemo(() => ridgeLightPaths(points, { ray, rayAt, noonWeight, rimX, depth, outline }),
    [points, ray, rayAt, noonWeight, rimX, depth, outline])
  const fill = crescent && tone.fill
  const rimPath = tone.rimAlpha > 0 && rim
  // Soft light (the owner's call on the phone): the lower edge of the wash and the rim are blurred, while the clip keeps
  // the skyline itself crisp. Static paint, recomputed once a minute, so the blur costs nothing per frame.
  const overlay = <>
    {fill && <filter id={`${clip}s`} x="-10%" y="-60%" width="120%" height="220%">
      <feGaussianBlur stdDeviation={depth / 4} />
    </filter>}
    {rimPath && <filter id={`${clip}r`} x="-10%" y="-100%" width="120%" height="300%">
      <feGaussianBlur stdDeviation={.9} />
    </filter>}
    {fill && <>
      <clipPath id={clip}><path d={path} /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <path className={styles.ridgeCrescent} d={crescent} fill={fill} filter={`url(#${clip}s)`} />
      </g>
    </>}
    {rimPath &&
      <path className={styles.ridgeRim} d={rim} fill="none" stroke={tone.rim}
        strokeOpacity={tone.rimAlpha} strokeWidth={2} strokeLinecap="round" filter={`url(#${clip}r)`} />}
  </>
  if (!baseClass) return overlay
  if (shimmer && (fill || rimPath)) {
    return <g filter={shimmer}><path d={path} className={baseClass} />{overlay}</g>
  }
  return <><path d={path} className={baseClass} filter={shimmer} />{overlay}</>
}
