/** V2b prototype (dev only, never merged): shared shapes. Positions are km east / north of the place point. */
export interface Spot { dx: number; dy: number }

/** A built cover cell of the own group, with the houses the city raster's built share says it holds. */
export interface GroupCell extends Spot { row: number; col: number; houses: number; known: boolean; outline: boolean; seed: number }

/** One drawn house: its true spot and its real frontage across the view (m). Its height is asked of the raster later. */
export interface ProtoHouse extends Spot { frontM: number; seed: number }

/** A footprint of the build-time file: long and short side (m), angle of the long side from east (deg, 0 to 180). */
export interface Footprint extends Spot { long: number; short: number; angle: number }

/** Metres: the country's typical house side (V1: 13.3 at Karmei Tzur, 13.8 at Nahalal). */
export const HOUSE_M = 13.5
