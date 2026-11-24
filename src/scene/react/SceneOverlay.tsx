import type { CSSProperties } from 'react'
import type { OverlayItem } from '../model/types'
import type { SceneStyle } from '../paint/painters'
import { HeightLabel } from './HeightLabel'
import styles from './Scene.module.css'

const pct = (x: number, width: number) => `${(x / width * 100).toFixed(2)}%`

/**
 * The HTML over the land (§1e), placed from `model.overlay`: the place's height with its tick and dot in the scene's
 * hand, the "פני הים" datum note and the water's names; x in % of the figure, y in px. `style` is laid on every item
 * (C8: hidden while the land arrives, then faded in).
 */
export function SceneOverlay({ items, width, style, hand }: { items: readonly OverlayItem[]; width: number; style?: CSSProperties; hand: SceneStyle }) {
  const at = (item: { x: number; y: number }): CSSProperties => ({ left: pct(item.x, width), top: item.y, ...style })
  return items.map((item) => {
    switch (item.kind) {
      case 'height':
        return <HeightLabel key="height" item={item} left={pct(item.spot.x, width)} style={style} hand={hand} />
      default:
        return (
          <span key={`${item.kind}:${item.text}`} className={item.kind === 'datum' ? styles.seaLabel : styles.waterLabel}
            style={at(item)} aria-hidden="true">{item.text}</span>
        )
    }
  })
}
