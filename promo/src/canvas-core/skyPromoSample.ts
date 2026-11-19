// The 8-second listening sample (dawn): the opening picture held; the sound is the point.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { W, H, FPS, BPM, phoneFrame, SKY_0615 } from "./skyPromo";
import { filmScore } from "./score";
import { sampleScore } from "./skyPromoScore";
import { addCranes } from "./skyPromoBirds";
const SAMPLE_FRAMES = 280; // 3 bars at 90 bpm (8.0 s) and 1.3 s of the piano ringing out
const sampleScoreAudio = filmScore(sampleScore(), FPS, SAMPLE_FRAMES);
export const skyPromoSample: Film = {
  meta: { title: "skyPromoSample", W, H, fps: FPS, bpm: BPM, durationFrames: SAMPLE_FRAMES },
  assets: { images: { sdm0615: "assets/shots/sdm-0615.jpg" } },
  shots: [{ id: "dawn", start: 0, end: SAMPLE_FRAMES, draw: (ctx: Ctx, local: number, env: Env) => {
    phoneFrame(ctx, env, "sdm0615", SKY_0615);
  } }],
  audio: Object.assign((sr: number): [Float32Array, Float32Array] => {
    const [L, R] = sampleScoreAudio(sr);
    addCranes(L, R, sr, { at: 0.5, dur: 4.2, seed: 1911, panFrom: -0.7, panTo: 0.6, level: 0.05 });
    return [L, R];
  }, { scores: sampleScoreAudio.scores }),
};
