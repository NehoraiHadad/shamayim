# The real style

The default style of the scene. Phase 1 (this document, the fault map, a concept) changes nothing in `src/scene`; phase 2 builds it
after the owner's approval. Concept: `docs/design/prototypes/real/` (`stills.mjs` renders it on the real harness and model).
Fault map, crops and side-by-sides: the shared notes folder, `real/`. Binding: physics places, the painter softens; pleasant over exact;
no fact lost, none invented; seeded, no clock, no `ctx.filter`.

## 1. The hand

Looking out of the window on a clear-eyed day. The picture is made of **light going through and round things**, never of marks.

| | Real | Drawn (kept apart from) |
|---|---|---|
| Edge | no outline: a form ends where its light ends, soft in the air | a chosen edge, flat planes |
| Cloud | a body the light enters: bright rim toward the sun, its own shaded core, thin parts let the sky through | flat tones in steps, a cut shape |
| Shade | the same colour with less sun and more sky: cooler, never grey paint | a second flat colour |
| Distance | every contrast fades into the air's own colour: first the darks, then the detail | fewer tones |
| Texture | exists only as relief the light rakes over; gone by the horizon; no film grain, no paper | paper, grain, brush |
| Colour | the day's: clean blue, white whites, ground greens and ochres half as saturated as the sky | a limited palette |
| Night | light adds: pools on the ground, a glow in the air over the town, broken paths on water | drawn windows |

Tests of the hand: squinting at 375 px, you can tell **where the sun is** from the clouds and the ground alone; the darkest and the
lightest thing in a day picture are both clouds or the sun, never a smudge; there is no repeated stamp; nothing looks pencilled.

## 2. Layers

Order by gain at phone size. "Contract" = a need outside `paint/real` that goes to the manager first.

| # | Layer | Painter plan | Contract |
|---|---|---|---|
| 1 | `cloudSheet` | Raster 0.6 px/px: coverage softened by the deck's own scale, its edge carried by two octave-blended noises (never a per-row scale: it shears to streaks). Light: two short marches (toward the sun, up) and a blurred depth; `shade = ½ tone + own depth`, crowns over `lit`, rims at thin edges. Low over the horizon depth, relief and crowns fade into the air | (a) |
| 2 | Sky | Not painted by a style: the base is a CSS background from the shared stops. The style grades the stops: blues only, by day only (chroma +0.28, mid lift +0.2), dusk and night untouched | (b) |
| 3 | `plane` | The model's palette, light field, snow and haze on a finer raster; its surface patches lie along the slope and shrink to the crest; relief raked by the sun; the haze deeper at a far plane's foot; mid tones opened by day | (a) |
| 4 | `outside` by night | Added light: pools between houses, air glow, a bloom on lamps, paths on the sea; from the model's share of lit windows and their colour | none |
| 5 | `cloudCells` | Lumps packed inside the model's own heads on a spine, joined soft-max to one surface; lit from the model's side; creases, lower column and foot in its shade; inward tearing only, so the outline stays the model's | none |
| 6 | `canopy`, trees | Leaf clumps in three passes, broken edge, soft under-shade; the model's inks; palms by today's hand until they get their own | (a) |
| 7 | Sea (`outside`, `water`) | Waves that shrink to the horizon, the far edge melted into haze, a wet shore with foam, the sun's path | (a) |
| 8 | `outside` by day | Bodies seated: foot darker, top open to the sky, sun side warm. Weakest gain: the fronts need the model's albedo (fault map, model 8). Phase 2 adds shade between neighbours and roofs by their own normal | (a) |
| 9 | Dusk and dawn clouds | Under-lighting when the sun is below the base: the march turns, lit colour from below. Needs distinct lit and shade colours (model 4) | (a) + model |
| 10 | Fog | Three or four veils by distance, each with a soft uneven top, the near ones thinner; planes and bodies fade by their own distance, not under one sheet | asks: `mist.ts` is shared |
| 11 | Rain | Curtain: finer and denser fibres, gentle gather (done in the concept). Near rain: three depths of falls, the far ones a tone and not dashes; wet air lowers contrast | `fall.ts` is shared |
| 12 | Dust | One air over everything (haze colour and depth), no stains on bodies | model 6 |
| 13 | Snow | As the plane's own cover: soft edge by slope, blue shade; add a snow moment to the set first | none |
| 14 | Landmarks | Their town's light by night, a seat and a sun side by day, in the same pass as the bodies | none |
| 15 | Moving things | Birds stay. Smoke gets a sun side and thins with height | `smoke.ts` is shared |

### Contract needs (to the manager before phase 2)

- **(a) The lamp.** The sun's (else the moon's) place in sky px and its altitude in the descs of `cloudSheet`, `plane`, `canopy`,
  `outside`, `water`, or once in `PaintEnv`. The concept reads the world itself (`facts.ts`), which a painter must not.
  It belongs in each layer's key, or a scrub keeps the old light.
- **(b) The sky's grade.** `Style.sky?: (rgb) => rgb` applied by `skyBackground(desc)` to its stops, and to whatever else reads
  the sky's colour (haze, sea far edge), so they stay one air. The concept regrades the DOM, which phase 2 must not.
- **(c) Shared pieces with a style's own part.** Fog, near rain and smoke are shared painters. Either they become per-style kinds (as
  `shafts` is) or take a small look, as `paintShafts(…, FIBRES)` does. Preferred: the look parameter.
- **(d) The plane's surface.** `planeMaterial`'s mottle is shared; the concept switches it off with `grainAmount: 0`. That is enough.

## 3. Truth checks

Every painter in phase 2 keeps, with a test beside it:
- a sheet's mean drawn opacity within ±0.04 of today's, and a full core or an open sky stays so: the noise moves the rim only;
- a tower's top, base and width within 2 px of `headsOf`; the rain curtain at least as visible as today (mean |ΔL| under it);
- no lit point under a closed deck brighter than the model's `lit`;
- windows: exactly the model's lit ones; the glow scales with their share and is 0 by day;
- ground: the mean colour of a plane within 0.03 of today's per band, snow and fields where they are.

## 4. Perf

Budgets are `e2e/scene.perf.mjs`; phase 2 is no worse than its base on CI in every gated row (firstPaint, scrub.sky, scrub.land, scrub.model,
anim 4 ms, memory 48 MB). Mean ms a paint, concept against today, same desktop, one run each (so ±20 %), noise tiles included:

| | today | concept | how it comes down |
|---|---|---|---|
| `cloudSheet` | 86–144 | 216–294 | tiles built once (200 ms, warm on idle in the worker); `bend` and swell on the half raster; depth of a step as a lookup, not `smoothstep`/`**`; raster 0.5 |
| `plane` | 20–33 | 69–278 | surface noise on the 3 px texel grid and bilinear between; relief by rows; raster 0.8; far planes at texel size |
| `cloudCells` | 120–163 | 225 | 60 000 px cap already; fewer lumps under another lump |
| `outside` | 45–106 | 55–137 | gradients per tone and size bucket, not per body |
| `canopy`, `water`, `shafts` | 4–29 | 4–24 | nothing |

Sky layers paint in the worker and land light is scrubbed, so **`plane` is the risk** (scrub.land 10 ms gated): its surface (noise, relief
slope) is form and is kept; only the light per texel is redone while scrubbing. If it cannot be met, `plane` ships at texel
resolution with the finer surface as a kept overlay. The first phase 2 step is this, before any other painter.

## 5. Order in phase 2

1. Contract (a) and (b) by whoever the manager names; today's pictures byte-identical.
2. `plane` in budget (the risk), then `cloudSheet` with the sky's grade: the first owner look.
3. `cloudCells` and `shafts`; night `outside`; `canopy` and trees; sea; `outside` by day.
4. Dusk, fog, near rain, dust, snow, smoke, as the shared pieces open.
5. Still set before and after on CI (both styles; drawn byte-identical), perf, a second-model review, READY.

## 6. Known weak points of the concept

- Buildings gain little by day; tel-aviv's fronts stay brown (model).
- The giant column (rosh-pina), the vase (storm) and the egg (night) are the model's shapes: better light does not cure them.
- Palms keep today's hand. Jerusalem noon, dusk, fog, dust, snow and near rain are planned, not drawn.
- The plane and the sheet cost more than today (§4).
