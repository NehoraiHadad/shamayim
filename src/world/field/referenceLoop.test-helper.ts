// A fixed CPU-bound loop with a data dependency prevents the JIT from dropping the work.
export function referenceLoop() {
  const scratch = new Float64Array(512)
  const objects = Array.from({ length: 128 }, (_, i) => ({ phase: i / 128 }))
  let phase = 0.25
  for (let i = 0; i < 100_000; i++) phase = Math.sin(phase + i / 100)
  scratch[objects.length] = phase
  return scratch[128] + objects[64].phase
}
