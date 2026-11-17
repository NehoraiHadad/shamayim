# Glyph QA notes (branch `feat/illustration-glyphs`)

Sheets: `specimens-generic.png`, `specimens-curated.png` (each glyph at 6x and 1x, day sun in the west / night lights on,
rendered from `docs/design/qa/specimens.html?set=generic|curated` on the dev server). Scene stills: `before-*.png` /
`after-*.png` for Jerusalem, Tel Aviv, Haifa, Shadmot Mehola, Rosh Pina at 10:00 and 21:00 (375 px, DPR 3).

## Light (applies to every px glyph)
One named light, the sun. `LightRig.tsx` clips to the glyph's own silhouette: lit strip on the sun side (R4), core
shadow (`--mark-shade` at .55) on the far quarter, so each body shows lit / body / shade. `ContactShadow` puts a 1.5 px
shade band under every base on `line` and `face` planes, reaching away from the sun. Off at night, overcast and haze.
Bodies of stone, concrete and glass now use `--mark-wall` / `.glass` (sky-tinted), not the flat ridge tone; ridge
`--ridge-near` is kept only for dark parts (rims, roof plant, gallery, lattice steel).

## Realism stated per subject (parts drawn, reference looked at)
| Glyph | Parts (each has a reason) | Reference |
|---|---|---|
| highrise | slab, floor bands (scale), off-centre roof plant, lower rear slab (never a bare pole, R5) | generic Israeli office slabs |
| chimney | turbine-hall block, tapered stack 3.5 → 2.5, rim cap, soot band | Reading D, Orot Rabin photos |
| cooling | hyperboloid shell, waist at 65 %, rim lip, dark air-inlet band at the foot | Bazan Haifa, natural-draught towers |
| silo | flat-topped bins with joints, conveyor gallery on top, head house, stair tower | Dagon, kibbutz feed mills |
| turbine | tapered white tower, nacelle, 3 tapered blades 120° apart, motion ghosts when turning | Golan / Upper Galilee farms |
| mast | open lattice legs, two cross bars, spike | telecom lattice masts |
| lighthouse | white taper, gallery, glazed lantern (lit at night), dome cap, keeper's house | Jaffa / Stella Maris |
| bridge | deck with girder edge, two piers, pylon, stays | generic cable-stayed |
| palms | 3 curved trunks of seeded height, drooping fronds, separate crowns (lean / sway) | Jordan Valley date groves |
| Chords Bridge | inclined white pylon, harp of stays to the deck, one back-stay, deck edge | Wikipedia (118 m, 66 cables) |
| YMCA | low hall, domed wing, bell tower (46 m, data), belfry openings, small dome, finial | photos; Wikipedia gives no tower detail |
| Tower of David | crenellated walls, square Phasael tower, Ottoman minaret: shaft, balcony, lantern, cap | photos |
| Wall + Dome | floodlit retaining wall with a course line, blue-tiled octagon, drum, gilded dome, finial | photos |
| Shalom Meir | banded slab, set-back roof storey | skyscrapercenter (142 m) |
| Reading | turbine hall with roof, single stack, rim | Wikipedia (no chimney data) |
| Azrieli Sarona | two glass blocks curving on different axes, seam at the core, roof crown | skyrisecities 2016, Wikipedia |
| Azrieli Center | podium, round tower with flat crown, triangle as two faces at a sharp edge, square, mid band | Wikipedia (187 / 169 / 154 m) |
| Báb shrine | 3 garden terraces on the face, granite arcade, corner pinnacles, octagon, drum windows, gold dome, lantern | Wikipedia, Bahá'í WNS |
| Dagon silo | bin block with joints, taller elevator house with roof box | hamichlol (65 m; another source 70 m) |
| Sail Tower | straight concrete spine, curved glass sail, narrow top | photos |
| Bazan cooling | the generic hyperboloid at 20 px (one of two towers collapsed June 2020; the other stands) | ToI, JPost 2020 |
| Shadmot homes | four red-tile houses around the synagogue hall | moshav layout, ILLUSTRATION.md §3 |

## Self-critique (not approval)
- Good: Wall + Dome, Tower of David, Báb shrine, Sail, Azrieli read at 1x; night lights carry the cities.
- Weak: Sarona's "twist" is only two S-edges; at 1x it reads as a plain slab. Highrise rear slab and Dagon read alike.
- Weak: the lit strip is a hard vertical split on wide bodies (cooling tower, bins); a curved body would want a softer
  turn, but no gradients are allowed.
- Palms are crescent fronds (closer to an icon than to a date palm); fine at 11 px, weak at 6x.
- Placement issues outside the glyphs (owned by `placeMarks`): Haifa's elevation label sits on the Báb shrine; Dagon
  is dropped by spacing; Tel Aviv's dot is not inside its towers.

## Unverified
Chords pylon lean direction and angle; YMCA / David / Wall heights; Reading chimney height and banding; Azrieli
west → east order; which Sail edge faces west; which end of Dagon carries the head house; Báb total height (data says
11 m, which Wikipedia gives for the drum only).

## City glyphs, critic round 2 (`specimens-cities-r2.png`)
Now self-lit (sun on the left, mirrored for an east sun; no LightRig mask): Azrieli, Sarona, YMCA, Tower of David,
Dagon, palms (generic and Shadmot). Changes:
- Azrieli: round tower has a 1.5 px lit band and a 1 px core shadow; the crown has a lit top, a body side and a shade
  corner. The square tower stands 1 px lower. The podium, the triangle's lit edge, and the square's side face are drawn.
- Western Wall: 0.5 px course lines at y −1.5 and −3, irregular ashlar joints per course, a hyssop tuft. The bridge
  spacing is set by placement, not by this glyph, so it is left to the placement owner.
- Sarona: a 0.6 px S-curve seam. The west block is lit along its curved edge; the east block sits in shade that follows the seam.
- Palms: six tapered fronds per crown, all of different lengths (seeded), that arch and droop. West fronds take a lit
  tint, east fronds a shade tint. Each crown has a knob of old frond bases, the trunks are bent, and each trunk has a
  dark foot.
- Highrise: podium, window grid (mullions and spandrels), two setbacks and roof plant; the rear slab was removed.
  Dagon: four round-capped cylindrical bins, each lit, body and shade, plus a tall head house with a roof box and
  stair windows.
- YMCA: a straight square bell tower with a cornice, paired arched belfry openings, a drum and a small dome. Tower of
  David: a minaret on a square footing, a round corbelled gallery, two stepped upper stages, a cap and a finial.
Still weak: the Azrieli crown reads square at 1x. The palm lit tint is faint at 1x. Under overcast skies the palm lit tint
turns to the wall tone (`.flat`). The YMCA belfry arches are 1 px wide, so they merge into the tower at 1x.
