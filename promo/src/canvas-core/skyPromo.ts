// SHAMAYIM · social film (9x16). Clean register: the live app's own frames are the star; one accent, the app's gold.
// LOOK STILL stage: the opening frame, Shadmot Mehola before sunrise (06:15, 20.11.2026, scrubbed on the live app). See promo/BRIEF.md.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import karH from "../../assets/fonts/karantina-hebrew-700-normal.woff2";
import karL from "../../assets/fonts/karantina-latin-700-normal.woff2";
import frkH from "../../assets/fonts/frank-ruhl-libre-hebrew-500-normal.woff2";
import frkL from "../../assets/fonts/frank-ruhl-libre-latin-500-normal.woff2";
import asH from "../../assets/fonts/assistant-hebrew-600-normal.woff2";
import asL from "../../assets/fonts/assistant-latin-600-normal.woff2";

type FontFile = { path: string; format: string; data: string };
const HEB = "U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F";
const LAT = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
// the app's faces, each as its Hebrew and Latin subsets (as @fontsource ships them), registered before frame 0
(() => {
  const g = globalThis as unknown as { FontFace?: new (f: string, s: ArrayBuffer, d?: Record<string, string>) => { load(): Promise<unknown> }; document?: { fonts: { add(f: unknown): void } } };
  if (!g.FontFace || !g.document) return;
  const add = (family: string, file: FontFile, range: string) => {
    const bin = atob(file.data), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const face = new g.FontFace(family, u8.buffer, { weight: "1 1000", style: "normal", unicodeRange: range }); g.document!.fonts.add(face); void face.load();
  };
  add("SkyNum", karH as FontFile, HEB); add("SkyNum", karL as FontFile, LAT);
  add("SkySerif", frkH as FontFile, HEB); add("SkySerif", frkL as FontFile, LAT);
  add("SkySans", asH as FontFile, HEB); add("SkySans", asL as FontFile, LAT);
})();

export const W = 1080, H = 1920, FPS = 30, BPM = 90, DURATION = 480;
const C = { ground: "#0F1730", ground2: "#16214A", ink: "#F3F5F7", muted: "#A9B4CC", gold: "#FFD241", hair: "rgba(243,245,247,0.14)" };
// safe rectangle for 9x16 (top 14 %, bottom 25 %, right 14 %)
const SAFE = { top: Math.round(H * 0.14), bottom: Math.round(H * 0.75), right: Math.round(W * 0.86) };

const rr = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};

// the phone: the live app's own frame (390x844 CSS at 3x), kept inside the safe width; its lower part (the week
// list) may run into the bottom zone, everything a viewer must read (place, number, line, strip, valley, clothesline)
// sits above y 1290
const PHONE = { x: 180, y: 250, w: 721 }; const PH = Math.round(PHONE.w * 2532 / 1170); const CSS = PHONE.w / 390;
// the frame's ground takes the app's sky at that moment, so the phone reads as a window in the same sky
export const SKY_0615 = { top: "#203779", mid: "#4e5b93", low: "#1b2350" };

const touch = (ctx: Ctx, x: number, y: number, trail: number) => {
  // a touch indicator, as screen recordings show one: a soft disc with a fading trail behind the way it came
  for (let i = 8; i >= 1; i--) { const t = i / 8; ctx.globalAlpha = 0.16 * (1 - t); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x + trail * t, y, 30 * (1 - 0.35 * t), 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 0.28; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
};

export const phoneFrame = (ctx: Ctx, env: Env, key: string, sky: { top: string; mid: string; low: string }) => {
  const s = env.scale; ctx.setTransform(s, 0, 0, s, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sky.top); g.addColorStop(0.55, sky.mid); g.addColorStop(1, sky.low);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // a soft shadow under the phone (stacked translucent rounded rects; no ctx.filter)
  for (let i = 6; i >= 1; i--) { ctx.globalAlpha = 0.05; ctx.fillStyle = "#070b1c"; rr(ctx, PHONE.x - i * 5, PHONE.y + 18 - i * 3, PHONE.w + i * 10, PH + i * 8, 64 + i * 5); ctx.fill(); }
  ctx.globalAlpha = 1;
  const img = env.image?.(key);
  ctx.save(); rr(ctx, PHONE.x, PHONE.y, PHONE.w, PH, 64); ctx.clip();
  if (img) ctx.drawImage(img, PHONE.x, PHONE.y, PHONE.w, PH); else { ctx.fillStyle = sky.mid; ctx.fillRect(PHONE.x, PHONE.y, PHONE.w, PH); }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; rr(ctx, PHONE.x, PHONE.y, PHONE.w, PH, 64); ctx.stroke();
  // the thumb on the valley (CSS y ~390), mid-drag toward later (leftward in RTL)
  touch(ctx, PHONE.x + 300 * CSS, PHONE.y + 392 * CSS, 150);
};

export const skyPromo: Film = {
  meta: { title: "skyPromo", W, H, fps: FPS, bpm: BPM, durationFrames: DURATION },
  assets: { images: { sdm0615: "assets/shots/sdm-0615.jpg" } },
  shots: [{ id: "look", start: 0, end: DURATION, draw: (ctx: Ctx, _local: number, env: Env) => phoneFrame(ctx, env, "sdm0615", SKY_0615) }],
};

