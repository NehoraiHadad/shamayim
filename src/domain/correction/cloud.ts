import type { ModelPair } from '../blend'
import { smoothstep } from '../smoothstep'
import { lowCloudModel, totalCloudModel, type CloudResidualModel } from './cloudTables'

/** The half-strength correction reduced cover error with fewer false cloudy hours than the full fit. */
const CALIBRATION_SHARE = 0.5

export interface CloudAdjustment {
  cover: number
  low: number
}

interface CloudInputs {
  cover: ModelPair<number>
  low: ModelPair<number>
  mid: ModelPair<number>
  high: ModelPair<number>
  rain: ModelPair<number>
}

/** Use the preceding hourly anchor for interpolation. Fade into the base blend from three to six hours ahead. */
export function cloudCalibrationWeight(leadMinutes: number): number {
  return (leadMinutes < -60 ? 0 : 1 - smoothstep(180, 360, leadMinutes)) * CALIBRATION_SHARE
}

function predict(model: CloudResidualModel, features: readonly number[]): number {
  let value = model.bias
  for (const tree of model.trees) {
    let node = tree[0]
    while (typeof node !== 'number') {
      const [feature, threshold, left, right] = node
      node = tree[features[feature] <= threshold ? left : right]
    }
    value += node
  }
  return value
}

/** Apply the same features and units as build_cloud_calibration.py. Hourly precipitation is in mm. */
export function cloudAdjustment(input: CloudInputs, localHour: number, utcOffsetSeconds: number,
  weight: number): CloudAdjustment | null {
  const { cover, low, mid, high, rain } = input
  const fields = [cover, low, mid, high, rain]
  const readings = [...fields.map((f) => f.icon), ...fields.map((f) => f.ecmwf)]
  if (!readings.every((v): v is number => v !== null && Number.isFinite(v))) return null

  const [iconCover, iconLow, , , , ifsCover, ifsLow] = readings
  const gap = iconCover - ifsCover
  const lowGap = iconLow - ifsLow
  const lowExcess = Math.min(Math.max(lowGap, 0), Math.max(gap, 0))
  const influence = (1 - smoothstep(5, 15, ifsCover)) * smoothstep(15, 30, gap)
    * smoothstep(0.55, 0.80, lowExcess / Math.max(gap, 1))
  const utcHour = (localHour - utcOffsetSeconds / 3600 + 24) % 24
  // The training set uses the latest forecast only, with its long-lead feature held at zero.
  const features = [...readings, 0.4 * lowExcess * influence, gap, lowGap, 0, Number(utcHour >= 7 && utcHour < 15)]
  return { cover: weight * predict(totalCloudModel, features), low: weight * predict(lowCloudModel, features) }
}

/** The low layer is a subset of total cover. Missing samples still use the ordinary blend. */
export function applyCloudAdjustment(cover: number | null, low: number | null, adjustment?: CloudAdjustment | null) {
  if (!adjustment || cover === null || low === null) return { cover, low }
  const total = Math.min(100, Math.max(0, cover + adjustment.cover))
  return { cover: total, low: Math.min(total, Math.max(0, low + adjustment.low)) }
}
