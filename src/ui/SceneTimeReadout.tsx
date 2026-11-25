import { useLayoutEffect, useRef } from 'react'
import { isolateNumbers } from './isolateNumbers'
import styles from './SceneTimeReadout.module.css'

export function SceneTimeReadout({ readout, onNow, returnFocus }: {
  readout: string
  onNow: () => void
  returnFocus: () => void
}) {
  const reset = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    const button = reset.current
    // The preview also dismisses itself. Keep the keyboard in the timeline if its reset was focused.
    return () => { if (document.activeElement === button) returnFocus() }
  }, [returnFocus])

  return (
    <div className={styles.preview}>
      <output aria-live="off">{isolateNumbers(readout)}</output>
      <button ref={reset} type="button" onClick={onNow}>חזרה לעכשיו</button>
    </div>
  )
}
