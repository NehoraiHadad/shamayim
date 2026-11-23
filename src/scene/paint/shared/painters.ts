import { paintBirds } from './life/birds'
import { paintBodies, paintStars } from './sky/bodies'
import { paintCanopy } from './land/canopy'
import { lightOnly, type SharedPainters } from '../contract'
import { paintFarCities } from './town/farCities'
import { paintFlash } from './sky/flash'
import { paintLandDust } from './weather/landDust'
import { paintAircraft, paintMeteor } from './life/life'
import { paintLoading } from './weather/loading'
import { paintMarks } from './town/marks'
import { paintMilkyWay, paintPlanets, paintTwinkle } from './sky/nightSky'
import { paintBow } from './sky/optics'
import { paintPlaneLight } from './land/planeLight'
import { paintShimmer } from './sky/shimmer'
import { paintSky } from './sky/sky'
import { paintWater } from './land/water'
import { paintWearDrip } from './wear/drip'
import { paintWearItem } from './wear/item'
import { paintWearRope } from './wear/rope'
import { paintFall } from './weather/fall'
import { paintGrains } from './weather/grains'
import { paintMist } from './weather/mist'
import { paintRays } from './weather/rays'
import { paintSheen } from './weather/sheen'
import { paintSmoke } from './weather/smoke'

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
