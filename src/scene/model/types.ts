/**
 * The scene model (docs/design/CANVAS-SCENE-PLAN.md §1b): what is drawn, where, in which colour and order, decided
 * from the world state alone. Pure data: no canvas, no DOM. Painters (`scene/paint/`) only add the hand.
 *
 * Coordinates: sky layers in sky px (the sky surface's box, `0…box.width × 0…box.skyHeight`); land layers in scene px
 * (the figure's box, `0…box.width × 0…box.landHeight`; the world's 375 px reference width scaled by `box.width`, heights
 * as they are). The sky's horizon is the land's eye level offset by `box.landTop`. Colours are sRGB 0–1.
 *
 * A types-only barrel: each subject's shapes and its layers are in `layers/`.
 */
export type { GlyphKind, IconKind } from '../../world/glyphSpecs'
export type { BirdKind } from '../../world/life'
export type { Pt, RGB } from '../../world/types'
export type { CityTier } from './cityMass'
export type * from './layers/base'
export type * from './layers/motion'
export type * from './layers/sky'
export type * from './layers/skyLife'
export type * from './layers/cloud'
export type * from './layers/weather'
export type * from './layers/land'
export type * from './layers/water'
export type * from './layers/town'
export type * from './layers/outside'
export type * from './layers/wear'
export type * from './layers/scene'
