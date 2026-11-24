import styles from './SceneFacts.module.css'

/** What the scene shows, in one quiet line at the foot of the page: the place, its height and the waters drawn. */
export function SceneFacts({ text }: { text: string | null }) {
  return text ? <p className={styles.facts}>{text}</p> : null
}
