/** The hand the scene is painted with: one world, one model, two painters' hands. Temporary, until the users' vote decides. */
export type SceneStyle = 'real' | 'drawn'
export const SCENE_STYLES: readonly SceneStyle[] = ['real', 'drawn']

export const isSceneStyle = (value: unknown): value is SceneStyle => SCENE_STYLES.includes(value as SceneStyle)
