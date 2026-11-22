import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The sky (`Sky.module.css`, z-index -1) paints between the root background and the body's own box.
// A background on <body> covers the whole sky with the boot colour, so only <html> may carry it.
describe('boot style in index.html', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const rules = [...html.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, sel, body]) => ({ sel: sel.split(">").pop()!.trim(), body }))

  it('never gives <body> a background', () => {
    const bodyRules = rules.filter((r) => r.sel.split(',').some((s) => s.trim() === 'body'))
    expect(bodyRules.length).toBeGreaterThan(0)
    for (const r of bodyRules) expect(r.body).not.toMatch(/background/)
  })

  it('keeps the boot colour on <html>', () => {
    expect(rules.some((r) => r.sel === 'html' && /background:\s*var\(--boot-bg/.test(r.body))).toBe(true)
  })
})
