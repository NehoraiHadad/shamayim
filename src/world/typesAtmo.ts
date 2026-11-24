import type { Relief } from '../data/terrain/angleScale'
import type { SkyLight } from '../theme/skyLight'
import type { Mist } from './mist'

/** Atmosphere, celestial body, light, wind, cloud and precipitation types for `WorldState`. */
export type RGB = readonly [number, number, number]
export type Pt = readonly [number, number]

/** Angle → y, shared by land and sky: the vertical scale (`RELIEF`) above eye level. */
export interface WorldRelief {
  scale: Relief
  /** y of eye level (0°): the panorama's, or the guess while the land is unknown (`UNKNOWN_EYE_Y`). */
  horizonY: number
  /** y of an (apparent) altitude above eye level. */
  y: (altitude: number) => number
}

export interface Body {
  azimuth: number; altitude: number; x: number; y: number; up: boolean; overLand: boolean
  /** How far (scene px) it stands over the land in its direction, negative behind it (the sun's, `sunBody`). */
  clearance?: number
  /** Share of its true disc over the drawn land (0–1; `livingLight.ts` `discShare`). */
  visible?: number
}

export interface MoonBody extends Body {
  /** 0 new … 0.5 full … 1 new; lit fraction 0–1; screen angle (deg) from moon toward sun. */
  phase: number; illumination: number; tilt: number
}

export interface Light {
  /** sky: overcast, twilight or night with no direct light worth a shadow side. */
  source: 'sun' | 'moon' | 'sky'
  /** Of the source (the sun's for 'sky'). */
  azimuth: number
  altitude: number
  /** Signed lateral direction (negative left, positive right), attenuated by the direct-light shading ramp. */
  across: number
  /** The light's direction in drawn space, [across, up], as the ridge lighting takes it; null for 'sky'. */
  ray: [number, number] | null
  /** Direct light after air mass and aerosol (`sceneLight.ts`); the moon's is cool and dim. */
  colour: RGB
  /** 0–1: beam reaching the observer along the disc ray. */
  eye: number
  /** 0–1: what the field's cloud lets through along each disc's own ray to the eye, while it is up (1 with no field). */
  through: { sun: number; moon: number }
  /** Mean cloud transmission at half depth for the sky glows and disc veils. */
  clear: number
  /** Sun and moon illuminance after mean cloud transmission. */
  meanBeam: { sun: number; moon: number }
  /** 0–1: land's base light after haze and closed decks. */
  direct: number
  /** The direct share of each source (their sum is `direct`; one of them is 0 at any minute). */
  shares: { sun: number; moon: number }
  /** Light direction in view frame (`livingLight.ts` `viewDir`), toward the source giving the direct share. */
  dir: { across: number; ahead: number; up: number }
  /** 0 clear … 1 overcast: how much of the light is the sky's (soft, nearly directionless shading under a deck). */
  diffuse: number
  /** Sky light on shade faces (the sky's mid tone). */
  ambient: RGB
  /** Cast shadows: `dx` across per unit of height (−1…1, away from the light), length per unit of height, softness 1 = none. */
  shadow: { dx: number; length: number; softness: number }
  /** Toward noon (1) the light comes from above and the faces even out (`ridgeLighting.ts`). */
  noonWeight: number
  /** Where the crest rim is lit (scene px): under the sun, or under the twilight glow; null when nothing is. */
  rimX: number | null
  /** The glow behind the ridge round sunrise and sunset (`twilight.ts`), where the sun crosses the land. */
  glow: { side: 'east' | 'west'; opacity: number; x: number; y: number } | null
  /** Clouds still lit after sunset / before sunrise (`afterglow.ts`). */
  afterglow: { x: number; altitude: number; rgb: RGB } | null
  /** The sky's palette at this light (`theme/skyLight.ts`), the tones the ridge tones are mixed from. */
  palette: SkyLight
}

export interface Air {
  /** Horizontal visibility (km, 1–40), dust folded in. */
  visibilityKm: number
  humidity: number | null
  /** Coarse dust share (0–1), eased over concentrations of 40–60 µg/m³. */
  dustWeight: number
  /** Fraction of aerosol depth assigned to the sunlit dust veil at full daylight (0–1). */
  dustVeilPotential?: number
  /** The colour far planes fade toward. */
  haze: RGB
  /** Aerial perspective: 0 near … 1 lost, Koschmieder from `visibilityKm` (contrast 2 % at the visibility). */
  fade: (km: number) => number
  /** The fades of the far and near planes (`world/airParts.ts` `haze`), for tones carried over from the SVG scene. */
  farFade: number
  nearFade: number
  horizonBand: { rgb: RGB; alpha: number }
  /** Shallow valley/ground mist and fog (radiation vs persistent, 0–1; `mist.ts`). */
  mist: Mist
  /** Heat shimmer amplitude (px). */
  heat: number
}

export type CloudLevel = 'low' | 'mid' | 'high'

export interface CloudBank {
  id: string; azimuth: number
  /** Altitude (deg) of the bank's base as seen from the place. */
  altitude: number
  /** Angular width and height (deg). */
  w: number; h: number; distanceKm: number; puffs: number; seed: number
  /** A cloud the satellite saw near the place (`cloudSightings.ts`). */
  seen?: boolean
  /** How much of it has formed (0–1): the newest bank of a growing cover gathers as the cover grows (`banksOf`). */
  share?: number
}

export interface CloudLayer {
  level: CloudLevel
  /** 0–1 of the sky. */
  cover: number; baseM: number
  /** Seeded banks round the whole horizon (not only the view), so rain and edge marks keep their true direction. */
  banks: CloudBank[]
  /** Scene px/s across, signed like `wind.across`, from the wind at this level. */
  drift: number
  /** 0–1: a low sun lights the undersides. */
  litUnderside: number
  /** This layer makes the rain. */
  rains: boolean
}

export interface RainCell { fromAzimuth: number; toAzimuth: number; bank: string }

/** A rain shaft from the cloud field: its ground spot and radius (km), the cloud it falls from and how much reaches down. */
export interface FieldRainCell extends RainCell {
  level: CloudLevel; x: number; y: number; radiusKm: number; share: number; virga: number; atEye: boolean
  baseKm: number; cloudX: number; cloudY: number; seed: number
}

export interface Rain {
  rateMmH: number
  /** Shafts from the raining layer, at their true azimuths. */
  cells: FieldRainCell[]
  near: boolean
  /** Rad from vertical, signed like `wind.across` (rain falls toward where the wind goes). */
  slant: number
  thunder: boolean
  thunderWeight: number
}

/** Snow falling (C7): from the precipitating layer's banks, at their true azimuths, carried by the one wind. */
export interface Snowfall { amount: number; cells: RainCell[]; slant: number }

export interface Wind {
  /** Where the 10 m wind comes from (deg) and where it goes. */
  fromDeg: number; towardDeg: number; ms: number; gustMs: number
  /** −1…1: + moves left → right on screen (camera-aware: the direction it goes, through `lateral`). */
  across: number
  /** m/s at each cloud level. */
  aloft: Record<CloudLevel, number>
  /** Across (−1…1) at each cloud level: the wind aloft may turn from the 10 m wind. */
  aloftAcross: Record<CloudLevel, number>
}

export interface Night {
  litShare: number; starsThrough: number; dark: number; aviation: boolean
}
