import type { WorldState } from '../types'
import { benchmark } from './benchmark'
import { groundLine } from './groundLine'
import { inscription } from './inscription'
import { captionScene, type CaptionScene } from './scene'
import type { Caption, CaptionOption } from './types'

const OPTIONS: Record<CaptionOption, (scene: CaptionScene) => Caption> = { a: inscription, b: groundLine, c: benchmark }

/** The world with its height told by one of the options, in place of the badge (dev switch; null leaves it as it is). */
export function withCaption(world: WorldState, option: CaptionOption | null): WorldState {
  const scene = option && captionScene(world)
  if (!option || !scene) return world
  const caption = OPTIONS[option](scene)
  return { ...world, labels: { ...world.labels, height: { ...world.labels.height, x: caption.x, y: caption.y, caption } } }
}
