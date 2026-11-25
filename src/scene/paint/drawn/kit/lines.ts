/*
 * The keyblock's line table, by how far a plane (or what stands on it) lies: one width for every key line of a tier, so
 * the land, the town and the cuts on them read as one carving that thins with distance. Widths are CSS px.
 */

export type Tier = 'near' | 'far' | 'back'

/** A key line's width (CSS px) by tier. */
export const LINE: Readonly<Record<Tier, number>> = { near: 0.8, far: 0.55, back: 0.4 }

/**
 * A key line's value (Oklab lightness) against the ink of the block it is cut round: sumi stepped toward the block's own
 * colour by distance, never scaled by the air in front of it (the block is in its air already).
 */
export const KEY_STEP: Readonly<Record<Tier, number>> = { near: -0.2, far: -0.13, back: -0.09 }

/** A graver's cut inside a block: thinner than the key line of its tier. */
export const CUT_LINE: Readonly<Record<Tier, number>> = { near: 0.5, far: 0.38, back: 0.3 }
