import { toSrgb } from './tone'

// The table differs from the rounded IEC sRGB transfer by at most one display byte.
const ENCODE_STEPS = 16384
const SRGB_BYTE = Uint8Array.from({ length: ENCODE_STEPS + 1 }, (_, i) => Math.round(toSrgb(i / ENCODE_STEPS) * 255))
export const encodedByte = (linear: number) => SRGB_BYTE[Math.round(Math.min(1, Math.max(0, linear)) * ENCODE_STEPS)]
