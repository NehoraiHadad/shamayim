/**
 * The lit 2.5D scene (one sun for ridges, marks, disc and clouds) is the default. `?scene=flat` brings back the old
 * flat scene, for comparison or as a quick way out if something looks wrong on a device.
 */
export const SCENE_25D = typeof window === 'undefined'
  || new URLSearchParams(window.location.search).get('scene') !== 'flat'

/**
 * `?view=turn` (any build, a preview of `docs/design/camera-fable.md`): the view turns all the way round, with the place
 * on a stage in front (a camera on a pole behind it) and a compass to turn it. Directions are true: facing south, east
 * is on the left.
 */
export const TURN_VIEW = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('view') === 'turn'
