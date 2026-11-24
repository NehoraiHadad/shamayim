import { groundFn } from '../data/landmarks/seat'
import { waterLayer } from '../data/water/glint'
import type { WaterSpan } from '../data/water/waterInView'
import type { OutsidePlace } from './outside'
import type { outsideBodies } from './outsideBodies'
import { VISIBLE_BOTTOM } from './layout'
import { SCENE_W } from './sceneBox'
import type { Pt } from './types'
import { onLake, onSea } from './village/water'

/** A body of water is in the picture when its surface shows over at least this many columns (px at the reference width). */
const MIN_COLUMNS = 24

type Cover = (x: number, y: number) => boolean
/** The place's sea and land as laid, and the buildings as they stand in the picture: its own and the towns beyond it. */
type View = Pick<OutsidePlace, 'sea' | 'land'> & { standing: Pick<ReturnType<typeof outsideBodies>, 'boxes' | 'towers' | 'beyond' | 'towns'> }

/** A line's height (y) over its own span, `outside` beyond its ends. */
function lineY(points: readonly Pt[], outside: number): (x: number) => number {
  const at = groundFn(points as [number, number][], SCENE_W)
  return (x) => x < points[0][0] || x > points.at(-1)![0] ? outside : at(x)
}

/** What is built in front of a column: the rows its boxes and towers fill. */
function builtOver({ standing }: View): (x: number) => Cover {
  const blocks = [...standing.boxes.map(({ box, x, w }) => [x - w / 2, x + w / 2, box.top, box.foot]),
    ...standing.towers.map(({ tower, x, w }) => [x - w / 2, x + w / 2, tower.baseY - tower.h, tower.baseY]),
    ...[...standing.beyond, ...standing.towns].map((b) => [b.x - b.w / 2, b.x + b.w / 2, b.baseY - b.h, b.baseY])]
  return (x) => {
    const here = blocks.filter(([left, right]) => x >= left && x <= right)
    return (_, y) => here.some(([, , top, foot]) => y >= top && y <= foot)
  }
}

/**
 * The named waters truly drawn in the picture, whatever the hour, each name once, left to right: a stretch of water in
 * view as far as the ground drawn in front of it (the place's own rise; for water on the far land the near land too),
 * a coastal place's own sea and the buildings leave it showing above the sheet, and that sea itself.
 */
export function watersShown(spans: readonly WaterSpan[], view: View, nearGround: (x: number) => number, width: number): string[] {
  const { sea, land } = view
  const named = spans.filter((span) => span.name)
  if (!named.length && !sea?.name) return []
  const landTop = land ? lineY(land.top, Infinity) : () => Infinity
  const landFoot = land ? lineY(land.base, -Infinity) : () => -Infinity
  const onLand: Cover = (x, y) => y >= landTop(x) && y <= landFoot(x)
  const built = builtOver(view)
  const columns = new Map<string, { first: number; count: number }>()
  const px = width / SCENE_W
  const bodies = [
    ...named.map((span) => ({ name: span.name!, from: Math.floor(Math.min(...span.edges.map((e) => e.farY))),
      wet: (x: number, y: number) => onLake(span, x / px, y) && !onLand(x, y) && !(sea && onSea(sea, x, y))
        && (waterLayer(span) === 'near' || y < nearGround(x)) })),
    ...(sea?.name ? [{ name: sea.name, from: Math.floor(sea.horizon), wet: (x: number, y: number) => onSea(sea, x, y) }] : []),
  ]
  for (let i = 0; i < SCENE_W; i++) {
    const x = (i + .5) * px
    const behind = built(x)
    const here = new Set<string>()
    for (const { name, from, wet } of bodies) {
      for (let y = from + .5; y < VISIBLE_BOTTOM && !here.has(name); y++) if (wet(x, y) && !behind(x, y)) here.add(name)
    }
    for (const name of here) {
      const known = columns.get(name) ?? { first: i, count: 0 }
      columns.set(name, { ...known, count: known.count + 1 })
    }
  }
  return [...columns].filter(([, { count }]) => count >= MIN_COLUMNS).sort(([, a], [, b]) => a.first - b.first).map(([name]) => name)
}
