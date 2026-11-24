// Water keeps the original 2.5 px roof clearance. Layer bounds add their
// own paint bleed. Badge placement must also clear the drawn 2.8 px tile ridge.
export const WATER_ROOF_CLEARANCE = 2.5
export const BUILDING_ROOF = 3
export const BUILDING_EAVE = .5
// Allow the tower's crown trim and the tree canopy's top detail.
export const TOWER_CROWN = 4
// The painters share the existing mast dimensions and retain their podium widths.
export const towerMastHeight = (h: number) => Math.min(5, 1.5 + h * .08)
export const DRAWN_PODIUM_OVERHANG = 1.2
export const REAL_PODIUM_OVERHANG = 1.1
export const TOWER_PODIUM_OVERHANG = Math.max(DRAWN_PODIUM_OVERHANG, REAL_PODIUM_OVERHANG)
export const TREE_CROWN = 1
