import styles from './StyleVoteToggle.module.css'
import { PANEL_ID } from './StyleVotePanel'
import { TITLE } from './styleVoteText'
import type { StyleVoteState } from './useStyleVote'

/** Opens the style switch; sits on the paper just under the valley. */
export function StyleVoteToggle({ state: { open, setOpen, close, toggle } }: { state: StyleVoteState }) {
  return (
    <button ref={toggle} type="button" className={styles.toggle} data-style-vote aria-expanded={open}
      aria-controls={open ? PANEL_ID : undefined} onClick={() => (open ? close() : setOpen(true))}>
      <span className={styles.chip}>
        {/* One hill, half shaded and half outlined. */}
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7.5c-3.5 0-5 6-9.5 10.5H12z" fill="currentColor" />
          <path d="M12 7.5c3.5 0 5 6 9.5 10.5H12z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        {TITLE}
      </span>
    </button>
  )
}
