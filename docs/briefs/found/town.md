# Town: a forest of thin towers (writer "town")

Read COMMON.md, town.diagnosis.md and town.patch in this folder first.
Commit 1: the fix as diagnosed (width on the height's scale, `planPx`, `FRONT_M`, folded towers' plan width, trimmed rather than dropped near
text), with tests (a)(b)(c). Also the body width may not jump at the 12.5 m threshold (test 12.4 / 12.6 m). Derive FRONT_M from the
raster's own size-class bounds in code, not a copied list, if the bounds exist in code.
Commit 2 (audit row "thin squares"): `heightAt` (`src/world/outside.ts` ~156) uses the raster's height when `levels > 0 || p90 > 0` even where
the built share is < .2 (the share stays for frontage); remove the dead `rasterBoxes` path if it truly has no caller. Test: share 2/15 with
levels 5 gives a roof above 7.7 m. Report how many boxes change, per place.
The towers list must stay (tel-aviv's 26, haifa's 10, jerusalem's 9 all kept). Another writer, "light", changes `outsideShape.ts` and
`world/outside.ts` near `townGroundKm`, `drawnTerrain` and the veil distance: keep away from those lines. No painter is touched.
Report boxes, median h/w and h/w > 3 per place before/after, and buildWorld ms.
