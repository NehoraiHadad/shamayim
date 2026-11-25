import { isolateNumbers } from './isolateNumbers'
import styles from './Sentence.module.css'

/** The headline: a short Hebrew description of the expected weather. */
export function Sentence({ sentences }: { sentences: string[] }) {
  if (!sentences.length) return null
  return (
    <div className={styles.summary} data-intro="sentence">
      {sentences.map((s, i) => (
        <p className={styles.sentence} key={i}>{isolateNumbers(s)}</p>
      ))}
    </div>
  )
}
