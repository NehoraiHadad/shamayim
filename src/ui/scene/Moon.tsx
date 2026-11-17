import { useId, useMemo, type CSSProperties } from 'react'
import { moonIllumination, moonPosition } from '../../astro/moon'
import { sunPosition as sunSky } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import type { LocalTime } from '../../domain/types'
import { brightLimbAngle, litPath, moonLook, skyPoint } from './moonShape'
import styles from './Moon.module.css'

interface Props {
  /** The shown moment (now or the scrubbed time), wall clock in `timeZone`. */
  at: LocalTime
  timeZone: string
  lat: number
  lon: number
  /** Cloud cover of the shown hour, 0–100. */
  cloudCover: number
  /** Far-ridge haze fade, 0–1: thick haze takes the moon with it. */
  farFade: number
}

const R = 7

/**
 * The moon at its true place in the sky, in its true phase, lit side turned towards the sun. Drawn before the ridges,
 * so it rises and sets behind them like the sun. Flat, no halo: a bone disc at night, a pale one by day.
 */
export function Moon({ at, timeZone, lat, lon, cloudCover, farFade }: Props) {
  const clip = `moon${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const sky = useMemo(() => {
    const instant = utcOf(at, timeZone)
    const moon = moonPosition(instant, lat, lon)
    const sun = sunSky(instant, lat, lon)
    const lit = moonIllumination(instant)
    return { moon, sun, lit }
  }, [at, timeZone, lat, lon])
  const look = moonLook({ altitude: sky.moon.altitude, fraction: sky.lit.fraction, sunAltitude: sky.sun.altitude, cloudCover, farFade })
  if (!look) return null
  const point = skyPoint(sky.moon.altitude, sky.moon.azimuth)
  const angle = brightLimbAngle(point, skyPoint(sky.sun.altitude, sky.sun.azimuth))
  const style = { left: `${(point.x * 100).toFixed(2)}%`, top: `${point.y.toFixed(1)}px`, opacity: look.opacity.toFixed(2),
    '--daylight': look.daylight.toFixed(2) } as CSSProperties
  return (
    <div className={styles.moon} style={style} data-moon aria-hidden="true">
      <svg width={2 * R + 2} height={2 * R + 2} viewBox={`${-R - 1} ${-R - 1} ${2 * R + 2} ${2 * R + 2}`}>
        <defs>
          <clipPath id={clip}>
            <path d={litPath(sky.lit.fraction, R)} transform={`rotate(${angle.toFixed(1)})`} />
          </clipPath>
        </defs>
        {look.ring && <circle r={R - 0.5} className={styles.ring} />}
        <g clipPath={`url(#${clip})`}>
          <circle r={R} className={styles.face} />
          {/* A few soft seas, fixed on the face (they do not turn with the lit side); at 14 px they only say "moon". */}
          <path className={styles.maria} d="M-3.6 -3.4c1.4-1.2 3.3-1 3.9.2.5 1-.6 2-2.1 2.1-1.3.1-2.6-.9-1.8-2.3zM1.2 -2.6c1-.8 2.6-.5 2.9.6.3 1.1-.8 1.8-1.9 1.6-1.1-.2-1.7-1.3-1-2.2zM1.6 .6c.9-.6 2.4-.2 2.4.9 0 1.2-1.4 2.2-2.4 1.8-.9-.4-.9-1.9 0-2.7zM-5.4 -.6c.6-1 2-.8 2.3.4.4 1.6-.4 3.6-1.5 3.6-1.1 0-1.4-2.6-.8-4z" />
        </g>
      </svg>
    </div>
  )
}
