import type { AirState } from '../airTypes'
import { LifeEvent } from './LifeEvent'
import type { LifeState } from './types'
import { Twinkle } from './Twinkle'
import { useLifeEvents } from './useLifeEvents'
import styles from './Life.module.css'

interface Props {
  life: LifeState
  air: AirState
  sunElevation: number
  intro: boolean
}

export function Life({ life, air, sunElevation, intro }: Props) {
  const { event, complete, motionAllowed } = useLifeEvents(life, !intro)
  const base = sunElevation < 10 ? [52, 36, 40, .66] : [38, 48, 66, .62]
  const alpha = base[3] * (1 - .6 * air.haze.farFade)
  const ink = `rgba(${base[0]},${base[1]},${base[2]},${alpha.toFixed(3)})`
  return (
    <div data-life className={styles.life}>
      <Twinkle state={life.twinkle} enabled={motionAllowed} />
      {event && <LifeEvent plan={event} seed={life.seed} autumn={life.autumn} ink={ink} valid={life.eligible.includes(event.kind)} onComplete={complete} />}
    </div>
  )
}
