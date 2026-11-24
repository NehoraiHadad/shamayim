import styles from './SpecialLine.module.css'

/** One quiet line about something worth a look; nothing at all on most days. */
export function SpecialLine({ text }: { text: string | null }) {
  return text ? <p className={styles.line}>{text}</p> : null
}
