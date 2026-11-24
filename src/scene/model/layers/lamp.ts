export type LampKind = 'cloudSheet' | 'plane' | 'canopy' | 'water'

export type LampPlace = { x: number; y: number; domeY: number; altitude: number }

export type Lamp = LampPlace & {
  body: 'sun' | 'moon'
  strength: number
  /** The twilight sun's place when the moon is the lamp. Read `lamp.sun ?? lamp` for under-lighting. */
  sun?: LampPlace
}
