// What the bench runs in the page (each function is sent there whole, so it stands alone).

/** Every layer's paint at each step but the first: `{ layer: ms[] }`, a step where it was not painted left out. */
export function drag({ day, from, count, step }) {
  const out = {}, two = (n) => String(n).padStart(2, '0')
  for (let i = 0; i < count; i++) {
    const m = from + i * step
    const { painted } = window.__scene.scrub(`${day}T${two(Math.floor(m / 60))}:${two(m % 60)}`)
    if (i) for (const text of painted) {
      const id = text.slice(0, text.lastIndexOf(':'))
      ;(out[id] ??= []).push(window.__sceneStats.layers[id].lastMs)
    }
  }
  return out
}

/** The share of drag steps at which each part of a form is the one of the step before. */
export function kept({ day, from, count, step }) {
  const two = (n) => String(n).padStart(2, '0'), hits = {}, n = {}
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
        for (const c of l.cells) {
          const size = [c.w, c.under, c.bowl ?? 0, c.tall]
          now.set(`tower form ½ px|${l.id}|${c.seed}`, size.map((v) => Math.round(2 * v)).join())
          now.set(`tower form 4 %|${l.id}|${c.seed}`, size.map((v) => Math.round(Math.log(v + 1) / 0.04)).join())
        }
      } else if (l.surface === 'land') now.set(`${l.kind}|${l.id}`, l.key)
    }
    if (i) for (const [k, v] of now) {
      const name = k.split('|')[0]
      n[name] = (n[name] ?? 0) + 1
      hits[name] = (hits[name] ?? 0) + (before.get(k) === v ? 1 : 0)
    }
    before = now
  }
  return Object.entries(n).map(([k, v]) => `${k} ${hits[k]}/${v}`).sort()
}
