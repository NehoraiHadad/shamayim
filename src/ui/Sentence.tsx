import styles from './Sentence.module.css'

/** Numbers with their unit ("16°", "11:00", "9 מ״מ") isolated as LTR so the ° never flips in RTL. */
const NUMERIC = /(−?\d+(?::\d\d)?°?)/

function isolateNumbers(s: string) {
  return s.split(NUMERIC).map((part, i) => (i % 2 ? <bdi key={i}>{part}</bdi> : part))
}

/** The headline: a short Hebrew description of the expected weather. */
export function Sentence({ sentences }: { sentences: string[] }) {
  if (!sentences.length) return null
  return (
    <p className={styles.sentence} aria-live="polite">
      {sentences.map((s, i) => (
        <span key={i} className={i === 0 ? styles.lead : styles.rest}>
          {isolateNumbers(s)}{' '}
        </span>
      ))}
    </p>
  )
}
