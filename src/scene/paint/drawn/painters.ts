import { lightOnly, type Painters } from '../contract'
import { SHARED } from '../shared/painters'
import { paintDrawnBodies } from './bodies'
import { paintDrawnCanopy } from './canopy'
import { paintDrawnCells } from './cloudTower'
import { paintDrawnSheet } from './cloudSheet'
import { paintDrawnPlane } from './plane'
import { paintDrawnEdge, paintDrawnShafts } from './rain'
import { paintDrawnSky } from './sky'
import { paintDrawnOutside } from './town'
import { paintDrawnWater } from './water'

/** The drawn hand's painters: the sky and the sun, the land, its water, trees and town, the towers and their rain as a woodblock print; cloud sheets as an illustrator masses them. */
export const DRAWN_PAINTERS: Painters = {
  ...SHARED,
  sky: { form: paintDrawnSky },
  bodies: { form: paintDrawnBodies },
  cloudSheet: { form: paintDrawnSheet },
  cloudCells: { form: paintDrawnCells },
  shafts: { form: paintDrawnShafts },
  edge: { form: paintDrawnEdge },
  plane: lightOnly(paintDrawnPlane),
  canopy: lightOnly(paintDrawnCanopy),
  water: lightOnly(paintDrawnWater),
  outside: lightOnly(paintDrawnOutside),
}
