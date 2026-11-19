// SCENE GLYPHS: the shamayim valley's landmark glyphs, redrawn for canvas in the scene's own hand.
//
// MEDIUM RECIPE (adapted from the app's scene stills, docs/design/qa/true-scene/stage2c, stage2b):
// - MARK: flat opaque tone shapes, hard pixel edges, no outline. Tones are the app's own formula
//   (marks.module.css): wall = 18 % horizon into ridge-near, lit = 30 % sun into ridge-near,
//   shade = 28 % black into ridge-near. New: round bodies take a falloff (lit -> wall -> shade -> a
//   sliver of reflected sky), sun-facing top edges take a 0.5 px rim.
// - EDGE: hard silhouette; soft only across a round body and in the ground mist at the foot.
// - ORDER: cast shadow -> body -> lit face -> core shadow -> openings -> rim -> grain -> haze -> lights.
// - PAPER: none (the scene is the ground); grain is in the material, 0.5 px cells +- 4 % and a 2 px mottle.
// - PALETTE: sampled from the stills per light (day / dusk / night), see LIGHTS.
// - NOT: a new style. It is the current scene's hand with modelling and grain added.
//
// Glyph space: px around the base point, x 0 the centre, y 0 the ground, up negative, SUN ON THE LEFT
// (mirror with `mirror` when the sun is east, as the app does). Pure in its inputs; randomness from rng(seed).
import { rng, type Ctx, type Env } from "./core";

export type RGB = [number, number, number];
export type Light = {
  name: string; ridge: RGB; sky: RGB; sun: RGB | null; sunK: number; night: boolean;
  hazeTo: RGB; haze: number; mist: number; cast: number;
};
const BLACK: RGB = [0, 0, 0];
const TILE: RGB = [181, 85, 60];
const LIME: RGB = [230, 220, 198];
export const mix = (a: RGB, t: number, b: RGB): RGB => [a[0] * t + b[0] * (1 - t), a[1] * t + b[1] * (1 - t), a[2] * t + b[2] * (1 - t)];
export const css = (c: RGB, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

// Sampled from the stills: day (stage2b/shadmot, stage2c/after-haifa glyph tones), dusk (glow-dusk-west),
// night (after-shadmot-night, after-haifa-night).
export const LIGHTS: Record<"day" | "dusk" | "night", Light> = {
  day: { name: "day", ridge: [45, 54, 68], sky: [178, 193, 212], sun: [225, 227, 228], sunK: 1, night: false, hazeTo: [86, 114, 146], haze: 0.05, mist: 0.16, cast: 0.4 },
  dusk: { name: "dusk", ridge: [30, 22, 42], sky: [111, 64, 96], sun: [242, 153, 74], sunK: 0.45, night: false, hazeTo: [96, 58, 88], haze: 0.06, mist: 0.18, cast: 0.9 },
  night: { name: "night", ridge: [11, 14, 28], sky: [42, 47, 92], sun: null, sunK: 0, night: true, hazeTo: [30, 37, 77], haze: 0.04, mist: 0.12, cast: 0 },
};

type Tones = { wall: RGB; lit: RGB; shade: RGB; deep: RGB; rim: RGB; refl: RGB; roof: RGB; roofLit: RGB; stone: RGB; stoneLit: RGB; glass: RGB; glassLit: RGB; win: RGB; soot: RGB };
export const tonesOf = (L: Light): Tones => {
  const wall = L.night ? mix(L.sky, 0.25, L.ridge) : mix(L.sky, 0.18, L.ridge);
  const litFull = L.sun ? mix(L.sun, 0.3, L.ridge) : mix(L.sky, 0.32, L.ridge);
  const lit = mix(litFull, L.sun ? L.sunK : 0.5, wall);
  const shade = mix(BLACK, 0.28, L.ridge);
  const rim = L.sun ? mix(L.sun, 0.45 * L.sunK + 0.05, L.ridge) : mix(L.sky, 0.42, L.ridge);
  const tile = L.night ? mix(TILE, 0.18, L.ridge) : mix(TILE, 0.5, L.ridge);
  return {
    wall, lit, shade, rim,
    deep: mix(BLACK, 0.48, L.ridge),
    refl: mix(L.sky, 0.3, shade),
    roof: tile, roofLit: L.sun ? mix(mix(L.sun, 0.25, TILE), 0.55 * L.sunK + 0.1, L.ridge) : tile,
    stone: mix(LIME, L.night ? 0.06 : 0.12, wall), stoneLit: mix(LIME, L.night ? 0.06 : 0.16, lit),
    glass: mix(L.sky, L.night ? 0.12 : 0.1, mix(BLACK, 0.12, L.ridge)), glassLit: mix(L.sky, L.night ? 0.3 : 0.42, L.ridge),
    win: [255, 217, 160], soot: mix(BLACK, 0.4, L.ridge),
  };
};

type Lamp = { x: number; y: number; r: number; c: RGB; a: number };
type Tracer = (c: Ctx) => void;
export type Kind = "minaret" | "church" | "synagogue" | "waterTower" | "chimney" | "highrise" | "cooling" | "castle";
export const SPECS: Record<Kind, { w: number; h: number }> = {
  minaret: { w: 14, h: 20 }, church: { w: 12, h: 15.5 }, synagogue: { w: 11, h: 10 }, waterTower: { w: 9, h: 18 },
  chimney: { w: 9, h: 26 }, highrise: { w: 10, h: 28 }, cooling: { w: 12, h: 14 }, castle: { w: 16, h: 10 },
};

const poly = (pts: number[]): Tracer => (c) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };
const rect = (x: number, y: number, w: number, h: number): Tracer => (c) => { c.beginPath(); c.rect(x, y, w, h); };
/** An arched opening: a rectangle with a round head, standing on `y` (its sill). */
const arch = (x: number, y: number, w: number, h: number): Tracer => (c) => { const r = w / 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h + r); c.arc(x + r, y - h + r, r, Math.PI, 0); c.lineTo(x + w, y); c.closePath(); };

/** The drawing kit handed to each glyph: tones, fills, round-body falloff, openings, lights. */
class Kit {
  lamps: Lamp[] = [];
  constructor(public c: Ctx, public t: Tones, public L: Light) {}
  fill(tr: Tracer, col: RGB, a = 1) { tr(this.c); this.c.fillStyle = css(col, a); this.c.fill(); }
  /** A round body (cylinder, cone, dome) between x0 and x1: light falls off from the sun side, a sliver of
   * reflected sky comes back on the far edge. At night it is wall with a faint sky rim. */
  round(tr: Tracer, x0: number, x1: number, opts: { term?: number; flat?: boolean } = {}) {
    const { t, L } = this, g = this.c.createLinearGradient(x0, 0, x1, 0), term = opts.term ?? 0.62;
    if (L.night) { g.addColorStop(0, css(mix(t.rim, 0.35, t.wall))); g.addColorStop(0.3, css(t.wall)); g.addColorStop(1, css(mix(t.shade, 0.5, t.wall))); }
    else {
      g.addColorStop(0, css(mix(t.rim, 0.4, t.lit))); g.addColorStop(0.18, css(t.lit)); g.addColorStop(term * 0.7, css(t.wall));
      g.addColorStop(term, css(mix(t.shade, 0.7, t.wall))); g.addColorStop(0.9, css(t.shade)); g.addColorStop(1, css(t.refl));
    }
    tr(this.c); this.c.fillStyle = g; this.c.fill();
  }
  /** A box seen at three-quarters: a narrow lit side face on the sun side, the front in wall tone, a core shadow strip. */
  box(x: number, y: number, w: number, h: number, side: number, opts: { shadeW?: number; front?: RGB; sideC?: RGB } = {}) {
    this.fill(rect(x, y, w, h), opts.front ?? this.t.wall);
    if (side > 0) this.fill(rect(x, y, side, h), opts.sideC ?? this.t.lit);
    const sw = opts.shadeW ?? 0; if (sw > 0) this.fill(rect(x + w - sw, y, sw, h), this.t.shade, 0.55 * (this.L.night ? 0.4 : 1));
  }
  /** Rim light on an edge facing the sun or the sky (0.5 px). */
  rim(x: number, y: number, w: number, a = 0.9) { this.fill(rect(x, y, w, 0.5), this.t.rim, this.L.night ? a * 0.5 : a); }
  /** A window or opening: a dark recess by day, a warm lamp at night when `lit`. */
  open(tr: Tracer, lit = false, warm = 0.85) {
    if (this.L.night && lit) { this.fill(tr, mix(this.t.win, warm, this.t.wall)); }
    else this.fill(tr, this.t.deep, this.L.night ? 0.6 : 0.85);
  }
  lamp(x: number, y: number, r: number, c: RGB, a = 1) { this.lamps.push({ x, y, r, c, a }); }
}

// ---------------------------------------------------------------- the glyphs (sun on the left)

/** Ottoman/Levant mosque (Al-Jazzar, Acre; Mahmoudiya, Jaffa): domed hall on an octagonal drum, slender
 * minaret with one corbelled balcony and a pencil cone. At 20 px: dome, needle, balcony notch, two arches. */
const mosque = (k: Kit, h: number) => {
  const { t, L } = k;
  k.box(-7, -5, 9, 5, 1.5, { shadeW: 1 });                  // prayer hall
  k.rim(-7, -5, 9);
  k.fill(rect(-7, -5.5, 9, 0.5), t.wall);                    // parapet
  k.fill(rect(-7, -5.5, 1.5, 0.5), t.lit); k.rim(-7, -5.5, 9, 0.6);
  k.round(rect(-5, -6.5, 5, 1), -5, 0);                      // drum
  k.fill(rect(-4.5, -6.25, 0.5, 0.5), t.deep, 0.5); k.fill(rect(-3, -6.25, 0.5, 0.5), t.deep, 0.5); k.fill(rect(-1.5, -6.25, 0.5, 0.5), t.deep, 0.5);
  k.round((c) => { c.beginPath(); c.moveTo(-5.2, -6.5); c.bezierCurveTo(-5.2, -8.9, -3.9, -9.6, -2.5, -9.6); c.bezierCurveTo(-1.1, -9.6, 0.2, -8.9, 0.2, -6.5); c.closePath(); }, -5.2, 0.2, { term: 0.55 });
  k.fill(rect(-2.75, -10.6, 0.5, 1), t.lit); k.fill(rect(-2.9, -11.1, 0.8, 0.5), mix(t.rim, 0.6, t.lit)); // finial
  for (const x of [-4.4, -1.6]) k.open(arch(x, -1.2, 1, 2.4), true);                      // hall arches
  k.open(arch(-0.2, 0, 1.2, 2.6), true, 0.6);                                                // door
  // minaret: square base, shaft, balcony on corbels, upper shaft, pencil cone
  const bal = -h * 0.68, top = -h + 4.6;
  k.box(1.9, -6, 2.6, 6, 0.9, { shadeW: 0.5 });
  k.round(rect(2.2, bal, 2, -6 - bal), 2.2, 4.2);
  k.fill(poly([2.2, bal + 1.2, 4.2, bal + 1.2, 4.9, bal, 1.5, bal]), t.shade);            // corbels, in shade
  k.round(rect(1.4, bal - 0.6, 3.6, 0.6), 1.4, 5);                                          // balcony ring
  k.rim(1.4, bal - 0.6, 3.6, 0.8);
  k.round(rect(2.45, top, 1.5, bal - 0.6 - top), 2.45, 3.95);
  k.round(poly([2.35, top, 4.05, top, 3.2, -h + 0.9]), 2.35, 4.05, { term: 0.5 });
  k.fill(rect(3.05, -h, 0.3, 0.9), t.lit);
  k.open(rect(2.95, bal - 3.4, 0.5, 1.2), false);
  if (L.night) { k.lamp(3.2, bal - 0.3, 2.2, [124, 224, 160], 0.75); k.lamp(-3.9, -2.2, 1.6, t.win, 0.35); }
};

/** Levant church with bell tower (St Peter's, Jaffa; Galilee village churches): gabled stone nave with a rose
 * window, long side with a tiled roof band, square tower with an arched belfry, low cap and cross. */
const church = (k: Kit, h: number) => {
  const { t, L } = k;
  // nave: gable end (lit, facing the sun) then the long side
  k.fill(poly([-6.5, 0, -6.5, -6, -4.6, -8.4, -2.7, -6, -2.7, 0]), t.stoneLit);
  k.fill(rect(-2.7, -6, 5, 6), t.stone);
  k.fill(poly([-4.6, -8.4, 1.8, -8.4, 2.3, -6, -2.7, -6]), t.roof);                         // roof plane
  k.fill(poly([-4.6, -8.4, 1.8, -8.4, 1.9, -7.9, -4.2, -7.9]), t.roofLit, 0.9);             // ridge catching light
  k.fill(rect(-2.7, -6, 5, 0.5), t.shade, 0.6);                                             // eaves shadow
  k.fill(poly([-6.5, -6, -4.6, -8.4, -4.6, -7.8, -6.1, -5.9]), t.rim, 0.7);                 // raking rim
  k.open((c) => { c.beginPath(); c.arc(-4.6, -5.6, 0.65, 0, Math.PI * 2); }, true, 0.7);    // rose window
  k.open(arch(-5.15, 0, 1.1, 2.6), true, 0.55);                                              // west door
  for (const x of [-1.6, 0.5]) k.open(arch(x, -1.6, 0.8, 2.6), true, 0.75);
  // tower
  const tt = -12.4;
  k.box(2, tt, 3.8, -tt, 1.3, { shadeW: 0.7, front: t.stone, sideC: t.stoneLit });
  k.rim(2, tt, 3.8);
  k.fill(rect(2, -8.6, 3.8, 0.5), t.shade, 0.5); k.fill(rect(2, -9.1, 3.8, 0.5), t.rim, 0.45); // string course
  k.open(arch(3.45, -9.3, 1.3, 2.4), true, 0.5);                                              // belfry
  k.fill(rect(3.5, -10.4, 1.2, 0.5), mix(t.lit, 0.5, t.deep), L.night ? 0.3 : 0.8);           // bell, a glint
  k.open(rect(3.85, -5.6, 0.5, 1.4), false);
  k.round(poly([1.8, tt, 6, tt, 3.9, tt - 1.7]), 1.8, 6, { term: 0.48 });                     // pyramid cap
  k.fill(rect(3.65, -h - 0.5, 0.5, 2.5), t.lit); k.fill(rect(3.2, -h + 0.1, 1.4, 0.5), t.lit);    // cross
  if (L.night) k.lamp(4.1, -8, 2.4, t.win, 0.28);
};

/** Israeli town synagogue (1950s-70s): flat-roofed concrete hall, tall round-arched windows, a small dome on a
 * drum, a stair block. At 10 px: the hall, three tall arches, the dome bump. */
const synagogue = (k: Kit, _h: number) => {
  const { t, L } = k;
  k.box(3, -8.3, 2.5, 8.3, 0, { shadeW: 0.8 });                                              // stair block
  k.rim(3, -8.3, 2.5, 0.6);
  k.box(-5.5, -7, 9, 7, 1.6, { shadeW: 0.6 });
  k.fill(rect(-5.5, -7.6, 9, 0.6), t.wall); k.fill(rect(-5.5, -7.6, 1.6, 0.6), t.lit); k.rim(-5.5, -7.6, 9);
  k.fill(rect(-5.5, -7, 9, 0.5), t.shade, 0.45);                                              // coping shadow
  k.round(rect(-2.2, -8.5, 2.8, 0.9), -2.2, 0.6);
  k.round((c) => { c.beginPath(); c.moveTo(-2.4, -8.5); c.bezierCurveTo(-2.4, -10.2, -1.6, -10.6, -0.8, -10.6); c.bezierCurveTo(0, -10.6, 0.8, -10.2, 0.8, -8.5); c.closePath(); }, -2.4, 0.8, { term: 0.55 });
  for (const x of [-3.4, -1.2, 1]) k.open(arch(x, -1.3, 1, 3.8), true, 0.8);
  k.fill(rect(-3.6, -1.3, 5.8, 0.5), t.rim, 0.35);                                            // sill line
  k.open(rect(3.9, 0, 0.8, -1.8), true, 0.5);
  if (L.night) k.lamp(-0.6, -3.4, 3, t.win, 0.22);
};

/** Israeli concrete mushroom water tower: tapering shaft, flared cone underside (in its own shadow), a
 * cylindrical tank with a joint band, a shallow roof and hatch, a base door. */
const waterTower = (k: Kit, h: number) => {
  const { t, L } = k;
  const s = h - 7.2;                                                                           // shaft height
  k.round(poly([-1.5, 0, 1.5, 0, 1.15, -s, -1.15, -s]), -1.5, 1.5);
  k.open(rect(-0.45, 0, 0.9, -1.6), L.night, 0.5);
  k.fill(rect(-1.4, -s * 0.5, 2.8, 0.4), t.shade, 0.3);                                       // pour joint
  // cone underside, faces down: shade, lit only at its sun-side lip
  k.fill(poly([-1.15, -s, 1.15, -s, 4.4, -s - 2.2, -4.4, -s - 2.2]), t.shade);
  k.fill(poly([-1.15, -s, -0.6, -s, -3.3, -s - 2.2, -4.4, -s - 2.2]), mix(t.lit, 0.35, t.shade));
  // tank
  k.round(rect(-4.5, -s - 5.6, 9, 3.4), -4.5, 4.5);
  k.fill(rect(-4.5, -s - 3.9, 9, 0.5), t.shade, 0.55);                                        // joint band
  k.fill(rect(-4.5, -s - 2.7, 9, 0.5), t.shade, 0.5);                                         // lower lip
  k.round(poly([-4.6, -s - 5.6, 4.6, -s - 5.6, 3.4, -s - 6.4, -3.4, -s - 6.4]), -4.6, 4.6, { term: 0.7 });
  k.rim(-3.4, -s - 6.4, 6.8, 0.8);
  k.fill(rect(-0.6, -s - 7.2, 1.4, 0.8), t.wall); k.fill(rect(-0.6, -s - 7.2, 0.5, 0.8), t.lit); // hatch
  if (L.night) k.lamp(0.1, -s - 7.4, 1.2, [255, 90, 74], 0.9);
};

/** Reading-type power-station stack: long turbine hall with a clerestory, one tapering concrete stack with a
 * service platform, a soot-dark crown and a heavier rim; aviation light at dusk and night. */
const chimney = (k: Kit, h: number) => {
  const { t, L } = k;
  k.box(-4.5, -3.6, 6.8, 3.6, 1.2, { shadeW: 0.4 });                                         // turbine hall
  k.rim(-4.5, -3.6, 6.8);
  k.fill(rect(-3.3, -3.1, 5.6, 0.7), t.deep, 0.55);                                           // clerestory band
  if (L.night) for (const x of [-2.9, -1.6, -0.3, 1]) k.fill(rect(x, -3.1, 0.7, 0.7), mix(t.win, 0.55, t.wall));
  k.fill(rect(-3.3, -3.1, 5.6, 0.25), t.rim, 0.3);
  const cx = 2.2, b = 3.4, top = 2.3;
  const at = (y: number) => b + (top - b) * (-y / h);                                        // width at height y
  k.round(poly([cx - b / 2, 0, cx + b / 2, 0, cx + top / 2, -h + 0.6, cx - top / 2, -h + 0.6]), cx - b / 2, cx + b / 2);
  const py = -h * 0.72, pw = at(py) + 1.2;                                                    // service platform
  k.fill(rect(cx - pw / 2, py, pw, 0.5), t.wall); k.fill(rect(cx - pw / 2, py, 0.6, 0.5), t.lit); k.fill(rect(cx - pw / 2 + 0.3, py + 0.5, pw - 0.6, 0.5), t.shade, 0.6);
  // soot crown: a fade from the rim down
  const g = k.c.createLinearGradient(0, -h, 0, -h + 3.2); g.addColorStop(0, css(t.soot, 0.85)); g.addColorStop(1, css(t.soot, 0));
  poly([cx - at(-h + 3.2) / 2, -h + 3.2, cx + at(-h + 3.2) / 2, -h + 3.2, cx + top / 2, -h + 0.6, cx - top / 2, -h + 0.6])(k.c); k.c.fillStyle = g; k.c.fill();
  k.fill(rect(cx - top / 2 - 0.2, -h, top + 0.4, 0.7), t.wall); k.fill(rect(cx - top / 2 - 0.2, -h, 0.7, 0.7), t.lit); // rim
  k.rim(cx - top / 2 - 0.2, -h, top + 0.4, 0.7);
  if (L.night || L.name === "dusk") k.lamp(cx, -h - 0.4, 1.3, [255, 90, 74], L.night ? 1 : 0.8);
};

/** Modern glass residential tower (Tel Aviv, 2010s): podium, slender glazed shaft whose sun-side face reflects
 * the sky, balcony bands, a set-back crown and a mast. Mirror with the seed for variety. */
const highrise = (k: Kit, h: number, seed: number) => {
  const { t, L } = k;
  const r = rng(seed * 97 + 5);
  k.box(-5, -2.6, 10, 2.6, 1.2, { shadeW: 0.6 });                                            // podium
  k.rim(-5, -2.6, 10, 0.7);
  k.fill(rect(-3.8, -1.6, 7.4, 1), t.deep, 0.5);                                              // lobby glazing
  const x0 = -3.4, x1 = 3.4, crown = -h + 2.6, side = 1.8;
  // shaft: lit side face reflects the sky (lighter toward the top), front is darker glass
  const g = k.c.createLinearGradient(0, crown, 0, -2.6);
  g.addColorStop(0, css(L.night ? t.wall : mix(t.glassLit, 0.85, t.rim))); g.addColorStop(1, css(L.night ? t.wall : mix(t.glassLit, 0.75, t.wall)));
  rect(x0, crown, side, -2.6 - crown)(k.c); k.c.fillStyle = g; k.c.fill();
  const gf = k.c.createLinearGradient(0, crown, 0, -2.6);
  gf.addColorStop(0, css(L.night ? t.wall : mix(t.glassLit, 0.35, t.glass))); gf.addColorStop(1, css(L.night ? mix(t.shade, 0.3, t.wall) : t.glass));
  rect(x0 + side, crown, x1 - x0 - side, -2.6 - crown)(k.c); k.c.fillStyle = gf; k.c.fill();
  k.fill(rect(x1 - 0.8, crown, 0.8, -2.6 - crown), t.shade, L.night ? 0.25 : 0.5);
  // balcony bands: slab edges every 1.5 px, lit on the side face, a hair of shade under each on the front
  for (let y = -4; y > crown + 0.6; y -= 1.5) {
    k.fill(rect(x0, y, side, 0.5), t.rim, L.night ? 0.15 : 0.35);
    k.fill(rect(x0 + side, y, x1 - x0 - side, 0.5), mix(t.wall, 0.6, t.lit), L.night ? 0.25 : 0.42);
  }
  // crown: set back, plant screen, mast
  k.box(-2.6, -h + 1.2, 5.2, 1.4, 1.1, { shadeW: 0.5 }); k.rim(-2.6, -h + 1.2, 5.2);
  k.fill(rect(x0, crown, x1 - x0, 0.5), t.rim, 0.6);
  k.fill(rect(0.9, -h - 1.6, 0.4, 2.8), t.wall); k.fill(rect(0.9, -h - 1.6, 0.2, 2.8), t.lit);
  if (L.night) {
    for (let y = -4.5; y > crown + 0.8; y -= 1.5) for (let x = x0 + 0.4; x < x1 - 0.6; x += 1.2) if (r() < 0.22) k.fill(rect(x, y, 0.8, 0.8), mix(t.win, 0.8, t.wall));
    k.lamp(1.1, -h - 1.8, 1.1, [255, 90, 74], 1);
  }
};

/** Hyperbolic natural-draught cooling tower (Hadera, Haifa Bay): waist at 65 %, concrete lift-line bands,
 * dark rim lip, raking legs over a dark air inlet. */
const cooling = (k: Kit, h: number) => {
  const { t, L } = k;
  const s = h / 14, base = 6 * s, waist = 4 * s, rim = 4.6 * s, wy = -0.65 * h;
  const shell: Tracer = (c) => { c.beginPath(); c.moveTo(-base, -1.2); c.quadraticCurveTo(-waist, -0.42 * h, -waist, wy); c.quadraticCurveTo(-waist, -0.86 * h, -rim, -h); c.lineTo(rim, -h); c.quadraticCurveTo(waist, -0.86 * h, waist, wy); c.quadraticCurveTo(waist, -0.42 * h, base, -1.2); c.closePath(); };
  k.round(shell, -base, base, { term: 0.6 });
  // lift lines: faint bands that follow the shell's width
  k.c.save(); shell(k.c); k.c.clip();
  for (let i = 1; i < 6; i++) { const y = -1.2 - i * (h - 1.2) / 6; k.fill(rect(-base, y, 2 * base, 0.4), t.shade, L.night ? 0.06 : 0.14); }
  k.c.restore();
  k.fill(rect(-rim, -h, 2 * rim, 0.5), t.rim, 0.7); k.fill(rect(-rim + 0.2, -h + 0.5, 2 * rim - 0.4, 0.6), t.shade, 0.7); // rim lip
  // air inlet with raking legs
  k.fill(rect(-base + 0.3, -1.2, 2 * base - 0.6, 1.2), t.deep, 0.9);
  for (let x = -base + 0.6; x < base - 0.4; x += 1.1) k.fill(poly([x, 0, x + 0.4, 0, x + 0.9, -1.2, x + 0.5, -1.2]), x < -base / 3 ? t.lit : t.wall, 0.85);
};

/** Crusader ruin (Yehiam, Montfort): ashlar keep stub with a broken crown and arrow slits, a ragged curtain
 * wall stepping down, a gate arch, fallen blocks. */
const castle = (k: Kit, h: number) => {
  const { t, L } = k;
  const keep: Tracer = poly([-8, 0, -8, -8.6, -7.2, -8.6, -7.2, -9.4, -6.1, -9.4, -6.1, -h, -4.9, -h, -4.9, -8.9, -3.9, -9.5, -3.3, -8.4, -3.3, 0]);
  k.fill(keep, t.stone);
  k.fill(poly([-8, 0, -8, -8.6, -7.2, -8.6, -7.2, -9.4, -6.6, -9.4, -6.6, 0]), t.stoneLit);
  k.fill(rect(-3.9, -8.4, 0.6, 8.4), t.shade, 0.5);
  const wall: Tracer = poly([-3.3, 0, -3.3, -5.8, -2.4, -5.8, -2.4, -6.4, -1.4, -6.4, -1.4, -5.6, -0.2, -5.9, 0.6, -5.1, 1.8, -5.4, 2.6, -4.3, 3.9, -4.6, 4.6, -3.2, 5.6, -3.4, 6.2, -2, 7.2, -2.2, 7.6, -0.8, 8, 0]);
  k.fill(wall, t.stone);
  k.fill(poly([-3.3, -5.8, -2.4, -5.8, -2.4, -6.4, -1.4, -6.4, -1.4, -5.6, -0.2, -5.9, 0.6, -5.1, 1.8, -5.4, 2.6, -4.3, 3.9, -4.6, 4.6, -3.2, 5.6, -3.4, 6.2, -2, 7.2, -2.2, 7.6, -0.8, 7.6, -0.3, 7.2, -1.7, 6.2, -1.5, 5.6, -2.9, 4.6, -2.7, 3.9, -4.1, 2.6, -3.8, 1.8, -4.9, 0.6, -4.6, -0.2, -5.4, -1.4, -5.1, -1.4, -5.9, -2.4, -5.9, -2.4, -5.3, -3.3, -5.3]), t.rim, 0.55);
  // ashlar courses, broken where the light hits
  k.c.save(); keep(k.c); wall(k.c); k.c.clip();
  for (let y = -1.3, i = 0; y > -h; y -= 1.3, i++) k.fill(rect(-6.4 + (i % 2) * 0.6, y, 15, 0.3), t.shade, L.night ? 0.06 : 0.13);
  k.c.restore();
  k.c.save(); keep(k.c); k.c.clip(); k.fill(poly([-8, 0, -8, -8.6, -7.2, -8.6, -7.2, -9.4, -6.6, -9.4, -6.6, 0]), t.stoneLit, 0.55); k.c.restore();
  for (const y of [-7.3, -4.4]) k.open(rect(-5.3, y, 0.5, 1.4), false);                     // arrow slits
  k.open(arch(0.6, 0, 1.6, 2.8), false);                                                      // gate
  k.fill(rect(5.6, -0.9, 1.1, 0.9), t.stone); k.fill(rect(5.6, -0.9, 0.4, 0.9), t.stoneLit); k.fill(rect(7.1, -0.6, 0.8, 0.6), t.stone); // fallen blocks
};

const DRAW: Record<Kind, (k: Kit, h: number, seed: number) => void> = { minaret: mosque, church, synagogue, waterTower, chimney, highrise, cooling, castle };

/** Material grain clipped to what is already drawn: 0.5 px cells +- 4 %, over a 2 px mottle. */
const grain = (c: Ctx, w: number, h: number, seed: number, amt: number) => {
  const r = rng(seed * 131 + 17), cell = 0.5, mot = 2;
  const nx = Math.ceil(w / mot) + 1, ny = Math.ceil(h / mot) + 1, M = Array.from({ length: nx * ny }, () => r() - 0.5);
  c.save(); c.globalCompositeOperation = "source-atop";
  for (let y = -h; y < 1; y += cell) for (let x = -w / 2; x < w / 2; x += cell) {
    const m = M[Math.floor((x + w / 2) / mot) + Math.floor((y + h) / mot) * nx] ?? 0;
    const v = (r() - 0.5) * 0.7 + m * 0.6;
    c.fillStyle = v > 0 ? `rgba(255,255,255,${(v * amt).toFixed(4)})` : `rgba(0,0,0,${(-v * amt * 1.2).toFixed(4)})`;
    c.fillRect(x, y, cell, cell);
  }
  c.restore();
};

/**
 * Draw one glyph with its base at (x, y) in the main canvas's logical px, at `zoom` (1 = scene size). The glyph is
 * drawn into its own surface at device resolution, so grain and haze touch only the glyph, then placed 1:1.
 * Night lamps and their halos go on the main canvas after it.
 */
export const drawGlyph = (main: Ctx, env: Env, kind: Kind, x: number, y: number, L: Light, opts: { zoom?: number; seed?: number; h?: number; mirror?: boolean } = {}) => {
  const zoom = opts.zoom ?? 1, seed = opts.seed ?? 7, spec = SPECS[kind], h = opts.h ?? spec.h, s = env.scale * zoom;
  const t = tonesOf(L);
  const padX = spec.w / 2 + 3, padTop = h + 3.5, padBot = 2.5;
  const ox = Math.round(padX * s), oy = Math.round(padTop * s);
  const Wd = Math.ceil((2 * padX) * s), Hd = Math.ceil((padTop + padBot) * s);
  const mx = Math.round(x * env.scale), my = Math.round(y * env.scale);
  // cast shadow and contact first, on the ground, away from the sun
  main.save(); main.setTransform(s * (opts.mirror ? -1 : 1), 0, 0, s, mx, my);
  if (L.cast > 0) {
    const reach = Math.min(12, L.cast * h * 0.6), half = spec.w / 2;
    const g = main.createLinearGradient(half - 1, 0, half + reach, 0); g.addColorStop(0, css(t.shade, 0.75 * L.sunK)); g.addColorStop(1, css(t.shade, 0));
    main.beginPath(); main.moveTo(-half + 1, 0); main.lineTo(half, 0); main.lineTo(half + reach, 0.8); main.lineTo(half + reach - 1.2, 1.4); main.lineTo(-half + 1, 1.4); main.closePath(); main.fillStyle = g; main.fill();
  }
  main.fillStyle = css(t.shade, 0.8); main.fillRect(-spec.w / 2 - 0.2, -0.3, spec.w + 0.6, 0.9);
  main.restore();
  // the body on its own surface
  const layer = env.canvas(Wd, Hd), c = layer.ctx;
  c.setTransform(s * (opts.mirror ? -1 : 1), 0, 0, s, opts.mirror ? Wd - ox : ox, oy);
  const k = new Kit(c, t, L);
  DRAW[kind](k, h, seed);
  grain(c, spec.w + 4, h + 3, seed + kind.length * 13, L.night ? 0.05 : 0.08);
  c.save(); c.globalCompositeOperation = "source-atop";
  c.fillStyle = css(L.hazeTo, L.haze); c.fillRect(-padX, -padTop, 2 * padX, padTop + padBot);
  const mist = c.createLinearGradient(0, 0, 0, -Math.min(8, h * 0.4)); mist.addColorStop(0, css(L.hazeTo, L.mist)); mist.addColorStop(1, css(L.hazeTo, 0));
  c.fillStyle = mist; c.fillRect(-padX, -padTop, 2 * padX, padTop + padBot);
  c.restore();
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  main.drawImage(layer.canvas, mx - (opts.mirror ? Wd - ox : ox), my - oy);
  // lamps: a soft halo then the hot core
  main.setTransform(s * (opts.mirror ? -1 : 1), 0, 0, s, mx, my);
  for (const l of k.lamps) {
    const g = main.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0, css(l.c, 0.55 * l.a)); g.addColorStop(0.35, css(l.c, 0.18 * l.a)); g.addColorStop(1, css(l.c, 0));
    main.fillStyle = g; main.beginPath(); main.arc(l.x, l.y, l.r, 0, Math.PI * 2); main.fill();
    if (l.r < 1.7 || l.c[0] < 200) { main.fillStyle = css(l.c, Math.min(1, l.a + 0.1)); main.fillRect(l.x - 0.25, l.y - 0.25, 0.5, 0.5); }
  }
  main.restore();
};
