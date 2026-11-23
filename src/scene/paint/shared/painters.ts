import { paintBirds } from '../birds'
import { paintBodies, paintStars } from '../bodies'
import { paintCanopy } from '../canopy'
import { lightOnly, type SharedPainters } from '../contract'
import { paintFarCities } from '../farCities'
import { paintFlash } from '../flash'
import { paintLandDust } from '../landDust'
import { paintAircraft, paintMeteor } from '../life'
import { paintLoading } from '../loading'
import { paintMarks } from '../marks'
import { paintMilkyWay, paintPlanets, paintTwinkle } from '../nightSky'
import { paintBow } from '../optics'
import { paintPlaneLight } from '../planeLight'
import { paintShimmer } from '../shimmer'
import { paintSky } from '../sky'
import { paintWater } from '../water'
import { paintWearDrip, paintWearItem, paintWearRope } from '../wear'
import { paintFall, paintGrains, paintMist, paintRays, paintSheen, paintSmoke } from '../weather'

/** The painters of the layer kinds every style paints alike. */
export const SHARED: SharedPainters = {
  sky: { form: paintSky },
  stars: { form: paintStars },
  bodies: { form: paintBodies },
  flash: { form: paintFlash },
  shimmer: { form: paintShimmer },
  plane: lightOnly(paintPlaneLight),
  canopy: lightOnly(paintCanopy),
  water: lightOnly(paintWater),
  farCities: lightOnly(paintFarCities),
  marks: lightOnly(paintMarks),
  fall: { form: paintFall },
  mist: lightOnly(paintMist),
  grains: { form: paintGrains },
  landDust: { form: paintLandDust },
  rays: { form: paintRays },
  smoke: lightOnly(paintSmoke),
  sheen: lightOnly(paintSheen),
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
}
