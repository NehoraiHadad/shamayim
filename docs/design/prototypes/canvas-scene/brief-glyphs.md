# Brief: shamayim scene glyphs, canvas redraw, sheet v1

- **Kind:** still sheet (one approval still). Not a film, no sound.
- **Medium:** drawn (canvas 2D, code-drawn shapes in the scene's flat-tone hand), pre-rendered per glyph.
- **Style:** adapted from the app's own scene stills (house hand, not one of the 32 plates).
  Reason: the owner chose "match the existing scene"; the glyphs must drop into the current SVG/WebGL
  valley without changing its character, so the hand is borrowed from the scene itself.
- **Owner's words:** the owner's choice reached me relayed in English, not in the original Hebrew, so
  no Hebrew is quoted here to avoid inventing it. As relayed: *"match the existing scene: bluish-grey
  silhouettes, soft light from one side, haze with distance; add fine detail and gentle grain; they must
  sit in the current scene without changing its character."*
- **Size constraint:** each glyph is 10-30 CSS px tall in a 375 px wide scene (2x/3x DPR on phones).
  Silhouette first, then lit side / shade side, then at most a few openings or ribs.
- **The point of the sheet (one idea):** the same landmark kinds, drawn with more craft, still read as the
  same scene. One light: the sun on the LEFT (the app mirrors glyphs when the sun is east).

## The hand (MEDIUM RECIPE, from stage2c/after-*.png and stage2b/*.png)

- **MARK:** flat, opaque tone shapes with hard pixel edges; no outline. Forms are cut from the ridge colour
  and lifted toward the sky by a fixed share (wall = 18 % horizon into ridge-near, lit = 30 % sun into
  ridge-near, shade = 28 % black into ridge-near: the app's own `marks.module.css` formula).
- **EDGE:** hard on the silhouette; the only soft edges are the light falloff across a round body and the
  ground mist at the foot.
- **ORDER:** cast shadow on the ground -> body in wall tone -> lit face (sun side) -> core shadow on the far
  side -> openings (dark) -> rim light on sun-facing top edges -> grain -> haze and foot mist -> night lights.
- **PAPER:** none; the scene's sky and ridge are the ground. Grain is in the material (concrete, ashlar),
  +-4 % in 0.5 px cells plus a 2 px mottle, so it is invisible at 1x and felt at 2x/3x.
- **PALETTE (sampled):** day ridge #2D3644, glyph wall #45505E, lit #636A74, shade #1F2630, sky at ridge
  #49698D. Dusk ridge #1C1428, glyphs violet-dark #241B30 with a warm lit edge from the #F2994A horizon.
  Night ridge #0B0E1C, wall #131628, windows #FFD9A0, minaret lamp #7CE0A0, aviation #FF5A4A.
- **NOT:** not a new style; nearest plate is none (flat-tone scene art). Differs from the current SVG only
  by modelling (gradient falloff on round bodies, rim light, reflected light), more accurate
  silhouettes, and grain. No outlines, no texture that fights the 10-30 px size.

## Real-world reference (opened from knowledge, per object)

| Glyph | Reference |
|---|---|
| mosque (`minaret`) | Ottoman/Levant: Al-Jazzar Mosque, Acre (domed hall on a drum, slender pencil minaret, one serefe balcony on corbels); Mahmoudiya Mosque, Jaffa; Galilee/Triangle village mosques |
| church | Levant church with bell tower: St Peter's, Jaffa; Galilee village churches (Fassuta, Mi'ilya): gabled stone nave with a rose window, square tower, arched belfry, small cap and cross |
| synagogue | Israeli town synagogue of the 1950s-70s: flat-roofed concrete hall, tall round-arched windows, small dome on a drum, stair block |
| water tower | Israeli concrete "mushroom" water tower (kibbutz/town type, e.g. Givat Brenner, Ein Shemer): tapering shaft, flared cone underside, cylindrical tank, shallow roof with hatch, base door |
| chimney | Reading power station, Tel Aviv: long turbine hall with clerestory, single tapering concrete stack, service platform, soot-dark crown, aviation light |
| highrise | Modern glass residential tower (Tel Aviv slender towers, 2010s): podium, glazed shaft with balcony bands, sky-reflecting side, set-back crown with mast |
| cooling | Hyperbolic natural-draught cooling tower (Hadera / Haifa Bay): waist at ~65 %, lift-line bands, dark rim lip, raking legs over a dark air inlet |
| castle | Crusader ruins: Yehiam (Judin) and Montfort: ashlar keep stub with arrow slits, broken curtain wall, gate arch |

## Deliverable

`out/sheet-v1.png` from `node tools/still.mjs sheet --scale 2`, copied to
`/home/user/shamayim/docs/design/qa/glyphs/sheet-v1.png`. Columns: current SVG (rendered from the app's
components), new at scene size on a real scene crop, new at 4x, new at dusk, new at night.
