import { useMemo } from 'react'
import { skyHeight } from '../../../../data/city/cityHeight'
import { farColumns, useFarColumns } from '../../../../data/city/farData'
import { SKYLINE_TO_KM } from '../../../../data/city/skylineRay'
import { dotPath, plainPaths, px } from './plainPaths'
import type { SceneTerrain } from '../../../../data/terrain/terrain'
import { hashId, seeded } from '../../../../data/landmarks/hash'
import { RIDGE_WIDTH } from '../../../../data/terrain/ridgeProjection'
import type { Place } from '../../../../config/place'
import styles from '../../ValleyScene.module.css'

type Ground = (x: number) => number
type Props = {
  place: Place
  width: number
  ground: Ground
  farGround: Ground
  night: boolean
  hideFar: boolean
  visibilityKm?: number
  terrain?: SceneTerrain
  plainClip?: string
  hasSkyline?: boolean
}

export function farCityPaths(data: ReturnType<typeof farColumns>, ground: Ground, farGround: Ground,
  seed: number, night: boolean) {
  let fabric = '', slabs = '', dots = ''
  const random = seeded(seed)
  const visible = (x: number) => farGround(x) <= ground(x) - 4
  const clear = (left: number, right: number) => visible(left) && visible((left + right) / 2) && visible(right)
  let light = random()
  for (const { left, right, built, heightClass } of data.columns) {
    if (built < .25 || !clear(left, right)) continue
    const a = farGround(left), b = farGround(right)
    const height = 1.5 + (heightClass - 1) * 2.5 / 14
    // The roof is a horizontal step, with its footprint following the ridge underneath.
    const top = Math.min(a, b) - height
    fabric += `M${px(left)} ${px(top)}H${px(right)}V${px(b)}L${px(left)} ${px(a)}Z`
    if (!night || right - left < 1) continue
    light += built * (right - left) / 2
    if (light < 1) continue
    light -= 1
    const x = left + .5 + random() * (right - left - 1)
    const y = top + height / 2
    dots += dotPath(x, y)
  }
  for (const { x, heightM, y } of data.towers) {
    if (y !== undefined) continue
    const left = x - 1.25, right = x + 1.25
    if (!clear(left, right)) continue
    const base = Math.max(farGround(left), farGround(x), farGround(right))
    const top = base - Math.max(3, skyHeight(heightM) * .6)
    slabs += `M${px(left)} ${px(top)}h2.5V${px(base)}h-2.5Z`
  }
  return { fabric, slabs, dots }
}

export function FarCity({ place, width, ground, farGround, night, hideFar, visibilityKm, terrain, plainClip, hasSkyline }: Props) {
  const columns = useFarColumns(place, width, !hideFar || Boolean(terrain?.seenAt), terrain?.sightAt, terrain,
    hasSkyline ? SKYLINE_TO_KM : undefined)
  const seed = hashId(place.id)
  const paths = useMemo(() => columns && !hideFar && farCityPaths(columns, ground, farGround, seed, night),
    [columns, ground, farGround, seed, night, hideFar])
  const plain = useMemo(() => {
    if (!columns) return []
    const ticks = columns.towers.flatMap(({ x, y, km }) => {
      if (y === undefined || km === undefined || x < .5 || x > width - .5) return []
      const ceiling = Math.max(farGround(x - .5), farGround(x + .5)) + .5
      const floor = Math.min(113.5, ground(x - .5) - .5, ground(x + .5) - .5)
      return y >= ceiling && y <= floor ? [{ x, y, km }] : []
    })
    return plainPaths(columns.patches ?? [], ticks, seed, night, visibilityKm)
  }, [columns, ground, farGround, width, seed, night, visibilityKm])
  const transform = `scale(${RIDGE_WIDTH / width} 1)`
  return <>
    {paths && (paths.fabric || paths.slabs) && <g transform={transform}>
      {paths.fabric && <path d={paths.fabric} className={styles.farCity} />}
      {paths.slabs && <path d={paths.slabs} className={styles.farCity} />}
      {paths.dots && <path d={paths.dots} className={styles.farCityDots} />}
    </g>}
    <PlainCityPaths bands={plain} clip={plainClip} transform={transform} night={night} />
  </>
}

export function PlainCityPaths({ bands, clip, transform, night }: {
  bands: ReturnType<typeof plainPaths>; clip?: string; transform?: string; night: boolean
}) {
  if (!bands.length) return null
  return <g clipPath={clip ? `url(#${clip})` : undefined}>
    <g transform={transform}>
      {bands.map(({ center, d, opacity }) => <path key={center} d={d} opacity={opacity}
        className={night ? styles.plainDots : styles.plainCity} />)}
    </g>
  </g>
}
