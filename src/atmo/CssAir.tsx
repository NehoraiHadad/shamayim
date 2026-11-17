import type { CSSProperties } from 'react'
import type { AirState } from './airTypes'
import styles from './CssAir.module.css'

/** The air without WebGL: drifting cloud blobs, rain lines at the wind's angle, a dust veil. */
export function CssAir({ air }: { air: AirState }) {
  const raining = air.rain.count > 0
  const tilt = `${Math.round(15 + (air.rain.slant * 180) / Math.PI)}deg`
  return (
    <div className={styles.air} aria-hidden="true">
      <div className={styles.clouds} style={{ opacity: Math.min(0.7, air.cloud.coverage) }}>
        <span /><span /><span />
      </div>
      <div
        className={styles.rain}
        style={{ opacity: raining ? Math.min(1, 0.4 + air.rain.count / 300) : 0, animationPlayState: raining ? 'running' : 'paused', '--tilt': tilt } as CSSProperties}
      />
      <div className={styles.dust} style={{ opacity: air.grains.count > 0 ? 0.14 : 0 }} />
    </div>
  )
}
