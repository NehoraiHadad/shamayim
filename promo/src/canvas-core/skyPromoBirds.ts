// CRANES. The app draws a V of common cranes crossing the Jordan Valley sky on calm days of their migration
// windows (10.10-30.11 and 15.02-20.03; docs/design/CALM-LIFE.md). This is their call, made in code: a flock
// far overhead, each bird's two-part "krr-OO" (a rough low onset that breaks up into a clear bugle), heard
// through distance (high end gone, two soft echoes off the hills), panned across the frame the way the V flies.
// Deterministic: a seeded rng, no clock, no files. Quiet on purpose: it sits under the piano, never over it.
import { rng } from "./core";

export type FlockCall = { at: number; dur: number; seed: number; panFrom: number; panTo: number; level?: number };

/** Adds a crossing flock into L/R (in place). `at`/`dur` in seconds; pan -1 (left) .. +1 (right). */
export const addCranes = (L: Float32Array, R: Float32Array, sr: number, f: FlockCall) => {
  const r = rng(f.seed), birds = 7, level = f.level ?? 0.05;
  const mono = new Float32Array(Math.ceil((f.dur + 1) * sr));
  const panOfT: number[] = [];
  for (let b = 0; b < birds; b++) {
    const f0 = 600 * (0.9 + 0.2 * r()), calls = 2 + Math.floor(r() * 2);
    let t = r() * f.dur * 0.55;
    for (let c = 0; c < calls && t < f.dur - 0.3; c++) {
      const len = 0.3 + 0.12 * r(), n = Math.floor(len * sr), off = Math.floor(t * sr);
      // a bird nearer the middle of the crossing is nearer the listener
      const near = Math.sin(Math.PI * Math.min(1, Math.max(0, t / f.dur))) * (0.75 + 0.5 * r());
      let ph = 0, lp = 0;
      for (let i = 0; i < n && off + i < mono.length; i++) {
        const u = i / n, br = 0.32; // the break between the rough onset and the clear bugle
        const fq = u < br ? f0 * (0.74 + 0.06 * (u / br)) : f0 * (0.97 + 0.05 * Math.sin(Math.PI * Math.min(1, (u - br) / (1 - br)))) * (1 + 0.006 * Math.sin(2 * Math.PI * 7 * i / sr));
        ph += (2 * Math.PI * fq) / sr;
        let s = 0;
        for (let k = 1; k <= 9; k++) {
          const hz = k * fq, form = hz > 900 && hz < 2300 ? 1.7 : hz > 3400 ? 0.25 : 1; // the bugle's resonance; distance takes the top
          s += (form / Math.pow(k, 0.95)) * Math.sin(k * ph);
        }
        const rough = u < br ? 0.55 + 0.45 * Math.sin(2 * Math.PI * 36 * i / sr) : 1; // the rolling "rr" of the onset
        const env = Math.min(1, u / 0.06) * Math.min(1, (1 - u) / 0.18);
        lp += 0.42 * (s * rough * env - lp); // a gentle one-pole low-pass: far away
        mono[off + i] += lp * near * 0.11;
      }
      t += len + 0.12 + r() * 0.22;
    }
  }
  // two soft echoes off the valley walls
  const e1 = Math.floor(0.11 * sr), e2 = Math.floor(0.23 * sr);
  for (let i = mono.length - 1; i >= 0; i--) mono[i] += (i >= e1 ? 0.28 * mono[i - e1] : 0) + (i >= e2 ? 0.14 * mono[i - e2] : 0);
  void panOfT;
  const o = Math.floor(f.at * sr);
  for (let i = 0; i < mono.length && o + i < L.length; i++) {
    const p = f.panFrom + (f.panTo - f.panFrom) * Math.min(1, i / (f.dur * sr)), a = ((p + 1) * Math.PI) / 4;
    const fade = Math.min(1, i / (0.25 * sr)) * Math.min(1, (mono.length - i) / (0.6 * sr));
    L[o + i] += mono[i] * Math.cos(a) * level * 10 * fade; R[o + i] += mono[i] * Math.sin(a) * level * 10 * fade;
  }
};
