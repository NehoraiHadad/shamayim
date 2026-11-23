// Which layers of a scene are shown alone, and the `hide=` list (`src/dev/hideLayers.ts`: id prefixes) that leaves each.

/** Families shown together: many small spots of one painter. */
const FAMILIES = ['twinkle', 'meteor', 'flash', 'birds', 'aircraft']
/** The sky's base is CSS, not a composited layer, so the page's list of shown layers never names it. */
const BASE = 'sky'

const groupOf = (id) => {
  const family = id.split('.')[0]
  return FAMILIES.includes(family) ? `${family}.` : id
}

/**
 * The parts of a scene whose composited layers are `ids` (`window.__sceneStats.shown`, of both trees): each layer (or
 * family) alone, `hide` leaving only it; and `unlisted`, everything the list does not name (the falling rain and snow, the
 * contrails), so together the parts leave no layer out. A layer whose id begins another's stays
 * shown with it (`hide` goes by prefix), and a plane under its plants (they are composited only on it).
 */
export function layerParts(ids, hidden = '') {
  const groups = [...new Set([BASE, ...ids].map(groupOf))].sort()
  const hide = (list) => [hidden, ...list].filter(Boolean).join(',')
  const alone = groups.map((group) => {
    const kept = [group, group.replace(/^canopy\./, 'plane.')]
    return { part: group.replace(/\.$/, ''), hide: hide(groups.filter((other) => !kept.some((id) => id.startsWith(other)))) }
  })
  return [...alone, { part: 'unlisted', hide: hide(groups) }]
}
