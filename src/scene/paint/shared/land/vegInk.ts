export function h01(seed: number, x: number, y: number, salt: number): number {
  // Anchor at sixteenths of a scene pixel so packing/removing another feature cannot change the silhouette.
  const at = Math.imul(Math.round(x * 16), 374761393) ^ Math.imul(Math.round(y * 16), 668265263)
  let h = Math.imul(seed ^ at ^ salt, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
