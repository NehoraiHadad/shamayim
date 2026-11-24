/** Feeds a hash a number as its two exact words: no rounding, so two numbers that differ in any bit never share a key by it. */
export function exactWords(mix: (word: number) => void): (n: number) => void {
  const value = new Float64Array(1), bits = new Uint32Array(value.buffer)
  return (n) => { value[0] = n; mix(bits[0]); mix(bits[1]) }
}

/**
 * Stable keys for the compositor: a hash of a part's exact inputs, numbers rounded to what can change a pixel, functions
 * left out (they follow from the data beside them). Equal parts give equal keys; the key never holds a time of day.
 */
export function partKey(value: unknown, digits = 3): string {
  const factor = 10 ** digits
  const json = JSON.stringify(value, (_, v: unknown) => typeof v === 'function' ? undefined
    : typeof v === 'number' ? (Number.isFinite(v) ? Math.round(v * factor) / factor : String(v)) : v)
  let hash = 2166136261
  for (let i = 0; i < (json?.length ?? 0); i++) hash = Math.imul(hash ^ json.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(36)
}
