# Panorama near skyline: plan (Fable, 2026-11-19)

Problem: in panorama mode the near city fabric and neighbours are gated off (`hillScene.ts`, `homeMode.ts`), so a city
shows a dot-centred template plus isolated towers (stills `qa/skyline/before-*.png`). The raster squares keep their
coordinates, so the skyline can be built along each true-bearing ray. Constants are starting values, tuned on stills.

## 1. Physical model per 2-px column
- Reach: raster from R0 = RAY_DISTANCES[0] = 0.4 km to R1 = 6 km. `loadCity` fetches `cellsForBand(place, 6)` and keeps
  every decoded grid (bearing-addressable lookup, global square coords gx = lon/LON_STEP, gy = lat/LAT_STEP). Only the
  `fabricCells` subset goes to `computeColumns`/`findClusters` (cross-section mode unchanged).
- Ground: `seenAt` is null inside the near ridge, so expose `groundAt(x, km) → relM` (metres relative to the eye, from
  the interpolated profile via `relativeHeight`), no near gate. Under a building G(d) = min(relM(d−0.1), relM(d),
  relM(d+0.1)) (sheds DEM building bumps).
- Roof height per square: typ = levels·3.1 + 1 if levels > 0, else clamp(p90, 7, 10) if p90 > 0, else 10 m.
  hi = clamp(p90, typ, 60) (towers `t` carry anything taller). Per (column, square) h = typ + (hi − typ)·u², u a hash.
- Top angle θ = apparentAngle(G(d) + h − ΔE, d, 0); y = yOf(θ) (same `anglePx` as the land).
- Partial cover over along-ray length L m: P = 1 − (1 − c)^(L/20); solid where hash(col, gx, gy) < P.
- Occlusion: running H = max(terrain angle re-angled with ΔE, solid tops so far); a solid square is seen when θ > H.
- Silhouette: three depth bands, per column {top: max visible θ, km, cover}.

## 2. Eye: roofline vantage
At 2 m eye the nearest blocks are a 25-px wall set by the arbitrary 0.4 km cutoff. ΔE = min(20, cover-weighted median
typ of squares within 300 m); 0 where mean cover within 300 m < 0.1. Squares under 0.4 km are skipped (home glyph stands
for them). Any visible solid square gets ≥ 1.5 px above its foot. Known residual: the land line stays in the 2 m frame
(ΔE/d, ~0.4° at 2 km).

## 3. Layers and tone
Bands A 0.4–1.2 km, B 1.2–3 km, C 3–6 km, painted C, B, A. Foot: ground y at the square's own km when km ≤ nearKm(x),
else the drawn ridge `ground(x)` (only the part above the crest drawn). Day opacity A 1, B .78, C .55 × plainContrast(km,
V)/plainContrast(.8, V). y quantised to 0.5 px, equal runs merged into H/V steps.

## 4. Towers
True angle apparentAngle(G + heightM − ΔE, d, 0) replaces `skyHeight` in panorama mode; every tower 0.4–6 km whose top
clears the terrain; base by the foot rule; w = clamp(SHAFT·1.5/km, 2, SHAFT); ≤ 14 Highrise glyphs, the rest 2-px slabs.

## 5. Night
Per band and column the face strip (top down to max(foot, nearer band's top)) as PlainPatch-like records into
`plainLights`; area so built·area·10 = litShare·cover·facePx²/k (k = 9, 7, 6); rows snapped to a storey pitch; ≤ 220 dots.

## 6. Joins
Masses behind the home settlement; band A tapered by smoothstep inside centerX ± (homeHalf + 6). `plainPatches` gets
`fromKm` = R1 where the city raster covers the place, so nothing doubles or gaps.

## 7. Files
`terrain/sightProfile.ts` (profile + cache extracted from visibility.ts, `groundAt`), `city/rayWalk.ts` (cellSpans
generalised, shared with plainData), `city/cityRaster.ts`, `city/skylineHeight.ts`, `city/skylineData.ts`,
`city/skylineTowers.ts`, `ui/scene/marks/city/{skylinePaths.ts,skylineLights.ts,Skyline.tsx}`; homeMode stays
`template` in panorama; neighbours stay off (the raster draws them at true bearing).

## 8. Risks
DEM includes buildings (+3–8 m) — min filter + differential eye. 6.5× vertical stretch makes towers needles (width
clamp). tanh compresses above ~6°. Unmapped levels fall to the 10 m prior.
