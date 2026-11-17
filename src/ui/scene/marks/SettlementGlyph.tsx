import type { House, Settlement } from '../../../data/landmarks/settlement'
import { CastShadow } from './generic/shadow'
import { FlatRoof, TileHouse } from './houses'
import styles from './marks.module.css'

/** The place's own houses (ILLUSTRATION.md §4), drawn in px in the shared overlay svg. */
interface Props { settlement: Settlement; sunX: number | null; night: boolean }

function Windows({ house, style }: { house: House; style: Settlement['style'] }) {
  const { x, baseY: b, h, w, seed } = house
  if (seed % 4 === 3) return null
  if (style === 'tile') return <rect className={styles.win} x={x - .75} y={b - h * .5 + .6} width={1.5} height={1.5} />
  const count = style === 'blocks' ? 2 + seed % 3 : 1 + seed % 2
  return <>{Array.from({ length: count }, (_, i) => {
    const column = (seed >> i) % 2
    const row = style === 'blocks' ? i : 0
    return <rect key={i} className={styles.win} x={x - w / 2 + 1.5 + column * 2.5} y={b - h + 2 + row * 2.5}
      width={(seed >> (i + 2)) % 3 ? 1.5 : 1} height={1.5} />
  })}</>
}

export function SettlementGlyph({ settlement, sunX, night }: Props) {
  const { style, houses, contours } = settlement
  const ordered = [...houses].sort((a, b) => a.row - b.row || a.baseY - b.baseY)
  const lit = sunX != null && !night
  return <g className={lit ? undefined : styles.flat}>
    {contours.map((d) => <path key={d} className={styles.contour} d={d} />)}
    {ordered.map((house) => {
      const mirror = lit && sunX! > house.x ? -1 : 1
      const back = style === 'blocks' && house.row === 0
      return <g key={`${house.row}-${house.x.toFixed(1)}`}>
        <g transform={`translate(${house.x.toFixed(1)} ${(house.baseY + .5).toFixed(1)}) scale(${mirror} 1)`}
          className={back ? styles.back : undefined}>
          {lit && !back && <CastShadow w={house.w} h={house.h} />}
          {style === 'tile' ? <TileHouse w={house.w} h={house.h} seed={house.seed} />
            : <FlatRoof w={house.w} h={house.h} heater={house.seed % 10 < 4} />}
        </g>
        {night && house.lit && <Windows house={house} style={style} />}
      </g>
    })}
  </g>
}
