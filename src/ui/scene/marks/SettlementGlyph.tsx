import type { House, Settlement } from '../../../data/landmarks/settlement'
import styles from './marks.module.css'

/** The place's own houses (ILLUSTRATION.md §4), drawn in px in the shared overlay svg. */
type Side = 'w' | 'e' | 'top' | null
interface Props { settlement: Settlement; sunX: number | null; night: boolean }

function sideOf(sunX: number | null, x: number): Side {
  if (sunX == null) return null
  return sunX < x - 40 ? 'w' : sunX > x + 40 ? 'e' : 'top'
}

function Tile({ house, side }: { house: House; side: Side }) {
  const { x, baseY: b, w, h } = house
  const wallH = h * .5
  const left = x - w / 2
  return <>
    <rect className={styles.wall} x={left + .5} y={b - wallH} width={w - 1} height={wallH} />
    {side === 'w' || side === 'e'
      ? <rect className={styles.lit} x={side === 'w' ? left + .5 : x} y={b - wallH} width={w / 2 - .5} height={wallH} /> : null}
    <path className={styles.roof} d={`M${left} ${b - wallH}h${w}l${-(w / 2 - 1)} ${-(h - wallH)}h-2z`} />
  </>
}

function Box({ house, side, back }: { house: House; side: Side; back: boolean }) {
  const { x, baseY: b, w, h, seed } = house
  const left = x - w / 2
  return <g className={back ? styles.back : undefined}>
    <rect className={styles.wall} x={left} y={b - h} width={w} height={h} />
    {side === 'w' || side === 'e'
      ? <rect className={styles.lit} x={side === 'w' ? left : x + w * .15} y={b - h} width={w * .35} height={h} /> : null}
    {side && <rect className={styles.lit} x={left} y={b - h} width={w} height={1} />}
    {seed % 10 < 4 && <rect className={styles.wall} x={seed % 2 ? left + .5 : x + w / 2 - 2.5} y={b - h - 1.5} width={2} height={1.5} />}
  </g>
}

function Windows({ house, style }: { house: House; style: Settlement['style'] }) {
  const { x, baseY: b, h, w, seed } = house
  if (style === 'tile') return <rect className={styles.win} x={x - .75} y={b - h * .5 + .6} width={1.5} height={1.5} />
  const count = style === 'blocks' ? 2 + seed % 3 : 1 + seed % 2
  return <>{Array.from({ length: count }, (_, i) => {
    const column = (seed >> i) % 2
    const row = style === 'blocks' ? i : 0
    return <rect key={i} className={styles.win} x={x - w / 2 + 1.5 + column * 2.5} y={b - h + 2 + row * 2.5}
      width={1.5} height={1.5} />
  })}</>
}

export function SettlementGlyph({ settlement, sunX, night }: Props) {
  const { style, houses, contours } = settlement
  const ordered = [...houses].sort((a, b) => a.row - b.row || a.baseY - b.baseY)
  return <g>
    {contours.map((d) => <path key={d} className={styles.contour} d={d} />)}
    {ordered.map((house) => {
      const side = night ? null : sideOf(sunX, house.x)
      return <g key={`${house.row}-${house.x.toFixed(1)}`}>
        {style === 'tile' ? <Tile house={house} side={side} />
          : <Box house={house} side={side} back={style === 'blocks' && house.row === 0} />}
        {night && house.lit && <Windows house={house} style={style} />}
      </g>
    })}
  </g>
}
