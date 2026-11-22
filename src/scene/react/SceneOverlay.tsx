import type { CSSProperties } from 'react'
import styles from './Scene.module.css'
import own from './SceneOverlay.module.css'
import type { OverlayItem } from '../model/types'

const pct = (x: number, width: number) => `${(x / width * 100).toFixed(2)}%`

/**
 * The HTML over the land (§1e), placed from `model.overlay`: the village dot, the height label, the "פני הים" datum
 * note and the water's names, in the SVG scene's classes (`Scene.module.css`); x in % of the figure, y in px. `style` is laid on every item (C8:
 * hidden while the land arrives, then faded in).
 */
export function SceneOverlay({ items, width, style }: { items: readonly OverlayItem[]; width: number; style?: CSSProperties }) {
  const at = (item: { x: number; y: number }): CSSProperties => ({ left: pct(item.x, width), top: item.y, ...style })
  return items.map((item) => {
    switch (item.kind) {
      case 'dot':
        return <span key="dot" className={styles.village} style={at(item)} aria-hidden="true" />
      case 'height':
        return (
          <span key="height" className={item.backed ? `${styles.depth} ${own.backed}` : styles.depth} style={at(item)} aria-hidden="true">
            {item.text}
          </span>
        )
      default:
        return (
          <span key={`${item.kind}:${item.text}`} className={item.kind === 'datum' ? styles.seaLabel : styles.waterLabel}
            style={at(item)} aria-hidden="true">{item.text}</span>
        )
    }
  })
}
