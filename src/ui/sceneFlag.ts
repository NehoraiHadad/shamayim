/**
 * The lit 2.5D scene (one sun for ridges, marks, disc and clouds) is the default. `?scene=flat` brings back the old
 * flat scene, for comparison or as a quick way out if something looks wrong on a device.
 */
export const SCENE_25D = typeof window === 'undefined'
  || new URLSearchParams(window.location.search).get('scene') !== 'flat'

