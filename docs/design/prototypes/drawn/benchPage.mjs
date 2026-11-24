// What the bench runs in the page (each function is sent there whole, so it stands alone).

/** What each step but the first painted: `{ layer: ms }` a step. */
export function drag({ day, from, count, step }) {
  const out = [], two = (n) => String(n).padStart(2, '0')
  for (let i = 0; i < count; i++) {
    const m = from + i * step
    const { painted } = window.__scene.scrub(`${day}T${two(Math.floor(m / 60))}:${two(m % 60)}`)
    if (i) out.push(Object.fromEntries(painted.map((text) => text.slice(0, text.lastIndexOf(':'))).map((id) => [id, window.__sceneStats.layers[id].lastMs])))
  }
  return out
}

/** The share of drag steps at which each part of a form is the one of the step before. */
export function kept({ day, from, count, step }) {
  const two = (n) => String(n).padStart(2, '0'), hits = {}, n = {}, most = {}
  const bytes = (list, k) => Array.from(list, (v) => Math.round(v * k)).join()
  let before = new Map()
  for (let i = 0; i < count; i++) {
    const m = from + i * step, now = new Map()
    window.__scene.scrub(`${day}T${two(Math.floor(m / 60))}:${two(m % 60)}`)
    for (const l of window.__model.layers) {
      if (l.kind === 'cloudSheet') {
        now.set(`sheet alpha 8 bit|${l.id}`, bytes(l.alpha, 255))
        now.set(`sheet alpha 5 bit|${l.id}`, bytes(l.alpha, 31))
        now.set(`sheet lattice|${l.id}`, [...l.xs, ...l.ys].map((v) => Math.round(v)).join())
      } else if (l.kind === 'cloudCells') {
        const seen = {}
        for (const { sprite: c } of l.cells) {
          const nth = seen[c.seed] = (seen[c.seed] ?? 0) + 1, size = [c.w, c.under, c.bowl ?? 0, c.tall], id = `${l.id}|${c.seed}|${nth}`
          now.set(`tower size ½ px|${id}`, size.map((v) => Math.round(2 * v)).join())
          now.set(`tower size 4 %|${id}`, size.map((v) => Math.round(Math.log(v + 1) / 0.04)).join())
          // The shape alone: a tower drawn at one size and laid scaled.
          now.set(`tower ratios 4 %|${id}`, [...size.slice(1).map((v) => v / c.w), c.lean, c.anvil ?? 0].map((v) => Math.round(v / 0.04)).join())
        }
        now.set(`towers in a frame|${l.id}`, l.cells.length)
      } else if (l.surface === 'land') now.set(`${l.kind}|${l.id}`, l.key)
    }
    if (i) for (const [k, v] of now) {
      const name = k.split('|')[0]
      if (typeof v === 'number') { most[name] = Math.max(most[name] ?? 0, v); continue }
      // A form seen for the first time is a miss too.
      n[name] = (n[name] ?? 0) + 1
      hits[name] = (hits[name] ?? 0) + (before.get(k) === v ? 1 : 0)
    }
    before = now
  }
  return [...Object.entries(n).map(([k, v]) => `${k} ${hits[k]}/${v}`).sort(), ...Object.entries(most).map(([k, v]) => `${k}: at most ${v}`)]
}
