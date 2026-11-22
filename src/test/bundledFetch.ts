import fs from 'node:fs'
import path from 'node:path'
import { vi } from 'vitest'
import * as landGrid from '../data/land/grid'

const root = path.resolve(__dirname, '../..')
// Cache parsed public data across places while using the same fixture fetch interface.
const jsonCache = new Map<string, unknown>()
const MISSING = Symbol('missing')
function stubPublicJson() {
  vi.stubGlobal('document', { hidden: false })
  vi.stubGlobal('fetch', async (url: string) => {
    const clean = url.replace(/^\//, '')
    let data = jsonCache.get(clean)
    if (data === undefined) {
      const full = path.join(root, 'public', clean)
      data = fs.existsSync(full) ? JSON.parse(fs.readFileSync(full, 'utf8')) : MISSING
      jsonCache.set(clean, data)
    }
    if (data === MISSING) return { ok: false, status: 404, json: async () => ({}) } as Response
    return { ok: true, status: 200, json: async () => data } as Response
  })
}

export function stubCachedPublicFetch() {
  stubPublicJson()
  const decode = landGrid.decodeLand
  const decoded = new Map<string, ReturnType<typeof decode>>()
  vi.spyOn(landGrid, 'decodeLand').mockImplementation(key => {
    const cached = decoded.get(key)
    if (cached) return cached
    const grid = decode(key)
    decoded.set(key, grid)
    return grid
  })
}


