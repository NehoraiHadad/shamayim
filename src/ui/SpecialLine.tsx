import { useState } from 'react'
import styles from './SpecialLine.module.css'

/** One quiet line about something worth a look, nothing on most days: it opens when there is one and closes when it is over. */
export function SpecialLine({ text }: { text: string | null }) {
  // The words stay while the line closes over them.
  const [last, setLast] = useState(text)
  if (text && text !== last) setLast(text)
  return (
    <div className={styles.slot} data-special-line data-open={text !== null} aria-hidden={text === null}>
      <div className={styles.clip}>{last && <p className={styles.line}>{last}</p>}</div>
    </div>
  )
}
