import type { House, Settlement } from '../../../data/landmarks/settlement'
import { BlockHouse } from './blocks'
import { CastShadow } from './generic/shadow'
import { FlatRoof, TileHouse } from './houses'
import styles from './marks.module.css'

/** The place's own houses (ILLUSTRATION.md §4), drawn in px in the shared overlay svg. */
interface Props { settlement: Settlement; sunX: number | null; night: boolean }

/** Night windows of the tile and flat villages (blocks draw their own window rows). */
function Windows({ house, style }: { house: House; style: Settlement['style'] }) {
  const { x, baseY: b, h, w, seed } = house
  if (seed % 4 === 3) return null
  if (style === 'tile') {
    const at = x - .75 + (seed % 3 - 1) * w * .25
    return <>{(seed % 5 ? [at] : [at - 1.4, at + 1.4]).map((left) => (
      <rect key={left} className={styles.win} x={left} y={b - h * .5 + .6} width={1.5} height={1.5} />))}</>
  }
  return <>{Array.from({ length: 1 + seed % 2 }, (_, i) => (
    <rect key={i} className={styles.win} x={x - w / 2 + 1.5 + ((seed >> i) % 2) * 2.5} y={b - h + 2}
      width={(seed >> (i + 2)) % 3 ? 1.5 : 1} height={1.5} />
  ))}</>
}

const TONES = [undefined, undefined, styles.washed, styles.washed, styles.stone, styles.basalt]

/** The house's wash by its seed, and the crest row pulled back toward the far ridge (marks.module.css `.house`). */
function blockTone(seed: number, back: boolean) {
  return [styles.house, back ? styles.recede : '', TONES[(seed >> 5) % TONES.length] ?? ''].join(' ').trim()
}

function Body({ house, style, night }: { house: House; style: Settlement['style']; night: boolean }) {
  if (style === 'blocks') return <BlockHouse w={house.w} h={house.h} seed={house.seed} night={night} lit={house.lit} />
  if (style === 'tile') return <TileHouse w={house.w} h={house.h} seed={house.seed} />
  return <FlatRoof w={house.w} h={house.h} heater={house.seed % 10 < 4} />
}

export function SettlementGlyph({ settlement, sunX, night }: Props) {
  const { style, houses, contours } = settlement
  const ordered = [...houses].sort((a, b) => a.row - b.row || a.baseY - b.baseY)
  const lit = sunX != null && !night
  /** One light direction for the whole cluster, so no seam runs through the village at the sun's x. */
  const xs = houses.map((house) => house.x)
  const mirror = lit && sunX! > (Math.min(...xs) + Math.max(...xs)) / 2 ? -1 : 1
  return <g className={lit ? undefined : styles.flat}>
    {contours.map((d) => <path key={d} className={styles.contour} d={d} />)}
    {ordered.map((house) => (
      <g key={`${house.row}-${house.x.toFixed(1)}`}>
        {/* The crest row stands furthest back: toned toward the ridge, still with its two faces. */}
        <g transform={`translate(${house.x.toFixed(1)} ${(house.baseY + .5).toFixed(1)}) scale(${mirror} 1)`}
          className={style === 'blocks' ? blockTone(house.seed, house.row === 0) : undefined}>
          {lit && <CastShadow w={house.w} h={house.h} />}
          <Body house={house} style={style} night={night} />
        </g>
        {night && house.lit && style !== 'blocks' && <Windows house={house} style={style} />}
      </g>
    ))}
  </g>
}
