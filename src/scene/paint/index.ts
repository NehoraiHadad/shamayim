import type { LayerDesc, LayerKind, LayerOf } from '../model/types'
import type { Ctx2D, PaintEnv } from './hand'
import { paintBodies, paintStars } from './bodies'
import { paintFlash } from './flash'
import { paintShimmer } from './shimmer'
import { paintCloudSheet } from './cloudSheet'
import { paintCloudShadow } from './cloudShadows'
import { paintCanopy, paintCanopyLight } from './canopy'
import { paintLandDust } from './landDust'
import { paintCloudCells } from './cloudCells'
import { paintFarCities } from './farCities'
import { paintLoading } from './loading'
import { paintMarks } from './marks'
import { paintOutside } from './outside'
import { paintPlaneLight } from './planeLight'
import { paintPlane } from './planes'
import { paintSky } from './sky'
import { paintWater } from './water'
import { paintBirds } from './birds'
import { paintAircraft, paintMeteor } from './life'
import { paintMilkyWay, paintPlanets, paintTwinkle } from './nightSky'
import { paintBow } from './optics'
import { paintWearDrip, paintWearItem, paintWearRope } from './wear'
import { paintShafts } from './curtain'
import { paintEdge, paintFall, paintGrains, paintMist, paintRays, paintSheen, paintSmoke } from './weather'

export { HAND, type Ctx2D, type Hand, type PaintEnv, type Scratch } from './hand'

/** A layer's painters: its form, and its light part when it has one (§1d, the scrub split). */
export interface Painter<K extends LayerKind = LayerKind> {
  form: (ctx: Ctx2D, desc: LayerOf<K>, env: PaintEnv) => void
  light?: (ctx: Ctx2D, desc: LayerOf<K>, env: PaintEnv) => void
  /**
   * The form draws nothing while there is a light part (a layer that is all light: the far towns, the water but for its
   * datum): the surface lays the light canvas alone, sparing a blit of an empty canvas every frame.
   */
  formless?: (desc: LayerOf<K>) => boolean
}

type Painters = { [K in LayerKind]?: Painter<K> }

/** The form of a layer that is all light (water, far towns): only its place, nothing drawn. */
const paintNothing = () => {}

/** One painter per layer kind; kinds without one yet (drawn from C2 on) are skipped. */
export const PAINTERS: Painters = {
  sky: { form: paintSky },
  stars: { form: paintStars },
  bodies: { form: paintBodies },
  flash: { form: paintFlash },
  shimmer: { form: paintShimmer },
  plane: { form: paintPlane, light: paintPlaneLight },
  canopy: { form: paintCanopy, light: paintCanopyLight },
  water: { form: paintNothing, light: paintWater, formless: () => true },
  farCities: { form: paintNothing, light: paintFarCities, formless: () => true },
  marks: { form: paintNothing, light: paintMarks, formless: () => true },
  outside: { form: paintNothing, light: paintOutside, formless: () => true },
  shafts: { form: paintShafts },
  fall: { form: paintFall },
  mist: { form: paintNothing, light: paintMist, formless: () => true },
  grains: { form: paintGrains },
  landDust: { form: paintLandDust },
  rays: { form: paintRays },
  smoke: { form: paintNothing, light: paintSmoke, formless: () => true },
  sheen: { form: paintNothing, light: paintSheen, formless: () => true },
  edge: { form: paintEdge },
  loading: { form: paintLoading },
  birds: { form: paintBirds },
  aircraft: { form: paintAircraft },
  meteor: { form: paintMeteor },
  planets: { form: paintPlanets },
  twinkle: { form: paintTwinkle },
  milkyWay: { form: paintMilkyWay },
  bow: { form: paintBow },
  wearRope: { form: paintWearRope },
  wearItem: { form: paintWearItem },
  wearDrip: { form: paintWearDrip },
  cloudShadow: { form: paintCloudShadow },
  cloudSheet: { form: paintCloudSheet },
  cloudCells: { form: paintCloudCells },
}

export function painterOf(desc: LayerDesc): Painter | undefined {
  return PAINTERS[desc.kind] as Painter | undefined
}
