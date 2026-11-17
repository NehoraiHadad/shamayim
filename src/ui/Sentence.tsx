import { isolateNumbers } from './isolateNumbers'
import styles from './Sentence.module.css'

/** The headline: a short Hebrew description of the expected weather. */
export function Sentence({ sentences }: { sentences: string[] }) {
  if (!sentences.length) return null
  return (
    <p className={styles.sentence} aria-live="polite" data-intro="sentence">
      {sentences.map((s, i) => (
        <span key={i} className={i === 0 ? styles.lead : styles.rest}>
          {isolateNumbers(s)}{' '}
        </span>
      ))}
    </p>
  )
}
