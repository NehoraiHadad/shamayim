// SHAMAYIM · the film's score, composed for this brief (promo/BRIEF.md; references/music/compose.md).
//
// The brief as numbers: a ~16-19 s social film at 90 bpm in 4/4 (a bar is 2.67 s, a beat 20 frames at 30 fps).
// Picture beats: dawn over the Gilead (bar 1), the thumb drags the day (bars 2-3), the clothesline and dusk
// (bar 4), the fast flick through other places (bar 5), the sun lands as the degree mark (bar 6 downbeat).
// Owner's words: lo-fi, warm, calm, and "not generic"; birds when they pass (added in the film's mix, not here).
//
// What keeps it from being generic lo-fi:
//  - a real upright piano carries both the chords and the tune (one player at dawn, not a pad and a pluck);
//  - Eb LYDIAN: the raised 4th (A natural) is the light coming over the ridge; the I-II vamp (Eb - F/Eb) is the
//    sky brightening with the bass held, the borrowed Ab of dusk is the ache, home Eb when the sun lands;
//  - the SUN motif rises the way the sun does: a pickup, a climb of a 4th, a step back; at night it is turned
//    upside down (it sets), and its last word is the landing.
// The 8-second sample (`sampleScore`) is the opening: dawn alone on the piano, then the groove arrives.
import type { Material } from "./music";

const CHORDS: Material["chords"] = {
  // home: Ebmaj9, rootless, the 9th (F) on top
  Home: { voicing: "[G3 Bb3 D4 F4]", bass: "Eb2:2.5 Bb2:.5 Eb3:1" },
  // the lydian II over the held Eb: G->A and Bb->C step up, D and F stay (the light)
  Light: { voicing: "[A3 C4 D4 F4]", bass: "Eb2:1.5 Eb2:.5 r:.5 Bb2:.5 Eb3:1" },
  // vi, the warm middle of the day
  Day: { voicing: "[G3 Bb3 D4 Eb4]", bass: "C2:1.5 G2:.5 C3:1 Bb2:1" },
  // borrowed iv colour for dusk: Abmaj7#11 (the D natural keeps it lydian)
  Dusk: { voicing: "[G3 C4 D4 Eb4]", bass: "Ab1:2 Eb2:1 Ab2:1" },
  // the lean before home: Bb13sus
  Lean: { voicing: "[Ab3 C4 Eb4 G4]", bass: "Bb1:3 F2:1" },
};

const MOTIFS: Material["motifs"] = {
  // the sun rises: an upbeat pickup, a climb of a 4th, a step back, a long note
  rise: "r:1 Bb4:.5 C5:.5 F5:1.5 Eb5:.5",
  // the answer: a step higher, through the lydian A, home to D (the 7th of home, open)
  answer: "r:.5 C5:.5 D5:.5 A5:1 G5:.5 F5:1",
  // sequence a third up, the high point late
  higher: "r:1 D5:.5 Eb5:.5 A5:1 Bb5:1",
  rest: "r:4",
};

const base = (title: string): Omit<Material, "sections"> => ({
  style: "lofiElectronic", title, seed: 1175, mood: "hopeful",
  bpm: 90, key: "Eb", mode: "lydian", meter: "4/4",
  moodControls: { energy: 0.38, warmth: 0.7, brightness: 0.45, tension: 0.3, space: 0.7 },
  swing: 0.54, dyn: [0.58, 0.64], tail: 2.4,
  voices: {
    chords: { inst: "piano", role: "accomp", opts: { variant: "upright" } },
    lead: { inst: "piano", role: "melody", opts: { variant: "upright" } },
    bass: "warm",
  },
  levels: { chords: -13, lead: 4, kick: 1.5, snare: -2 },
  chords: CHORDS,
  motifs: MOTIFS,
  grooves: { main: { family: "halfTime", density: 0.32, variation: 0.35 } },
});

/** The 8-second sample: dawn on the piano alone, then the groove under the answer and the climb. */
export const sampleScore = (): Material => ({
  ...base("Shamayim, dawn (sample)"),
  sections: [
    { kind: "intro", bars: 1, harmony: ["Home"], lead: ["rise"], comp: ["x:2 x:2@0.8"], chordVel: 0.5, energy: 0.42 },
    { kind: "groove", bars: 2, harmony: ["Light", "Day"], lead: ["answer", "higher"], comp: ["x:1.5 x:1 r:.5 x:1", "x:1.5 x:1 r:.5 x:1"], groove: "main", energy: 0.52 },
  ],
});
