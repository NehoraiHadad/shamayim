// VARIANT 1b: the current hand, enriched, at four moments from one source. Frame 0 golden (hero), 30 noon, 60 night, 90 rain.
import type { Film } from "./film";
import { registerAppFonts } from "./appFonts";
import { FH, FW } from "./valley";
import { MOMENTS, drawRich } from "./styleRich";

registerAppFonts();
const ORDER = ["golden", "noon", "night", "rain"];
export const rich: Film = {
  meta: { title: "rich", W: FW, H: FH, fps: 30, bpm: 60, durationFrames: 120 },
  assets: { images: {} },
  shots: ORDER.map((id, i) => { const d = drawRich(MOMENTS[id]); return { id, start: i * 30, end: i * 30 + 30, draw: (c, _f, env) => { c.save(); d(c, env); c.restore(); } }; }),
};
