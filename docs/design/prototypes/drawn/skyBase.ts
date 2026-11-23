import type { LayerDesc } from '../../../../src/scene/model/types'

/** The prototype paints the sky's base on the canvas (bands of paint have edges): no CSS background. */
export const skyBackground = () => 'none'
export const onSkyCanvas = (layers: readonly LayerDesc[]) => [...layers]
