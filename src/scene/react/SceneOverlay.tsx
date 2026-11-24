import type { CSSProperties } from 'react'
import type { OverlayItem } from '../model/types'
import styles from './Scene.module.css'

const pct = (x: number, width: number) => `${(x / width * 100).toFixed(2)}%`

/**
 * The HTML over the land (§1e), placed from `model.overlay`: the "פני הים" datum note and the water's names, at the foot
 * of their boxes; x in % of the figure, y in px. `style` is laid on every item (C8: hidden while the land arrives, then
 * faded in).
 */
export function SceneOverlay({ items, width, style }: { items: readonly OverlayItem[]; width: number; style?: CSSProperties }) {
  return items.map(({ kind, text, x, y, w, h, ink }) => (
    <span key={`${kind}:${text}`} className={styles.note} aria-hidden="true"
      style={{ left: pct(x, width), top: y, width: w, height: h, color: ink, ...style }}>{text}</span>
  ))
}
