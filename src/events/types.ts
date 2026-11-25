import type { HourPoint, LocalTime } from '../domain/types'
import type { Covers } from '../world/clouds'

/*
 * Special events (the one quiet line on the page): any kind of event worth a look, at the shown place, on the device. A
 * detector offers candidates; one rule for all (`seen.ts`) drops what the place will not see and gives the rest one shape;
 * the best viewing prospects take priority, then rarity.
 */

export interface Direction { azimuth: number; altitude: number }

/** `at`: a moment; `from`: from then on; `span`: between the two. */
export type Tell = 'at' | 'from' | 'span'
export type Viewing = 'expected' | 'cloud-dependent' | 'weather-dependent'

/** What every event comes to: what, when, where to look, how rare. */
export interface SpecialEvent {
  /** In the reader's words ("צדק ליד הירח"). */
  what: string
  /** Wall clock at the place. */
  when: { from: LocalTime; to: LocalTime; tell: Tell }
  where: Direction
  viewing: Viewing
  /** About how many times a year the place could see one: the fewer, the rarer. */
  perYear: number
}

/** An event as a detector knows it, before the place's land, light and clouds are asked. Instants in ms. */
export interface Candidate {
  what: string
  perYear: number
  from: number
  to: number
  /** Minutes between looks (10 when not given). */
  stepMin?: number
  /** Shorter than this in sight (minutes), it is not told. */
  leastMin?: number
  /** Where it stands at an instant, and how good a moment it is (the more the better); null: not then. */
  at: (ms: number) => (Direction & { score?: number }) | null
  /** Seen only with the sun under this altitude (deg). */
  sunBelow?: number
  /** Seen only while the thick (low and mid) cloud, or all of it, covers at most this share. */
  cloud?: { thick?: number; all?: number }
  /** The forecast suggests the phenomenon itself, not just the conditions for seeing it. */
  weatherDependent?: boolean
  /** `at` tells the best moment, `from` the first seen one, `span` the first run of seen ones. */
  tell: Tell
}

/** The sky over the place from now to the next sunrise. */
export interface EventSky {
  place: { lat: number; lon: number; timezone: string }
  from: number
  to: number
  /** The night in it (or that it is in): sunset to sunrise. */
  night: { from: number; to: number }
  /** The town's own sky glow (`world/placeEnv.ts`). */
  glow: number
  hourAt: (ms: number) => HourPoint | null
  coversAt: (ms: number) => Covers | null
  /** Whether a direction stands clear of the land round the place. */
  clear: (direction: Direction) => boolean
  sunAt: (ms: number) => Direction
  moonAt: (ms: number) => Direction
}

export type Detector = (sky: EventSky) => Candidate[]
