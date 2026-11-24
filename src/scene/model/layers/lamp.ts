export type LampKind = 'cloudSheet' | 'plane' | 'water'

export type LampPlace = { x: number; y: number; domeY: number; altitude: number }

/** On a wind-carried layer such as cloudSheet, the lamp gives the minute's direction.
 * A glow must not be centred on the disc there because the pixels drift by up to a minute of wind. */
export type Lamp = LampPlace & {
  body: 'sun' | 'moon'
  /** The ground's direct beam after every deck, zero at dusk. A veil uses its own lit values. */
  strength: number
  /** For solar under-lighting, read `lamp.sun ?? (lamp.body === 'sun' ? lamp : undefined)`. */
  sun?: LampPlace
}
