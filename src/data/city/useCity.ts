import { useEffect, useMemo, useState } from 'react'
import type { Place } from '../../config/place'
import { COLUMN_COUNT } from './columns'
import { loadCity } from './cityData'
import type { CityColumns, CityTower } from './types'

const MONTH = 30 * 24 * 60 * 60 * 1000
const cacheKey = (id: string) => `shamayim:city:v3:${id}`

function validTower(tower: CityTower | null) {
  return tower && [tower.dx, tower.dy, tower.lat, tower.lon, tower.heightM].every(Number.isFinite) &&
    tower.heightM > 0 && [0, 1, 2].includes(tower.wClass) &&
    (tower.name === undefined || typeof tower.name === 'string')
}

function readCache(id: string): CityColumns | null {
  try {
    const cache = JSON.parse(localStorage.getItem(cacheKey(id)) ?? 'null')
    const columns = cache?.columns as CityColumns | undefined
    if (columns && Date.now() - cache.at < MONTH && Number.isFinite(columns.west) &&
      Number.isFinite(columns.span) && columns.span > 0 && columns.rows?.length === 3 &&
      Array.isArray(columns.towers) && columns.towers.every(validTower) &&
      columns.rows.every(row => Array.isArray(row) && row.length === COLUMN_COUNT &&
        row.every(bin => Number.isFinite(bin?.built) && Number.isFinite(bin.levels) && Number.isFinite(bin.upper)))) return columns
  } catch { /* Storage can be unavailable or cleared. */ }
  return null
}

export function useCity({ id, lat, lon }: Place) {
  const cached = useMemo(() => readCache(id), [id])
  const [loaded, setLoaded] = useState<{ id: string; columns: CityColumns } | null>(null)
  useEffect(() => {
    if (cached) return
    const controller = new AbortController()
    const run = () => void loadCity({ lat, lon }, controller.signal).then(columns => {
      if (!columns || controller.signal.aborted) return
      try { localStorage.setItem(cacheKey(id), JSON.stringify({ at: Date.now(), columns })) }
      catch { /* Keep the result in memory. */ }
      setLoaded({ id, columns })
    }).catch(() => { /* The scene uses the settlement fallback. */ })
    const idle = window.requestIdleCallback?.(run, { timeout: 2_000 })
    if (idle == null) run()
    return () => {
      controller.abort()
      if (idle != null) window.cancelIdleCallback?.(idle)
    }
  }, [id, lat, lon, cached])
  return loaded?.id === id ? loaded.columns : cached
}
