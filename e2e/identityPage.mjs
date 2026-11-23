// The identity check's page: set up before the scene's code runs, and asked afterwards what really painted the shot.
import { resolvedStyle } from './sceneHand.mjs'

/** A shot that is not what was asked for: never compared, and not tried again. */
export class WrongShot extends Error {}

/**
 * In the page, before its code: the composited layers listed, what is asked of the paint workers noted (layer id → styles),
 * and no deadline of a second or more ever struck. The land's files are given up after 5 s (`src/data/land/fineCover.ts`)
 * and the scene drawn without them, so a still would otherwise depend on how busy the machine is.
 */
export function prepare() {
  window.__trackSceneShown = true
  window.__paintJobs = {}
  const post = Worker.prototype.postMessage
  Worker.prototype.postMessage = function (message, ...rest) {
    for (const { id, style } of message?.jobs ?? []) {
      const styles = (window.__paintJobs[id] ??= [])
      if (!styles.includes(style ?? null)) styles.push(style ?? null)
    }
    return post.call(this, message, ...rest)
  }
  const set = window.setTimeout.bind(window), timeout = AbortSignal.timeout
  const NEVER = 2 ** 31 - 1
  window.setTimeout = (run, ms, ...rest) => set(run, ms >= 1000 ? NEVER : ms, ...rest)
  AbortSignal.timeout = (ms) => timeout.call(AbortSignal, ms >= 1000 ? NEVER : ms)
}

/** What painted the settled scene: whether both surfaces still have their worker, its jobs, the style, the layers shown. */
export async function paintedBy(page) {
  const seen = await page.evaluate(() => ({ offThread: window.__scene.offThread, jobs: window.__paintJobs,
    ids: Object.keys(window.__sceneStats.shown) }))
  return { ...seen, style: await resolvedStyle(page) }
}

/**
 * Throws a `WrongShot` unless the shot was painted on the path and in the style the unit asks for. Worker: both surfaces
 * have theirs to the end (a failed one is dropped for good) and each composited layer was asked of one, in the style; main:
 * neither has one and none was asked for anything.
 */
export function assertPaintedBy({ paint, style }, { offThread, jobs, ids, style: shown }) {
  const wrong = (text) => { throw new WrongShot(`not the shot asked for: ${text}`) }
  if (shown !== style) wrong(`style "${style}" asked for, the scene laid in ${shown ? `"${shown}"` : 'an unknown one'}`)
  if (offThread !== (paint === 'worker')) wrong(`paint path "${paint}" asked for, painted ${offThread ? 'in the worker' : 'on the main thread'}`)
  if (paint === 'main' && Object.keys(jobs).length) wrong(`paint path "main" asked for, the worker painted ${Object.keys(jobs)[0]}`)
  if (paint === 'worker') {
    const missed = ids.filter((id) => !jobs[id])
    if (missed.length) wrong(`composited but not painted in the worker: ${missed.join(', ')}`)
    const other = Object.entries(jobs).find(([, styles]) => styles.some((one) => one !== style))
    if (other) wrong(`style "${style}" asked for, the worker painted ${other[0]} in ${other[1].map((one) => `"${one}"`).join(', ')}`)
  }
}
