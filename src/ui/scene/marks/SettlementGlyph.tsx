import { Fragment, useId, useMemo, type ReactNode } from 'react'
import type { House, Settlement } from '../../../data/landmarks/settlement'
import { BlockHouse } from './blocks'
import { CityMass } from './city/CityMass'
import { CastShadow } from './generic/shadow'
import { FlatRoof, Shed, TileHouse } from './houses'
import { ContactShadow, SunStrip, sunLightOf, sunStyle } from './LightRig'
import styles from './marks.module.css'

/** The place's own houses (ILLUSTRATION.md §4), drawn in px in the shared overlay svg. */
interface Props {
  settlement: Settlement
  sunX: number | null
  night: boolean
  reach?: number
  afterRow?: (row: number) => ReactNode
  /** Share of windows lit at this hour (the city mass's night lights). */
  litShare?: number
}

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
  if (house.kind === 'shed') return <Shed w={house.w} h={house.h} />
  if (style === 'blocks') return <BlockHouse w={house.w} h={house.h} seed={house.seed} night={night} lit={house.lit} />
  if (style === 'tile') return <TileHouse w={house.w} h={house.h} seed={house.seed} storeys={house.storeys} />
  return <FlatRoof w={house.w} h={house.h} heater={house.seed % 10 < 4} />
}

/**
 * Red-tile houses are drawn a size up around their own base point (the layout keeps the spec's 7 × 6 footprint, so the
 * dot, label and absorbed-hall clearances hold): at 1x the spec size vanished into the ridge (כרמי צור).
 */
const TILE_GROW = 1.25

/** A house's own way round (its gable end, heater, steps), fixed by its seed: houses never turn with the sun. */
const formOf = (house: House) => (house.seed >> 7) & 1 ? -1 : 1

export function SettlementGlyph({ settlement, sunX, night, reach, afterRow, litShare = 0 }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const { style, houses, contours, detail } = settlement
  const inDetail = (house: House) => !detail || Math.abs(house.x - detail.centerX) <= detail.half
  /** Stable per settlement, so the merged paths rebuild only when the city or the light changes. */
  const mass = useMemo(() => [0, 1, 2].map(row => houses.filter(house => house.row === row
    && detail !== undefined && Math.abs(house.x - detail.centerX) > detail.half)), [houses, detail])
  const ordered = houses.filter(inDetail).sort((a, b) => a.row - b.row || a.baseY - b.baseY)
  const lit = sunX != null && !night
  /** One light direction for the whole cluster, so no seam runs through the village at the sun's x. */
  const xs = houses.map((house) => house.x)
  const light = lit ? sunLightOf(sunX, (Math.min(...xs) + Math.max(...xs)) / 2) : null
  const side = light?.side ?? null
  const sunWest = side === 'w'
  const grow = style === 'tile' ? TILE_GROW : 1
  const drawHouse = (house: House, i: number) => {
    const form = formOf(house)
    // Houses draw their lit face on the left; one that faces away goes flat and takes the rig's strip
    // on its own right (the sun's side in its local frame).
    const asDrawn = side !== null && sunWest === (form === 1)
    const tone = style === 'blocks' ? blockTone(house.seed, house.row === 0)
      : style === 'tile' ? [styles.house, styles.limestone, house.row === 0 ? styles.recede : ''].join(' ') : ''
    return <g key={`${house.row}-${house.seed}`}>
      {/* The crest row stands furthest back: toned toward the ridge, still with its two faces. */}
      <g transform={`translate(${house.x.toFixed(1)} ${(house.baseY + .5).toFixed(1)}) scale(${form * (house.kind ? 1 : grow)} ${house.kind ? 1 : grow})`}
        className={[tone, side && !asDrawn ? styles.flat : ''].join(' ').trim() || undefined}>
        {lit && (asDrawn ? <CastShadow w={house.w} h={house.h} reach={reach} />
          : <ContactShadow w={house.w} side={side && 'e'} />)}
        <Body house={house} style={style} night={night} />
        {side && !asDrawn && <SunStrip id={`${id}h${i}`} w={house.w} h={house.h} side="e">
          <Body house={house} style={style} night={false} />
        </SunStrip>}
      </g>
      {night && house.lit && style !== 'blocks' && <Windows house={house} style={style} />}
    </g>
  }
  const drawn = ordered.map(drawHouse)
  return <g className={side ? undefined : styles.flat} style={light ? sunStyle(light.k) : undefined}>
    {contours.map((d) => <path key={d} className={styles.contour} d={d} />)}
    {afterRow || detail ? [0, 1, 2].map(row => <Fragment key={row}>
      <CityMass houses={mass[row]} row={row} sunWest={side && sunWest} night={night} litShare={litShare} />
      {drawn.filter((_, i) => ordered[i].row === row)}
      {afterRow?.(row)}
    </Fragment>) : drawn}
  </g>
}
