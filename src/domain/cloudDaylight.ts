import { smoothstep } from './smoothstep'

/** Between the sky palette's 3° twilight and 7° daylight anchors. */
export const daylitShare = (altitude: number) => smoothstep(3, 7, altitude)
