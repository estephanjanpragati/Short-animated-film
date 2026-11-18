// Timeline of "Two Mountains" (Abraham on Moriah, Aaron at Sinai; Have You Ever Thought? Day 2): every shot, camera key, kick and expression change is anchored to a
// word of the narration (words.ts, made from voice/words.json), so a new voice take re-times the whole film.
// Camera grammar (bridge short / motion.md): smootherstep glides of 18-40 f, cuts on big reframes, every hold creeps
// in 0.15-0.35 %/f (0.6 %/f on punch words), flip kicks decaying over 7 f on impacts, 4-5 deg rolls on emphasis.
import { WORDS, END_AT } from "./words";

export const FPS = 30;
export const D0 = 0; // ground height (build.ts reads it)
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- words ----------------
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter(Boolean);
/** start time (s) of the first occurrence of a phrase (normalised words) */
export const T = (phrase: string, nth = 1): number => {
  const q = norm(phrase);
  let hit = 0;
  for (let i = 0; i + q.length <= WORDS.length; i++) {
    if (q.every((w, k) => WORDS[i + k][0] === w) && ++hit === nth) return WORDS[i][1];
  }
  throw new Error("phrase not in words.ts: " + phrase);
};
/** end time (s) of a phrase */
export const TE = (phrase: string, nth = 1): number => {
  const q = norm(phrase), t0 = T(phrase, nth);
  const i = WORDS.findIndex((w) => w[1] === t0);
  return WORDS[i + q.length - 1][2];
};
/** frame a reaction should land on: 2 frames before the word */
export const W = (phrase: string, nth = 1) => Math.max(0, Math.round(T(phrase, nth) * FPS) - 2);
const END = Math.max(END_AT, WORDS[WORDS.length - 1][2]);
export const TOTAL = Math.round((END + 0.7) * FPS);

// ---------------- sets (world origins) ----------------
export const ALT: V3 = [0, 0, -18];        // the two altars on a low rise: Cain's at x -2.6, Abel's at x +2.6
export const FARM: V3 = [-14, 0, 2];       // Cain's wheat field
export const PAST: V3 = [14, 0, 2];        // Abel's pasture and flock
export const TAB: V3 = [200, 0, 0];        // "later": the bronze altar in the tabernacle court, a priest with grain
export const KIT: V3 = [300, 0, 0];        // the analogy: a kitchen table, two kids, a birthday card and a receipt
export const HUT: V3 = [300, 0, 60];       // Cain's door at night: sin crouching beside it
export const HILLX: V3 = [0, 0, -140];     // sunrise hill with the cross
export const CAIN_ALT: V3 = [-2.6, 0, -18], ABEL_ALT: V3 = [2.6, 0, -18];

// ---------------- shots ----------------
export type Light = "day" | "golden" | "storm" | "night";
export type Set = "altars" | "fields" | "tab" | "kitchen" | "hut" | "dusk" | "cross";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; sunAz?: number; sunEl?: number };
const starts: [Set, Light, string][] = [
  ["altars", "golden", ""],                   // 1 hook: Abraham calm by the altar, the ram
  ["cross", "day", "the other said"],         // 2 hook: Aaron and his calf
  ["altars", "golden", "this is day two"],    // 3 series title card
  ["hut", "night", "god told abraham"],       // 4 the call at night
  ["dusk", "golden", "three days of"],        // 5 the walk; "where's the lamb?"
  ["altars", "golden", "he lifts the"],       // 6 the angel stops him; the ram
  ["altars", "golden", "abraham names the"],  // 7 The Lord Will Provide
  ["cross", "day", "hundreds of years"],      // 8 Sinai; "make us a god"; the calf
  ["cross", "day", "moses comes down"],       // 9 tablets shatter; Aaron's excuse
  ["altars", "golden", "see the difference"], // 10 Abraham obeyed
  ["cross", "day", "aaron gave the"],         // 11 Aaron blamed the people and the fire
  ["cross", "golden", "so when you"],         // 12 confess; mercy
  ["altars", "golden", "which one are"],      // 13 CTA
];
const SUN: Record<number, { sunAz?: number; sunEl?: number }> = { 1: { sunAz: 160, sunEl: 16 }, 3: { sunAz: 160, sunEl: 16 }, 5: { sunAz: 160, sunEl: 11 }, 6: { sunAz: 160, sunEl: 16 }, 7: { sunAz: 165, sunEl: 14 }, 10: { sunAz: 160, sunEl: 16 }, 12: { sunAz: 160, sunEl: 14 }, 13: { sunAz: 160, sunEl: 16 }, 4: { sunAz: 160, sunEl: 45 } };
export const SHOTS: ShotDef[] = starts.map(([set, light, w], i) => ({
  id: i + 1, set, light, a: i === 0 ? 0 : W(w), b: i + 1 < starts.length ? W(starts[i + 1][2]) : TOTAL, ...SUN[i + 1],
}));
export const XFADE: Record<number, number> = { 4: 10, 5: 10, 6: 8, 8: 12, 10: 10, 11: 8, 12: 10, 13: 10 };
export const FLASH_AT = SHOTS[2].a;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story clocks ----------------
/** metres walked by Abraham and Isaac (shot 5); they stop when Isaac asks */
export const pathWalk = (t: number) => (Math.min(t, T("father wheres")) - T("three days of")) * 1.1;
/** the angel's light on Moriah (shot 6): 0..1 */
export const beamOn = (id: number, t: number) => (id === 6 ? smooth((t - T("and an angel")) / 0.5) * (1 - 0.6 * smooth((t - T("a ram is")) / 1.0)) : 0);
/** Moses coming down into the camp (shot 9), metres */
export const mosesIn = (t: number) => Math.min(3.2, Math.max(0, t - T("moses comes down")) * 2.2);
/** tablets: 0 whole .. 1 smashed */
export const shatter = (t: number) => clamp01((t - T("shatter") + 0.1) / 0.45);
export const climb = (t: number) => 0 * t;
export const duskWalk = (t: number) => 0 * t;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0 (subject grows ~rate per frame; `punch` raises it with soft 8 f edges for n frames) */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** dolly push toward the look point by k, positions relative to a set origin */
const dolly = (o: V3, pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot => {
  const P = add(o, pos), L = add(o, look);
  return { pos: [L[0] + (P[0] - L[0]) * k, L[1] + (P[1] - L[1]) * k, L[2] + (P[2] - L[2]) * k], look: L, ...rest };
};
/** zoom push (lens stays put) */
const zoom = (o: V3, pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: add(o, pos), look: add(o, look), fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });



// ---- framings ----
const fr = (id: number) => SHOTS[id - 1].a;
const AB = ABEL_ALT, SI = HILLX;
// Moriah: altar at AB; Abraham left of it, Isaac right, the ram in the bushes behind-right
const S1a = (f: number) => dolly(AB, [0.3, 1.75, 8.0], [0.2, 1.2, 0.6], pushK(f, 0, 0.0028), { fov: 42 });
const S2a = (f: number) => dolly(SI, [1.0, 1.75, 9.6], [0.4, 1.3, 4.6], pushK(f, fr(2), 0.003, 0.007, 30), { fov: 40, roll: 0.03 });
const S3a = (f: number) => dolly(AB, [0.6, 2.4, 9.5], [0, 2.6, 0], pushK(f, fr(3), 0.002), { fov: 44 });
const S4a = (f: number) => dolly(HUT, [0.2, 1.6, 7.0], [-0.6, 1.2, 1.0], pushK(f, fr(4), 0.002), { fov: 44 });
const S4b = (f: number) => dolly(HUT, [-0.9, 1.6, 4.4], [-1.3, 1.45, 1.4], pushK(f, W("take your son"), 0.0025, 0.005, 30), { fov: 38, roll: 0.02 });
const S5a = (f: number) => dolly(ALT, [1.6, 1.9, 33], [0, 1.3, 20], pushK(f, fr(5), 0.0015), { fov: 42 });
const S5b = (f: number) => dolly(ALT, [1.2, 1.45, 23.2 - pathWalk(1e9)], [0, 1.35, 20 - pathWalk(1e9)], pushK(f, W("father wheres"), 0.0025, 0.005, 30), { fov: 38 });
const S6a = (f: number) => dolly(AB, [0.3, 1.6, 4.4], [-0.2, 1.5, 0.4], pushK(f, fr(6), 0.003, 0.006, 30), { fov: 40, roll: -0.03 });
const S6b = (f: number) => dolly(AB, [-0.6, 1.8, 7.0], [0.1, 1.9, 0], pushK(f, W("and an angel"), 0.002), { fov: 44 });
const S6c = (f: number) => dolly(AB, [2.7, 1.2, 1.5], [1.5, 0.75, -1.1], pushK(f, W("a ram is"), 0.003, 0.006, 30), { fov: 38, roll: 0.03 });
const S7a = (f: number) => dolly(AB, [0.8, 2.2, 10], [0, 1.6, 0], pushK(f, fr(7), 0.002), { fov: 44 });
const S8a = (f: number) => dolly(SI, [1.0, 1.8, 15], [0, 5, -20], pushK(f, fr(8), 0.0015), { fov: 50 });
const S8b = (f: number) => dolly(SI, [-1.2, 1.9, 13.5], [0, 1.4, 6.5], pushK(f, W("below the people"), 0.0022), { fov: 44 });
const S8c = (f: number) => dolly(SI, [1.3, 1.6, 8.6], [0.4, 1.2, 4.2], pushK(f, W("and aaron melts"), 0.003, 0.006, 30), { fov: 40, roll: -0.03 });
const S9a = (f: number) => dolly(SI, [-4.2, 1.7, 9.6], [-2.6, 1.5, 4.8], pushK(f, fr(9), 0.0025), { fov: 40 });
const S9b = (f: number) => dolly(SI, [1.6, 1.6, 7.6], [0.9, 1.45, 5.2], pushK(f, W("and aaron says"), 0.003, 0.006, 30), { fov: 36, roll: 0.03 });
const S10a = (f: number) => dolly(AB, [-0.5, 1.6, 4.0], [-0.7, 1.4, 0.6], pushK(f, fr(10), 0.0025), { fov: 38 });
const S11a = (f: number) => dolly(SI, [2.0, 1.8, 11.5], [0.2, 1.3, 5.5], pushK(f, fr(11), 0.0025), { fov: 42 });
const S11b = (f: number) => dolly(SI, [1.4, 1.5, 6.6], [0.3, 1.0, 4.0], pushK(f, W("and even the"), 0.003, 0.007, 30), { fov: 38, roll: -0.04 });
const S12a = (f: number) => dolly(SI, [0.4, 1.6, 9.8], [0.1, 1.4, 5.6], pushK(f, fr(12), 0.0022), { fov: 40 });
const S12b = (f: number) => dolly(SI, [0.4, 1.7, 8.6], [0.1, 1.6, 5.6], pushK(f, W("and god still"), 0.0025, 0.005, 30), { fov: 38 });
const S13a = (f: number) => dolly(AB, [0, 1.7, 6.8], [0, 1.35, 1.0], pushK(f, fr(13), 0.0022), { fov: 42 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: fr(2), s: S2a }],
  3: [{ f: fr(3), s: S3a }],
  4: [{ f: fr(4), s: S4a }, { f: W("take your son") - 8, dur: 32, s: S4b }],
  5: [{ f: fr(5), s: S5a }, { f: W("father wheres"), cut: true, s: S5b }],
  6: [{ f: fr(6), s: S6a }, { f: W("and an angel"), cut: true, s: S6b }, { f: W("a ram is"), cut: true, s: S6c }],
  7: [{ f: fr(7), s: S7a }],
  8: [{ f: fr(8), s: S8a }, { f: W("below the people"), cut: true, s: S8b }, { f: W("and aaron melts"), cut: true, s: S8c }],
  9: [{ f: fr(9), s: S9a }, { f: W("and aaron says"), cut: true, s: S9b }],
  10: [{ f: fr(10), s: S10a }],
  11: [{ f: fr(11), s: S11a }, { f: W("and even the") - 6, dur: 24, s: S11b }],
  12: [{ f: fr(12), s: S12a }, { f: W("and god still") - 6, dur: 30, s: S12b }],
  13: [{ f: fr(13), s: S13a }],
};

export const KICKS: { f: number; a: number }[] = [{ f: W("shatter"), a: 0.9 }, { f: W("stop"), a: 0.6 }, { f: W("make us a"), a: 0.5 }];
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f);
  for (const k of KICKS) {
    const d = f - k.f;
    if (d >= 0 && d < 7) {
      const s = (d % 2 ? -1 : 1) * k.a * (1 - d / 7);
      c.roll += 0.012 * s; c.pos = [c.pos[0], c.pos[1] + 0.018 * s, c.pos[2]];
    }
  }
  return c;
};
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  const id = shotAt(f).id;
  const tab: Record<number, number> = { 1: 0, 2: 10, 3: 14, 4: 9, 5: 0, 6: 11, 7: 0, 8: 0, 9: 0, 10: 11, 11: 0, 12: 10, 13: 0 };
  let c = tab[id] ?? 0;
  if (id === 5 && f >= W("father wheres")) c = 10;
  if (id === 6 && f >= W("and an angel") && f < W("a ram is")) c = 0;
  if (id === 8 && f >= W("and aaron melts")) c = 11;
  if (id === 9 && f >= W("and aaron says")) c = 12;
  if (id === 11 && f >= W("and even the")) c = 10;
  return { cInf: c };
};

/** the camera that decides how characters are drawn (front / side, facing, mirror) at frame f: the end of the camera
 *  key in effect (its cut frame, or the end of its glide), so a card never flips view while the camera moves */
export const viewCam = (id: number, f: number): Cam => {
  const keys = CAMS[id];
  let k = keys[0];
  for (const kk of keys) if (f >= kk.f) k = kk;
  const s = SHOTS[id - 1];
  const vf = Math.min(s.b - 1, Math.max(s.a, k === keys[0] ? s.a : k.cut ? k.f : k.f + (k.dur ?? 24)));
  return run(keys, vf);
};
