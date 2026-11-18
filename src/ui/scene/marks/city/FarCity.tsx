import { useMemo } from 'react'
import { skyHeight } from '../../../../data/city/cityHeight'
import { farColumns, useFarColumns } from '../../../../data/city/farData'
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
}

const px = (value: number) => Number(value.toFixed(3))

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
    dots += `M${px(x - .5)} ${px(y)}a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0Z`
  }
  for (const { x, heightM } of data.towers) {
    const left = x - 1.25, right = x + 1.25
    if (!clear(left, right)) continue
    const base = Math.max(farGround(left), farGround(x), farGround(right))
    const top = base - Math.max(3, skyHeight(heightM) * .6)
    slabs += `M${px(left)} ${px(top)}h2.5V${px(base)}h-2.5Z`
  }
  return { fabric, slabs, dots }
}

export function FarCity({ place, width, ground, farGround, night, hideFar }: Props) {
  const columns = useFarColumns(place, width, !hideFar)
  const seed = hashId(place.id)
  const paths = useMemo(() => columns && farCityPaths(columns, ground, farGround, seed, night),
    [columns, ground, farGround, seed, night])
  if (!paths || (!paths.fabric && !paths.slabs)) return null
  return <g transform={`scale(${RIDGE_WIDTH / width} 1)`}>
    {paths.fabric && <path d={paths.fabric} className={styles.farCity} />}
    {paths.slabs && <path d={paths.slabs} className={styles.farCity} />}
    {paths.dots && <path d={paths.dots} className={styles.farCityDots} />}
  </g>
}
