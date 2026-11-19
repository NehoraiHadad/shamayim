import styles from '../../ui/scene/ValleyScene.module.css'
import type { OverlayItem } from '../model/types'

const pct = (x: number, width: number) => `${(x / width * 100).toFixed(2)}%`

/**
 * The HTML over the land (§1e), placed from `model.overlay`: the village dot, the height label, the "פני הים" datum
 * note and the water's names, in the SVG scene's classes; x in % of the figure, y in px.
 */
export function SceneOverlay({ items, width }: { items: readonly OverlayItem[]; width: number }) {
  return items.map((item) => {
    switch (item.kind) {
      case 'dot':
        return <span key="dot" className={styles.village} style={{ left: pct(item.x, width), top: item.y }} aria-hidden="true" />
      case 'height':
        return (
          <span key="height" className={styles.depth} style={{ left: pct(item.x, width), top: item.y }} aria-hidden="true">
            <bdi>{item.text.replace(' מ׳', '')}</bdi> מ׳
          </span>
        )
      default:
        return (
          <span key={`${item.kind}:${item.text}`} className={item.kind === 'datum' ? styles.seaLabel : styles.waterLabel}
            style={{ left: pct(item.x, width), top: item.y }} aria-hidden="true">{item.text}</span>
        )
    }
  })
}
