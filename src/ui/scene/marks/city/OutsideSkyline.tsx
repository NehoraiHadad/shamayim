import type { CSSProperties } from 'react'
import { seeded } from '../../../../data/landmarks/hash'
import type { OutsideBox, OutsideSkyline as Skyline, OutsideTower } from '../../../../data/city/outsideView'
import { Highrise } from '../generic/industry'
import { sunLightOf, sunStyle } from '../LightRig'
import styles from '../marks.module.css'

/**
 * Design study (`?skyline=a|b|c`, `outsideView.ts`): the place's towers and built squares seen from outside, far to near.
 * Haze by depth (the far edge of the place takes a third of the far ridge's tone); the lit side follows the sun's side.
 */
interface Props { skyline: Skyline; night: boolean; litShare: number; sunX: number | null }

const haze = (near: number) => ({
  '--house-base': `color-mix(in srgb, var(--ridge-far) ${Math.round(40 * (1 - near))}%, var(--ridge-near))`,
}) as CSSProperties

function Box({ box, sunX, night, litShare, index }: { box: OutsideBox; sunX: number | null; night: boolean; litShare: number; index: number }) {
  const { x, w, top, foot, kind } = box
  const left = x - w / 2
  const light = kind !== 'block' ? sunLightOf(sunX, x) : null
  const litLeft = sunX !== null && sunX < x
  const lit = !night && light && w >= 1.5
  const window = night && seeded(index + 1)() < litShare * .8
  return <g style={light ? sunStyle(light.k) : undefined}>
    <rect className={styles.wall} x={left} y={top} width={w} height={foot - top} />
    {lit && <rect className={styles.lit} opacity={kind === 'fabric' ? .55 : .8} x={litLeft ? left : x + .2 * w} y={top}
      width={.3 * w} height={foot - top} />}
    {kind === 'block' && !night && <rect className={styles.shade} opacity={.35} x={left} y={top} width={.3} height={foot - top} />}
    {window && <rect className={styles.win} x={left + w * .3} y={top + 1} width={.7} height={.7} />}
  </g>
}

function Silhouette({ tower, sunX, night, litShare }: { tower: OutsideTower; sunX: number | null; night: boolean; litShare: number }) {
  const { x, baseY, w, h, crown, seed } = tower
  const left = x - w / 2
  const body = crown === 2 ? .9 * h : crown === 1 ? .86 * h : h
  const light = sunLightOf(sunX, x)
  // The lit face is the one toward the sun: sun left of the tower, its left face.
  const litLeft = sunX !== null && sunX < x
  const random = seeded(seed)
  const windows = night ? Array.from({ length: Math.round(h / 6) }, () => random()).flatMap((u, i) =>
    u < litShare * .7 ? [{ x: left + .4 + random() * Math.max(.1, w - 1.2), y: baseY - 2 - i * 6 - random() * 3 }] : []) : []
  return <g style={light ? sunStyle(light.k) : undefined}>
    <rect className={styles.wall} x={left} y={baseY - body} width={w} height={body} />
    {crown === 1 && <rect className={styles.wall} x={x - .32 * w} y={baseY - h} width={.64 * w} height={h - body + .1} />}
    {crown === 2 && <rect className={styles.wall} x={x - .25} y={baseY - h} width={.5} height={h - body + .1} />}
    {!night && light && <rect className={styles.lit} x={litLeft ? left : x + .1 * w} y={baseY - body} width={.4 * w} height={body} />}
    {!night && light && <rect className={styles.shade} opacity={.45} x={litLeft ? x + .25 * w : left} y={baseY - body}
      width={.25 * w} height={body} />}
    {windows.map((win, i) => <rect key={i} className={styles.win} x={win.x} y={win.y} width={.7} height={.7} />)}
  </g>
}

export function OutsideSkyline({ skyline, night, litShare, sunX }: Props) {
  type Item = { near: number; node: React.ReactNode }
  const items: Item[] = [
    ...skyline.boxes.map((box, i): Item => ({ near: box.near, node: <g key={`b${i}`} className={styles.house} style={haze(box.near)}>
      <Box box={box} sunX={sunX} night={night} litShare={litShare} index={i} />
    </g> })),
    ...skyline.towers.map((tower): Item => ({ near: tower.near + 1e-3, node: <g key={`t${tower.seed}:${tower.x}`}
      className={styles.house} style={haze(tower.near)}>
      {tower.lod === 'glyph'
        ? <g transform={`translate(${tower.x} ${tower.baseY}) scale(${tower.w / 7} 1)`}>
          <Highrise h={tower.h} night={night} seed={tower.seed} litShare={litShare} />
        </g>
        : <Silhouette tower={tower} sunX={sunX} night={night} litShare={litShare} />}
    </g> })),
  ]
  return <>{items.sort((a, b) => a.near - b.near).map(item => item.node)}</>
}
