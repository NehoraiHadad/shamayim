import type { Part, Shape } from './shape'

const NECK = 'M-6 1.2Q0 6.5 6 1.2'
/** Between the pegs the front neckline sags open and the inside of the back shows, with its little care label. */
const INSIDE: Part[] = [
  { d: 'M-7.2 1.1Q0 2.9 7.2 1.1Q0 6.6-7.2 1.1Z', as: 'inner' },
  { d: 'M-1.1 1.9H1.1V3.5L0 3.9-1.1 3.5Z', as: 'tag' },
]
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
const UMBRELLA: readonly [number, number, number] = [6.2, 2.6, -3]
const HAT: readonly [number, number, number] = [0, 0, 8]

export const SHAPES: Record<string, Shape> = {
  // Short sleeves stick out, a chest pocket; the neck dips where the pegs pull the shoulders.
  tee: { grain: 'weave', parts: [
    { d: 'M-8 1Q-13.4 3.2-16.2 7.6L-15 15.6Q-12.6 15.4-10.4 14.2V33Q-5 33.8 0 33.4T10.4 33V14.2Q12.6 15.4 15 15.6L16.2 7.6Q13.4 3.2 8 1Q0 7-8 1Z', as: 'cloth' },
    ...INSIDE,
    { d: 'M7.6 2.6Q5.6 17 4.4 33.4Q7.4 33.3 9.6 33V11.2Z', as: 'shade' },
    { d: 'M11.2 13.6Q12.6 14.6 14.4 14.8L15 9.4Q12.6 9.6 11.2 13.6Z', as: 'shade' },
    { d: NECK, as: 'seam' },
    { d: 'M-15.2 13.4Q-12.8 13.4-10.6 12.2M15.2 13.4Q12.8 13.4 10.6 12.2M-9.6 31Q0 32.6 9.6 31', as: 'stitch' },
    { d: 'M-8.4 14.5H-3.6V18.4Q-6 19.6-8.4 18.4Z', as: 'seam' },
    { d: 'M-8 15.7h4', as: 'stitch' },
  ] },
  // Thin long sleeve: the sleeves fall straight down beside the body, narrow cuffs.
  longSleeve: { grain: 'weave', parts: [
    { d: 'M-8 1L-17 5-20.5 29.5-16.6 30.4-11 13V35Q0 36.4 11 35V13L16.6 30.4 20.5 29.5 17 5 8 1Q0 7-8 1Z', as: 'cloth' },
    ...INSIDE,
    { d: 'M7.6 2.6Q5.4 18 4.4 35.4Q7.6 35.3 10.2 35V13.4Z', as: 'shade' },
    { d: 'M12 14L17 29.6 18.4 29.2 14.2 11.4Z', as: 'shade' },
    { d: NECK, as: 'seam' },
    { d: 'M-2.6 6.6Q-3.6 20-2.4 34', as: 'seam' },
    { d: 'M-20.2 27.4l3.9.9M20.2 27.4l-3.9.9M-10.2 33.2Q0 34.6 10.2 33.2', as: 'stitch' },
  ] },
  // Knit sweater: rounder, heavier, ribbed hem and cuffs, a double crew neck, a cable down the front.
  sweater: { grain: 'knit', parts: [
    { d: 'M-8.5 1Q-15 2.5-18 7L-21 29.6-16 31-12 15V35.5Q0 37.5 12 35.5V15L16 31 21 29.6 18 7Q15 2.5 8.5 1Q0 7.5-8.5 1Z', as: 'cloth' },
    ...INSIDE,
    { d: 'M8.2 2.8Q6 18 5 32.8Q8.6 32.6 11.2 32.2V15Z', as: 'shade' },
    { d: 'M12.8 16.4L16.6 29.4 18.6 28.8 15.6 11.2Z', as: 'shade' },
    { d: NECK, as: 'seam' },
    { d: 'M-7.2 2.6Q0 9 7.2 2.6', as: 'seam' },
    { d: 'M-1.6 10q3.2 2 0 4t0 4 0 4 0 4 0 4M1.6 10q-3.2 2 0 4t0 4 0 4 0 4 0 4', as: 'seam' },
    { d: 'M-12 32.4Q0 34.4 12 32.4M-8 33.4v2.8M-4 33.8v2.9M0 34v3M4 33.8v2.9M8 33.4v2.8', as: 'seam' },
    { d: 'M-20.6 26.8l4.5 1.4M20.6 26.8l-4.5 1.4', as: 'seam' },
  ] },
  // Zip jacket: stand collar, a zip with its pull, two slanted pockets, banded cuffs.
  jacket: { grain: 'nylon', parts: [
    { d: 'M-8.5 1L-18 5.5-21 30-16.6 31-12.4 14V36H12.4V14L16.6 31 21 30 18 5.5 8.5 1-6 1Z', as: 'cloth' },
    { d: 'M1 1.2V35.2H11.6V14.4L8.4 2Z', as: 'shade' },
    { d: 'M13.2 15.4L17 29.8 19 29.4 16 9.4Z', as: 'shade' },
    { d: 'M-6 1L-5 -2H5L6 1', as: 'seam' },
    { d: 'M0 -2V36', as: 'seam' },
    { d: 'M-0.9 3.4h1.8v3h-1.8z', as: 'strong' },
    { d: 'M-9.5 24l3.5-3M9.5 24l-3.5-3M-20.4 27.4l4.3 1M20.4 27.4l-4.3 1M-12.4 33.4H12.4', as: 'seam' },
  ] },
  // Long coat: past the knees, lapels, two buttons, a belt, flap pockets.
  coat: { grain: 'twill', parts: [
    { d: 'M-9 1L-18.5 6-21.5 32-17 33-13 15V48.5H13V15L17 33 21.5 32 18.5 6 9 1Z', as: 'cloth' },
    { d: 'M2.6 15.4L1 22V47.8H12.2V15.4L9 2Z', as: 'shade' },
    { d: 'M13.8 16.6L17.4 31.6 19.6 31.2 16.6 10.6Z', as: 'shade' },
    { d: 'M-9 1L-2 14 0 22M9 1L2 14 0 22V48.5', as: 'seam' },
    { d: 'M-13 30H13M-11 36.5h6M5 36.5h6', as: 'seam' },
    { d: 'M-12.2 46.4H12.2', as: 'stitch' },
    { d: circle(-3, 25.5, 1), as: 'dot' },
    { d: circle(-3, 36, 1), as: 'dot' },
  ] },
  // Closed umbrella hung by its crook: furled canopy held by a snapped strap, tip at the bottom. Drawn in its own frame
  // (shaft on x = 0), then hung: the crook's inner top rests on the rope and its weight hangs straight under it.
  umbrella: { grain: 'nylon', parts: [
    { d: 'M0 9V4.2A2.6 2.6 0 0 0-5.2 4.2V5.4Q-5.2 6.6-4.2 6.8', as: 'crook', t: UMBRELLA },
    { d: 'M-0.5 4.2A2.1 2.1 0 0 0-4.7 4.2', as: 'glint', t: UMBRELLA },
    { d: 'M-1.2 9H1.2L1.5 11.6H-1.5Z', as: 'dot', t: UMBRELLA },
    { d: 'M0 11.4C-5.4 17-5.8 35-0.8 43.2 -0.3 44 0.3 44 0.8 43.2 5.8 35 5.4 17 0 11.4Z', as: 'cloth', t: UMBRELLA },
    { d: 'M0.6 13.4C4.4 20 4.6 34 0.8 41.6 3.2 33 3 21 0.6 13.4Z', as: 'shade', t: UMBRELLA },
    { d: 'M0 14C-2.4 21-2.1 33 0 40.6M0 14C2.4 23 2.8 32 1.4 38.6M-0.3 15.4Q-3.6 26-2.2 36.4', as: 'seam', t: UMBRELLA },
    { d: 'M-3.8 25.6Q0 28 4.2 25.2', as: 'strong', t: UMBRELLA },
    { d: circle(0.4, 26.6, 0.9), as: 'dot', t: UMBRELLA },
    { d: 'M0 43.6v2.6', as: 'strong', t: UMBRELLA },
  ] },
  // Light rain jacket: a hood falling back behind the neck, drawstrings, a zip, a storm flap pocket.
  rainJacket: { grain: 'nylon', parts: [
    { d: 'M-8.5 1L-17.5 5.5-20 28-16 29-12 13V33.5Q0 35.5 12 33.5V13L16 29 20 28 17.5 5.5 8.5 1Z', as: 'cloth' },
    { d: 'M1 14V34.4Q6 34.2 11.2 33.6V13.4L8.2 2.2Q7 13.4 1 14Z', as: 'shade' },
    { d: 'M12.8 14.4L16.4 27.8 18.4 27.4 15.6 8.8Z', as: 'shade' },
    { d: 'M-7 2Q-6.5 13 0 13.5 6.5 13 7 2', as: 'seam' },
    { d: 'M-2.5 13.4v5.5M2.5 13.4v4.4', as: 'seam' },
    { d: 'M0 13.5V33.5M-10 22.6h5.4M5 24.6l4.4-2', as: 'seam' },
  ] },
  // Sun hat hung by its chin cord looped over the rope: a wide brim with its shaded underside, a band, a ribbon tail.
  sunHat: { grain: 'straw', parts: [
    { d: 'M-1.3 2.4A1.8 1.8 0 1 1 1.3 2.4L6.8 15.4M-1.3 2.4L-6.8 15.4', as: 'cord' },
    { d: 'M7.4 9.4Q11.6 12 11.2 18.6L9.4 17 8 18.8Q8.2 13.4 5.6 10.4Z', as: 'cloth', t: HAT },
    { d: 'M-15 12.5Q-14 6.5 0 6.2 14 6.5 15 12.5 9 16.5 0 16.5-9 16.5-15 12.5Z', as: 'cloth', t: HAT },
    { d: 'M-12.6 13.6Q0 17.4 12.6 13.6 8 15.6 0 15.6-8 15.6-12.6 13.6Z', as: 'shade', t: HAT },
    { d: 'M-8 10.8Q-8.2 1.5 0 1.2 8.2 1.5 8 10.8', as: 'cloth', t: HAT },
    { d: 'M2.4 2.2Q6.8 3.6 7 9.6L3.4 9.8Q4 5 2.4 2.2Z', as: 'shade', t: HAT },
    { d: 'M-5.6 4.4Q-4.4 2.6-2.4 2.2', as: 'glint', t: HAT },
    { d: 'M-8 8.6Q0 10.6 8 8.6', as: 'strong', t: HAT },
    { d: 'M-0.6 1.6Q0 4 0 6.2M-12.2 12.6Q0 15.8 12.2 12.6', as: 'stitch', t: HAT },
  ] },
  // Water bottle hanging by the loop of its cap: the water inside, a glint down the side.
  water: { grain: 'none', parts: [
    { d: 'M-2.4 3.4A3 3 0 1 1 2.4 3.4', as: 'crook' },
    { d: 'M-2.6 4H2.6V7.5Q6 9.5 6 13V30Q6 32 4 32H-4Q-6 32-6 30V13Q-6 9.5-2.6 7.5Z', as: 'cloth' },
    { d: 'M-5.2 17.4Q-2.6 16.2 0 17.4T5.2 17.4V29.6Q5.2 31.2 3.6 31.2H-3.6Q-5.2 31.2-5.2 29.6Z', as: 'water' },
    { d: 'M-2.6 6.2H2.6M-1.3 4.2v2M0 4.2v2M1.3 4.2v2', as: 'seam' },
    { d: 'M-3.8 12.6V27', as: 'glint' },
  ] },
}
