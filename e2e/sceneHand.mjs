// The scene's hand (style) as a page of a tree really has it: the ids its registry knows, and the one it painted with. Read
// without any hook of the page's own, so a tree from before this file answers too.
import fs from 'node:fs'
import path from 'node:path'

/** Where a tree lists its styles (`SCENE_STYLES`): the painters' registry, and its place before their split. */
const REGISTRIES = ['src/scene/paint/painters.ts', 'src/scene/sceneStyle.ts']

/** The style ids a tree's page supports, from the module the page itself loads (`page`: any page of the tree's origin). */
export async function supportedStyles(page, treeRoot) {
  const registry = REGISTRIES.find((file) => fs.existsSync(path.join(treeRoot, file)))
  if (!registry) throw new Error(`no style registry in ${treeRoot} (${REGISTRIES.join(', ')})`)
  return page.evaluate(async (url) => [...(await import(url)).SCENE_STYLES], `/${registry}`)
}

/**
 * The style the scene was laid in (null where it cannot be told): the one its sky canvas was given, read from React's tree.
 * Both surfaces are given the one value (`sceneHarness.tsx`), and an id the page does not know falls back to the default's.
 */
export const resolvedStyle = (page) => page.evaluate(() => {
  for (const canvas of document.querySelectorAll('canvas')) {
    const key = Object.keys(canvas).find((name) => name.startsWith('__reactFiber$'))
    for (let fiber = canvas[key]; fiber; fiber = fiber.return) {
      const style = fiber.memoizedProps?.size?.style
      if (style) return style
    }
  }
  return null
})

/** Throws unless the scene was laid in the style asked for. */
export async function assertStyle(page, asked) {
  const style = await resolvedStyle(page)
  if (style !== asked) throw new Error(`style "${asked}" was asked for, but the scene was laid in ${style ? `"${style}"` : 'an unknown one'}`)
}
