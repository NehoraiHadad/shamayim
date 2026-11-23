import { devParam } from '../../ui/devParams'
import { isSceneStyle, type SceneStyle } from '../paint/painters'

/** `?style=<id>` forces the scene's hand (dev only; here and not in `ui/devParams`, whose chunk holds no painters). */
export function forcedStyle(): SceneStyle | null {
  const style = devParam('style')
  return isSceneStyle(style) ? style : null
}
