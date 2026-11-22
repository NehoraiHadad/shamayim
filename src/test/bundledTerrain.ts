/** Flat datum for explicitly labelled offline fixtures without a recorded panorama. */
export const FLAT_ELEV_M = 100

import { computePanorama, LOCAL_REACH_KM, LOCAL_STEP_KM, type Panorama } from '../data/terrain/panorama'

export function makeFlatPanorama(elevM: number): Panorama {
  const pano = computePanorama(() => elevM, elevM)
  const n = 2 * Math.round(LOCAL_REACH_KM / LOCAL_STEP_KM) + 1
  pano.local = { stepKm: LOCAL_STEP_KM, n, heights: new Array<number>(n * n).fill(elevM) }
  return pano
}

export function classify(counts: { synagogue: number; minaret: number; church: number }): string {
  const { synagogue: s, minaret: m, church: c } = counts
  if (s >= 1 && m === 0 && c === 0) return 'synagogue-only'
  if (s === 0 && m >= 1 && c === 0) return 'mosque-only'
  if (s === 0 && m === 0 && c >= 1) return 'church-only'
  if (s === 0 && m >= 1 && c >= 1) return 'mosque+church'
  if (s >= 1 && (m >= 1 || c >= 1)) return 'mixed'
  return 'none'
}

