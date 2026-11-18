/** The page's one quiet status line: offline, what failed to load, or that images are still loading. */
export function overheadStatus({ online, radarFailed, cloudFailed, mapFailed, ready }: {
  online: boolean
  radarFailed: boolean
  cloudFailed: boolean
  mapFailed: boolean
  ready: boolean
}): string {
  if (!online) return 'אין חיבור'
  const failed = [radarFailed && 'מכ״ם', cloudFailed && 'לוויין', mapFailed && 'מפה'].filter(Boolean)
  if (failed.length) return `לא הצלחנו לטעון ${failed.join(' · ')}`
  return ready ? '' : 'טוען תמונות…'
}
