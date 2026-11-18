import styles from './OverheadEntry.module.css'

export function OverheadEntry({ rainy, position, onOpen }: {
  rainy: boolean
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
      {rainy ? 'גשם בדרך — מבט מלמעלה' : 'מבט מלמעלה'}
      {rainy && <span aria-hidden="true">‹</span>}
    </button>
  )
}
