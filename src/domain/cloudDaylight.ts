import { smoothstep } from './smoothstep'

/** Between the sky palette's 3° twilight and 7° daylight anchors. */
export const daylitShare = (altitude: number) => smoothstep(3, 7, altitude)

/** Recover cellular texel depth above −3°, easing through civil twilight to zero at −6°. */
export const sheetRecoveryShare = (altitude: number) => smoothstep(-6, -3, altitude)
