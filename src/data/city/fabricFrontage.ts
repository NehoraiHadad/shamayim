/**
 * The width (px) of a roof `heightM` high, whose `footprint` is its cell's true width on the screen: a house keeps the
 * legible house's (`house`); above the house's height (`houseTopM`) the width grows with the height towards the mapped
 * building's frontage (`mapped`, no more than its height, on the same plan scale), full at twice that height, so it never
 * jumps.
 */
export function fabricFrontage(footprint: number, house: number, mapped: number, heightM: number, houseTopM: number) {
  const block = Math.max(0, Math.min(1, heightM / houseTopM - 1))
  const houseWidth = Math.max(footprint, house)
  return houseWidth + block * (Math.max(houseWidth, mapped) - houseWidth)
}
