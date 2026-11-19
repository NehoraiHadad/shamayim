import styles from './Scene.module.css'

/**
 * The figure's place while the scene's chunk loads (App's `Suspense`): the same box, empty, over the sky's CSS gradient,
 * so nothing below it moves when the scene arrives (whose own loading mist then takes over, C8).
 */
export function SceneFallback() {
  return <figure className={styles.scene} aria-hidden="true" data-scene />
}
