/** Keep house spacing through the roof transition and reach full block frontage at twice that height. */
export function fabricFrontage(footprint: number, house: number, mapped: number, heightM: number, houseTopM: number) {
  const block = Math.max(0, Math.min(1, heightM / houseTopM - 1))
  const houseWidth = Math.max(footprint, house)
  return houseWidth + block * (Math.max(houseWidth, mapped) - houseWidth)
}

/** The established house spacing follows the apparent row pitch, with a pixel-scale legibility floor. */
export const houseRowPitch = (height: number) => Math.max(1.2, .6 * height)
