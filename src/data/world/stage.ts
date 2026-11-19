import { SKY_PX } from '../terrain/angleScale'

/**
 * The stage: the place itself seen from a camera on a pole a little behind it and above (option A2,
 * `docs/design/camera-fable.md`). Only what lies within `reachM` of the place is seen from the pole; the land beyond,
 * the sky, the sun and the moon stay seen from the place's own eye (2 m up), so every sunrise and sunset is still
 * the one people there see.
 *
 * The stage is drawn on the sky's true scale (no relief stretch): the village is close, so its angles are large and
 * real; stretched, it would fall off the bottom of the scene.
 */
export const POLE = {
  /** How far behind the place the pole stands (m). */
  backM: 200,
  /** How high the camera is above the place's ground (m). */
  upM: 25,
  /** Ground nearer the place than this (m) belongs to the stage; beyond it is the horizon panorama. */
  reachM: 400,
}

/**
 * px a radian on the stage: the camera's own scale across, used up and down too, so houses keep their true shape.
 * (The sky keeps its own scale, `SKY_PX`; the stage is near and its angles are real.)
 */
export const stagePxPerRad = (pxPerDeg: number) => (pxPerDeg * 180) / Math.PI

/** Eye level for a turning view: one y for every heading, leaving room for the stage under it. */
export const STAGE_HORIZON_Y = 84

export interface Stage {
  /** y of the place itself (the dot, the middle of the village). */
  y: number
  /** y of the stage's far edge (`reachM` beyond the place): the ground nearer than that hides the land behind it. */
  farY: number
  /** px a metre across the stage at the place's distance (for sizing the village). */
  pxPerM: number
  /** y of ground `m` metres beyond the place (negative: in front of it, toward the pole). */
  groundY: (m: number) => number
}

export function stageAt(horizonY: number, pxPerRad = SKY_PX): Stage {
  /** px below eye level of ground `m` ahead of the pole. */
  const groundPx = (m: number) => pxPerRad * Math.atan2(POLE.upM, m)
  return {
    y: horizonY + groundPx(POLE.backM),
    farY: horizonY + groundPx(POLE.backM + POLE.reachM),
    pxPerM: pxPerRad / POLE.backM,
    groundY: (m: number) => horizonY + groundPx(Math.max(1, POLE.backM + m)),
  }
}
