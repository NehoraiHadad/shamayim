import path from 'node:path'
import { root } from '../../../../e2e/harness.mjs'

/** A Vite plugin: the registry's drawn painters, and the sky's base (on the canvas, not a CSS gradient), from this folder. */
export function swapIn(as, tree) {
  const proto = path.join(tree, 'docs/design/prototypes/drawn')
  return {
    name: 'drawn-prototype',
    enforce: 'pre',
    config: () => ({ server: { fs: { strict: false } } }),
    resolveId(source, importer = '') {
      const from = importer.split('?')[0].replaceAll('\\', '/')
      // Packages come from this checkout: another tree has none of its own.
      if (/^[@a-z]/i.test(source) && !path.isAbsolute(source) && tree !== root) return this.resolve(source, path.join(root, 'index.html'), { skipSelf: true })
      if (as !== 'concept' || from.includes('/prototypes/drawn/')) return null
      if (source === './drawn/painters') return path.join(proto, 'painters.ts')
      if (source.endsWith('/sky/skyBackground') || source.endsWith('/sky/skyBackground.ts')) return path.join(proto, 'skyBase.ts')
      return null
    },
  }
}
