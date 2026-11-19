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
  higher: "r:1 D5:.5 Eb5:.5 A5:1 G5:1",
  // night: the rise turned upside down, the sun going down
  set: "r:1 F5:.5 Eb5:.5 Bb4:1.5 C5:.5",
  // the other places, one per beat (one per cut): the pickup-and-leap cell sequenced up
  places: "Bb4:.5 Eb5:.5 C5:.5 F5:.5 D5:.5 G5:.5 Eb5:.5 A5:.5",
  // dawn tomorrow: the rise again, leaning (G5 over the sus chord) into the landing
  dawn: "r:1 Bb4:.5 C5:.5 F5:1.5 G5:.5",
  // the landing: home, held (the sun becomes the degree mark on this downbeat)
  last: "Bb5:1.5 G5:.5 Eb5:2",
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

/** The film's score: 7 bars at 90 bpm (18.67 s), the landing on bar 7's downbeat (16.0 s, frame 480). */
export const filmScoreMat = (): Material => ({
  ...base("Shamayim, the sky over home"),
  grooves: { main: { family: "halfTime", density: 0.32, variation: 0.35, fill: false }, lift: { family: "halfTime", density: 0.48, variation: 0.4, fill: false } },
  sections: [
    // bar 1 · now, the cranes cross: the piano alone
    { kind: "intro", bars: 1, harmony: ["Home"], lead: ["rise"], comp: ["x:2 x:2@0.8"], chordVel: 0.5, energy: 0.42 },
    // bars 2-3 · the thumb drags the day; the sun goes behind the ridge on bar 3
    { kind: "groove", bars: 2, harmony: ["Light", "Day"], lead: ["answer", "higher"], comp: ["x:1.5 x:1 r:.5 x:1", "x:1.5 x:1 r:.5 x:1"], groove: "main", energy: 0.52 },
    // bar 4 · night: drums out, the borrowed Ab, the motif upside down
    { kind: "breath", bars: 1, harmony: ["Dusk"], lead: ["set"], comp: ["x:3 x:1@0.7"], energy: 0.44 },
    // bar 5 · four places, one per beat: the groove back, a step denser
    { kind: "hook", bars: 1, harmony: ["Light Day"], lead: ["places"], comp: ["x:1 x:1 x:1 x:1"], bass: ["Eb2:1 Eb2:1 C2:1 C2:1"], groove: "lift", energy: 0.6 },
    // bar 6 · tomorrow's sunrise: the lean
    { kind: "build", bars: 1, harmony: ["Lean"], lead: ["dawn"], comp: ["x:2 x:1 x:1"], groove: "main", energy: 0.56 },
    // bar 7 · the sun lands as the degree mark: home, held
    { kind: "outro", bars: 1, harmony: ["Home"], lead: ["last"], comp: ["x:4"], energy: 0.55 },
  ],
});
