import { useRef } from 'react'
import type { LocalTime } from '../../domain/types'
import { SCENE_STYLES } from '../../scene/sceneStyle'
import { IconButton } from '../IconButton'
import { CloseIcon } from '../icons'
import styles from './StyleVotePanel.module.css'
import { CLOSE, PENDING, PREFERRED, SEE_OTHER, STYLE_NAMES, THANKS, TITLE, VOTE, WHATSAPP, whatsappUrl } from './styleVoteText'
import { useStylePanel } from './useStylePanel'
import type { StyleVoteState } from './useStyleVote'

export const PANEL_ID = 'style-vote-panel'

interface Props {
  state: Pick<StyleVoteState, 'style' | 'vote' | 'seenBoth' | 'pending' | 'choose' | 'castVote' | 'close'>
  placeName: string
  /** The time the scene shows. */
  at: LocalTime
  /** An hour is picked: its readout keeps its place below the panel. */
  picked: boolean
}

/** A small card docked at the bottom, not modal: the valley above stays in view and usable while the styles are compared. */
export function StyleVotePanel({ state, placeName, at, picked }: Props) {
  const { style, vote, seenBoth, pending, choose, castVote, close } = state
  const panel = useRef<HTMLElement>(null)
  useStylePanel(panel, close)
  const voted = vote === style
  const prefer = () => {
    castVote()
    // The button leaves with the vote; focus stays in the panel.
    panel.current?.querySelector<HTMLInputElement>('input:checked')?.focus({ preventScroll: true })
  }
  return (
    <section ref={panel} id={PANEL_ID} className={styles.panel} data-picked={picked || undefined} aria-labelledby="style-vote-title">
      <div className={styles.heading}>
        <h2 id="style-vote-title">{TITLE}</h2>
        <IconButton label={CLOSE} onClick={close}><CloseIcon /></IconButton>
      </div>
      <div className={styles.options} role="radiogroup" aria-labelledby="style-vote-title">
        {SCENE_STYLES.map((option) => (
          <label key={option} className={styles.option}>
            <input type="radio" name="scene-style" value={option} checked={style === option} onChange={() => choose(option)} />
            <span>
              {vote === option && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              )}
              {STYLE_NAMES[option]}
              {vote === option && <span className="visually-hidden">{PREFERRED}</span>}
            </span>
          </label>
        ))}
      </div>
      <div className={styles.answer}>
        <p role="status">{voted ? (pending ? PENDING : THANKS) : seenBoth ? '' : SEE_OTHER}</p>
        {seenBoth && !voted && <button type="button" className={styles.vote} onClick={prefer}>{VOTE}</button>}
      </div>
      <a className={styles.whatsapp} href={whatsappUrl({ vote, style, placeName, at })} target="_blank" rel="noreferrer">{WHATSAPP}</a>
    </section>
  )
}
