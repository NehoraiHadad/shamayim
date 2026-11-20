// STYLE VARIATIONS OF THE WHOLE VIEW: one composition (valley.ts), five hands. Frame N = variant N.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { registerAppFonts } from "./appFonts";
import { FH, FW } from "./valley";
import { drawCurrent } from "./styleCurrent";
import { drawFlat } from "./styleFlat";
import { drawMid } from "./styleMid";
import { drawFolk } from "./styleFolk";
import { drawWood } from "./styleWood";

registerAppFonts();
const VARIANTS: ((c: Ctx, env: Env) => void)[] = [drawCurrent, drawFlat, drawMid, drawFolk, drawWood];
const draw = (n: number) => (ctx: Ctx, _f: number, env: Env) => { ctx.save(); (VARIANTS[n] ?? VARIANTS[0])(ctx, env); ctx.restore(); };
export const styles: Film = {
  meta: { title: "styles", W: FW, H: FH, fps: 30, bpm: 60, durationFrames: 150 },
  assets: { images: {} },
  shots: ["current", "flatVector", "midCentury", "folkTale", "woodcut"].map((id, i) => ({ id, start: i * 30, end: i * 30 + 30, draw: draw(i) })),
};
