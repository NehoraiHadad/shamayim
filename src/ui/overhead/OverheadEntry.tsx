import styles from './OverheadEntry.module.css'

/** Opens the view from above: a plain-words rain story at the top when rain is near, else a quiet link at the end. */
export function OverheadEntry({ rainy, story, position, onOpen }: {
  rainy: boolean
  story: string | null
  position: 'top' | 'bottom'
  onOpen: () => void
}) {
  if (rainy !== (position === 'top')) return null
  return (
    <button type="button" className={rainy ? styles.row : styles.link} aria-haspopup="dialog" data-overhead-entry
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true })
        onOpen()
      }}>
      {rainy ? (
        <>
          <span className={styles.story}>{story ?? 'גשם בדרך'}</span>
          <span className={styles.more}>מבט מלמעלה <span aria-hidden="true">‹</span></span>
        </>
      ) : 'מבט מלמעלה'}
    </button>
  )
}
