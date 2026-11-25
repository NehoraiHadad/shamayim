import { clockOf } from '../../domain/time'
import { ltr } from '../../text/isolate'
import marks from './markers.module.css'
import type { SunMarker } from './stripLayout'
import type { AwaySide } from './useHourlyScroll'

function TagArrow({ side }: { side: AwaySide }) {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true">
      <path d={side === 'left' ? 'M6.5 2L3.5 5l3 3' : 'M3.5 2l3 3-3 3'} />
    </svg>
  )
}

/** Edge chip pointing to the next sunrise/sunset when its marker is scrolled out of view. */
export function NextSunTag({ sun, away, onClick }: { sun: SunMarker; away: AwaySide; onClick: (fromKeyboard: boolean) => void }) {
  const label = sun.rise ? 'זריחה' : 'שקיעה'
  const clock = clockOf(sun.time)
  return (
    <button
      type="button"
      className={`${marks.chip} ${marks.sunTag} ${marks[away]}`}
      onClick={(event) => onClick(event.detail === 0)}
      aria-label={`${label} ב־${ltr(clock)}. הצגה ברצועה`}
    >
      {away === 'right' && <TagArrow side="right" />}
      <span>{label} <bdi>{clock}</bdi></span>
      {away === 'left' && <TagArrow side="left" />}
    </button>
  )
}
