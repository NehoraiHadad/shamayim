// SHAMAYIM · social film (9x16). Clean register: the live app's own frames are the star; one accent, the app's gold.
// LOOK STILL stage: one frame, the triptych of three skies at 16:05 on 19.11.2026. See promo/BRIEF.md.
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

const W = 1080, H = 1920, FPS = 30, BPM = 90, DURATION = 480;
const C = { ground: "#0F1730", ground2: "#16214A", ink: "#F3F5F7", muted: "#A9B4CC", gold: "#FFD241", hair: "rgba(243,245,247,0.14)" };
// safe rectangle for 9x16 (top 14 %, bottom 25 %, right 14 %)
const SAFE = { top: Math.round(H * 0.14), bottom: Math.round(H * 0.75), right: Math.round(W * 0.86) };

// the three places, top to bottom in the order their sun goes down
const PLACES = [
  { key: "hfa", name: "חיפה", note: "מאחורי הכרמל", time: "15:48" },
  { key: "jlm", name: "ירושלים", note: "", time: "16:39" },
  { key: "tlv", name: "תל אביב-יפו", note: "אל הים", time: "16:41" },
];

const rr = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};

const triptych = (ctx: Ctx, env: Env) => {
  const s = env.scale; ctx.setTransform(s, 0, 0, s, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.ground2); g.addColorStop(1, C.ground);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // the shared clock: the one thing the thumb moves
  const left = 60, right = SAFE.right - 10, bandX = 40, bandW = W - 80;
  ctx.direction = "ltr"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.ink; ctx.font = `700 150px SkyNum`;
  ctx.fillText("16:05", (left + right) / 2, SAFE.top + 128);
  ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.fillStyle = C.muted; ctx.font = `600 32px SkySans`;
  ctx.fillText("אותו רגע. שלושה שמיים.", (left + right) / 2, SAFE.top + 182);

  // three bands, each the live app's valley scene at that moment, with its own label row
  const imgAspect = 231 / 1170, bandH = Math.round(bandW * imgAspect), labelH = 58, gap = 48;
  let y = SAFE.top + 250;
  for (const p of PLACES) {
    ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.ink; ctx.font = `500 42px SkySerif`; ctx.fillText(p.name, right - 6, y + 40);
    ctx.direction = "rtl"; ctx.textAlign = "left"; ctx.fillStyle = C.gold; ctx.font = `600 32px SkySans`;
    ctx.fillText(p.note ? `השמש נעלמת ${p.note} · ${p.time}` : `השמש נעלמת · ${p.time}`, left + 6, y + 38);
    const by = y + labelH;
    const img = env.image?.(p.key);
    ctx.save(); rr(ctx, bandX, by, bandW, bandH, 26); ctx.clip();
    if (img) ctx.drawImage(img, bandX, by, bandW, bandH); else { ctx.fillStyle = "#2a538c"; ctx.fillRect(bandX, by, bandW, bandH); }
    ctx.restore();
    ctx.strokeStyle = C.hair; ctx.lineWidth = 2; rr(ctx, bandX, by, bandW, bandH, 26); ctx.stroke();
    y = by + bandH + gap;
  }
};

export const skyPromo: Film = {
  meta: { title: "skyPromo", W, H, fps: FPS, bpm: BPM, durationFrames: DURATION },
  assets: { images: { hfa: "assets/shots/hfa-1605.png", jlm: "assets/shots/jlm-1605.png", tlv: "assets/shots/tlv-1605.png" } },
  shots: [{ id: "look", start: 0, end: DURATION, draw: (ctx: Ctx, _local: number, env: Env) => triptych(ctx, env) }],
};
