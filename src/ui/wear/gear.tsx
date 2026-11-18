import type { Hanging } from './garments'

/** Rain and sun gear on the line: hooked things hang by their crook or loop, the hat by one peg on its brim. */
export const GEAR = {
  // Closed umbrella hung by its crook: furled canopy held by a snapped strap, tip at the bottom; it drips.
  umbrella: {
    cloth: '#2A6AA8',
    weight: 1.1,
    pegs: [],
    hook: true,
    drips: [[4.4, 46]],
    body: (
      <>
        <path d="M-5 4.5A4.6 4.6 0 0 1 4.2 -1.5V8" className="seam strong" />
        <path d="M4.2 8C-1.5 14-1.8 33 3.4 41.5 4 42.4 4.4 42.4 5 41.5 10.2 33 9.9 14 4.2 8Z" />
        <path d="M4.6 10.4C8.4 17 8.6 31 5 39.6 7.2 31 7 18.4 4.6 10.4Z" className="shade" />
        <path d="M4.2 11C2 18 2.3 31 4.2 38M4.2 11C6.6 20 7 29 5.6 36" className="seam" />
        <path d="M1.2 22.6Q4.4 24.8 8.2 22.2" className="seam strong" />
        <circle cx="4.6" cy="23.6" r="0.9" className="dot" />
        <path d="M4.2 42v3" className="seam strong" />
      </>
    ),
  },
  // Light rain jacket: a hood falling back behind the neck, drawstrings, a zip, a storm flap pocket; it drips.
  rainJacket: {
    cloth: '#E8C230',
    weight: 1.1,
    pegs: [-8.5, 8.5],
    drips: [[-6, 35.6], [7, 35.4], [-17.8, 29.4]],
    body: (
      <>
        <path d="M-8.5 1L-17.5 5.5-20 28-16 29-12 13V33.5Q0 35.5 12 33.5V13L16 29 20 28 17.5 5.5 8.5 1Z" />
        <path d="M1 14V34.4Q6 34.2 11.2 33.6V13.4L8.2 2.2Q7 13.4 1 14Z" className="shade" />
        <path d="M12.8 14.4L16.4 27.8 18.4 27.4 15.6 8.8Z" className="shade" />
        <path d="M-7 2Q-6.5 13 0 13.5 6.5 13 7 2" className="seam" />
        <path d="M-2.5 13.4v5.5M2.5 13.4v4.4" className="seam" />
        <path d="M0 13.5V33.5M-10 22.6h5.4M5 24.6l4.4-2" className="seam" />
      </>
    ),
  },
  // Sun hat pegged by its brim: wide brim with its shaded underside, a band round the crown, a ribbon tail.
  sunHat: {
    cloth: '#CDAE7C',
    weight: 0.5,
    pegs: [0],
    body: (
      <>
        <path d="M7.4 9.4Q11.6 12 11.2 18.6L9.4 17 8 18.8Q8.2 13.4 5.6 10.4Z" />
        <path d="M-15 12.5Q-14 6.5 0 6.2 14 6.5 15 12.5 9 16.5 0 16.5-9 16.5-15 12.5Z" />
        <path d="M-12.6 13.6Q0 17.4 12.6 13.6 8 15.6 0 15.6-8 15.6-12.6 13.6Z" className="shade" />
        <path d="M-8 10.8Q-8.2 1.5 0 1.2 8.2 1.5 8 10.8" />
        <path d="M2.4 2.2Q6.8 3.6 7 9.6L3.4 9.8Q4 5 2.4 2.2Z" className="shade" />
        <path d="M-8 8.6Q0 10.6 8 8.6" className="seam strong" />
        <path d="M0 6.2V1.2M-12.2 12.6Q0 15.8 12.2 12.6" className="stitch" />
      </>
    ),
  },
  // Water bottle hanging by the loop of its cap: the water inside, a glint down the side.
  water: {
    cloth: '#7FD3EE',
    weight: 1.3,
    pegs: [],
    hook: true,
    body: (
      <>
        <path d="M-2.4 3.8A3 3 0 1 1 2.4 3.8" className="seam strong" />
        <path d="M-2.6 4H2.6V7.5Q6 9.5 6 13V30Q6 32 4 32H-4Q-6 32-6 30V13Q-6 9.5-2.6 7.5Z" />
        <path d="M-5.2 17.4Q-2.6 16.2 0 17.4T5.2 17.4V29.6Q5.2 31.2 3.6 31.2H-3.6Q-5.2 31.2-5.2 29.6Z" className="water" />
        <path d="M-2.6 6.2H2.6" className="seam" />
        <path d="M-3.8 12.6V27" className="glint" />
      </>
    ),
  },
} satisfies Record<string, Hanging>
