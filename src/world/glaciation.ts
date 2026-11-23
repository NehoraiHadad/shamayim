/** The heights (km above the place's ground) between which a cumulonimbus's top turns from water to ice. */
export interface Glaciation {
  /** The top's droplets begin to freeze in number: its edges blur and it begins to spread. */
  fromKm: number
  /** No supercooled water is left: the whole top is ice, a full anvil. */
  fullKm: number
}

/**
 * Over the freezing level (km): at the moist lapse of a storm's core (~6.5 K/km) droplets freeze in number near −20 °C,
 * about 3 km over it, and by themselves at −38 °C, about 6 km over it.
 */
const FREEZES = 3, ALL_ICE = 6

/** From the model's freezing level (m above sea level); null when it gives none. */
export const glaciationOf = (freezingLevelM: number | null | undefined, groundM: number): Glaciation | null => {
  if (freezingLevelM == null) return null
  const zeroKm = (freezingLevelM - groundM) / 1000
  return { fromKm: zeroKm + FREEZES, fullKm: zeroKm + ALL_ICE }
}
