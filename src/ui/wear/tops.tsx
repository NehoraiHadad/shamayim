import type { Hanging } from './garments'

/**
 * Tops, as they hang by two pegs. Light from the upper left: each has a shaded drape falling from the right peg and
 * a shaded inner sleeve; stitches mark hems. Shade shapes stay inside the outline (they carry no stroke).
 */
const NECK = 'M-6 1.2Q0 6.5 6 1.2'

/** Between the pegs the front neckline sags open and the inside of the back shows, with its little care label. */
const INSIDE = (
  <>
    <path d="M-7.2 1.1Q0 2.9 7.2 1.1Q0 6.6-7.2 1.1Z" className="inner" />
    <path d="M-1.1 1.9H1.1V3.5L0 3.9-1.1 3.5Z" className="tag" />
  </>
)

export const TOPS = {
  // Short sleeves stick out, a chest pocket; the neck dips where the pegs pull the shoulders.
  tee: {
    cloth: '#E0A040',
    weight: 0.8,
    hem: 33,
    pegs: [-8, 8],
    body: (
      <>
        <path d="M-8 1Q-13.4 3.2-16.2 7.6L-15 15.6Q-12.6 15.4-10.4 14.2V33Q-5 33.8 0 33.4T10.4 33V14.2Q12.6 15.4 15 15.6L16.2 7.6Q13.4 3.2 8 1Q0 7-8 1Z" />
        {INSIDE}
        <path d="M7.6 2.6Q5.6 17 4.4 33.4Q7.4 33.3 9.6 33V11.2Z" className="shade" />
        <path d="M11.2 13.6Q12.6 14.6 14.4 14.8L15 9.4Q12.6 9.6 11.2 13.6Z" className="shade" />
        <path d={NECK} className="seam" />
        <path d="M-15.2 13.4Q-12.8 13.4-10.6 12.2M15.2 13.4Q12.8 13.4 10.6 12.2M-9.6 31Q0 32.6 9.6 31" className="stitch" />
        <path d="M-8.4 14.5H-3.6V18.4Q-6 19.6-8.4 18.4Z" className="seam" />
        <path d="M-8 15.7h4" className="stitch" />
      </>
    ),
  },
  // Thin long sleeve: the sleeves fall straight down beside the body, narrow cuffs.
  longSleeve: {
    cloth: '#7FA2BC',
    weight: 0.9,
    hem: 35,
    pegs: [-8, 8],
    body: (
      <>
        <path d="M-8 1L-17 5-20.5 29.5-16.6 30.4-11 13V35Q0 36.4 11 35V13L16.6 30.4 20.5 29.5 17 5 8 1Q0 7-8 1Z" />
        {INSIDE}
        <path d="M7.6 2.6Q5.4 18 4.4 35.4Q7.6 35.3 10.2 35V13.4Z" className="shade" />
        <path d="M12 14L17 29.6 18.4 29.2 14.2 11.4Z" className="shade" />
        <path d={NECK} className="seam" />
        <path d="M-2.6 6.6Q-3.6 20-2.4 34" className="seam" />
        <path d="M-20.2 27.4l3.9.9M20.2 27.4l-3.9.9M-10.2 33.2Q0 34.6 10.2 33.2" className="stitch" />
      </>
    ),
  },
  // Knit sweater: rounder, heavier, ribbed hem and cuffs, a double crew neck, a cable down the front.
  sweater: {
    cloth: '#B0543A',
    weight: 1.4,
    hem: 33,
    pegs: [-8.5, 8.5],
    body: (
      <>
        <path d="M-8.5 1Q-15 2.5-18 7L-21 29.6-16 31-12 15V35.5Q0 37.5 12 35.5V15L16 31 21 29.6 18 7Q15 2.5 8.5 1Q0 7.5-8.5 1Z" />
        {INSIDE}
        <path d="M8.2 2.8Q6 18 5 32.8Q8.6 32.6 11.2 32.2V15Z" className="shade" />
        <path d="M12.8 16.4L16.6 29.4 18.6 28.8 15.6 11.2Z" className="shade" />
        <path d={NECK} className="seam" />
        <path d="M-7.2 2.6Q0 9 7.2 2.6" className="seam" />
        <path d="M-1.6 10q3.2 2 0 4t0 4 0 4 0 4 0 4M1.6 10q-3.2 2 0 4t0 4 0 4 0 4 0 4" className="seam" />
        <path d="M-12 32.4Q0 34.4 12 32.4M-8 33.4v2.8M-4 33.8v2.9M0 34v3M4 33.8v2.9M8 33.4v2.8" className="seam" />
        <path d="M-20.6 26.8l4.5 1.4M20.6 26.8l-4.5 1.4" className="seam" />
      </>
    ),
  },
  // Zip jacket: stand collar, a zip with its pull, two slanted pockets, banded cuffs.
  jacket: {
    cloth: '#2C6E7F',
    weight: 1.4,
    hem: 36,
    pegs: [-8.5, 8.5],
    body: (
      <>
        <path d="M-8.5 1L-18 5.5-21 30-16.6 31-12.4 14V36H12.4V14L16.6 31 21 30 18 5.5 8.5 1-6 1Z" />
        <path d="M1 1.2V35.2H11.6V14.4L8.4 2Z" className="shade" />
        <path d="M13.2 15.4L17 29.8 19 29.4 16 9.4Z" className="shade" />
        <path d="M-6 1L-5 -2H5L6 1" className="seam" />
        <path d="M0 -2V36" className="seam" />
        <path d="M-0.9 3.4h1.8v3h-1.8z" className="seam strong" />
        <path d="M-9.5 24l3.5-3M9.5 24l-3.5-3M-20.4 27.4l4.3 1M20.4 27.4l-4.3 1M-12.4 33.4H12.4" className="seam" />
      </>
    ),
  },
  // Long coat: past the knees, lapels, two buttons, a belt, flap pockets.
  coat: {
    cloth: '#7A6650',
    weight: 1.9,
    hem: 48.5,
    pegs: [-9, 9],
    body: (
      <>
        <path d="M-9 1L-18.5 6-21.5 32-17 33-13 15V48.5H13V15L17 33 21.5 32 18.5 6 9 1Z" />
        <path d="M2.6 15.4L1 22V47.8H12.2V15.4L9 2Z" className="shade" />
        <path d="M13.8 16.6L17.4 31.6 19.6 31.2 16.6 10.6Z" className="shade" />
        <path d="M-9 1L-2 14 0 22M9 1L2 14 0 22V48.5" className="seam" />
        <path d="M-13 30H13M-11 36.5h6M5 36.5h6" className="seam" />
        <path d="M-12.2 46.4H12.2" className="stitch" />
        <circle cx="-3" cy="25.5" r="1" className="dot" />
        <circle cx="-3" cy="36" r="1" className="dot" />
      </>
    ),
  },
} satisfies Record<string, Hanging>
