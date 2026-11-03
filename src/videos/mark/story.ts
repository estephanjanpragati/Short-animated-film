// Timeline of "The Quitter Who Wrote a Gospel": every shot, camera key, kick and expression change is anchored to a
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
export const COURT: V3 = [0, 0, 0];       // Antioch courtyard
export const HARB: V3 = [0, 0, -200];     // harbour: quay edge along x at z = -200, sea beyond
export const VILL: V3 = [200, 0, 0];      // Cyprus village (and Lystra from the other side)
export const PERGA: V3 = [-300, 0, 150];  // road into the Taurus mountains, heading -x
export const FIELD: V3 = [0, 0, 200];     // the coaches' football pitch
export const PRISON: V3 = [400, 0, 0];
export const STUDY: V3 = [400, 0, 40];
export const QUAY_Z = -200, SEA_Y = -1.0;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "court" | "harbour" | "village" | "lystra" | "perga" | "field" | "prison" | "study" | "coast";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; sunAz?: number; sunEl?: number };
const starts: [Set, Light, string][] = [
  ["court", "day", ""],                         // 1 hook: back to back, Mark between them
  ["harbour", "golden", "its around"],          // 2 setting sail
  ["harbour", "golden", "they bring along"],    // 3 Mark joins
  ["village", "day", "they cross the whole"],   // 4 Cyprus, preaching
  ["perga", "day", "then they land"],           // 5 Perga, Mark goes home
  ["perga", "day", "paul and barnabas keep"],   // 6 the two walk on
  ["lystra", "day", "in one town"],             // 7 stoned, left for dead
  ["court", "day", "a few years"],              // 8 planning trip two
  ["court", "day", "barnabas says"],            // 9 "let's take Mark"
  ["court", "day", "paul says"],                // 10 "absolutely not"
  ["court", "day", "the bible calls"],          // 11 the sharp disagreement
  ["court", "day", "luckily"],                  // 12 son of encouragement
  ["court", "day", "unluckily"],                // 13 ...that's why they fought
  ["court", "day", "you see"],                  // 14 both right
  ["field", "day", "think of two"],             // 15 the player walks off
  ["field", "day", "one says"],                 // 16 coach A
  ["field", "day", "the other says"],           // 17 coach B
  ["harbour", "day", "so instead"],             // 18 now two teams
  ["harbour", "day", "barnabas takes mark"],    // 19 to Cyprus
  ["coast", "day", "paul takes silas"],         // 20 into Europe
  ["prison", "day", "years later writing"],  // 21 "get Mark"
  ["study", "golden", "and the guy who quit"],  // 22 the twist
];
const SUN: Record<number, { sunAz?: number; sunEl?: number }> = { 21: { sunAz: 160, sunEl: 58 }, 22: { sunAz: 140, sunEl: 44 }, 2: { sunAz: 115, sunEl: 32 }, 3: { sunAz: 70, sunEl: 18 } };
export const SHOTS: ShotDef[] = starts.map(([set, light, w], i) => ({
  id: i + 1, set, light, a: i === 0 ? 0 : W(w), b: i + 1 < starts.length ? W(starts[i + 1][2]) : TOTAL, ...SUN[i + 1],
}));
/** crossfades (frames) at place / time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 3: 6, 4: 8, 8: 8, 15: 8, 18: 8, 20: 6, 21: 8, 22: 8 };
export const FLASH_AT = SHOTS[1].a;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story clocks ----------------
/** the boat's sail: furled until "setting sail", then drops open */
export const sailOpen = (t: number) => smooth((t - T("setting sail")) / 0.6);
/** the boat leaving for Cyprus (shots 18-19): metres sailed */
export const boatOut = (t: number) => Math.max(0, t - T("so instead")) * 2.2;
/** Mark running along the quay (shot 3) */
export const markRun = (t: number) => clamp01((t - T("they bring along")) / 1.9);
/** Mark walking home at Perga (shot 5) */
export const markLeave = (t: number) => Math.max(0, t - T("goes home") + 0.15);
/** the stones at Lystra: hit times */
export const HITS = (() => { const t0 = T("gets stoned"); return [t0 + 0.05, t0 + 0.32, t0 + 0.58]; })();
export const DOWN_AT = T("left for dead") - 0.12;

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

// staging spots (set-relative) shared by cast.ts
export const SPOT = {
  hookPaul: [-0.62, 0, -2.0] as V3, hookBarn: [0.68, 0, -2.08] as V3, hookMark: [0.04, 0, -3.5] as V3,
  argPaul: [-0.66, 0, -2.2] as V3, argBarn: [0.7, 0, -2.25] as V3, argMark: [3.6, 0, -8.5] as V3,
  table: [0, 0, -1.2] as V3,
  deckPaul: [3.2, 0.25, -5.0] as V3, deckBarn: [4.6, 0.25, -5.2] as V3,
  quayBarn: [1.3, 0, 1.6] as V3, quayMark0: [-11, 0, 1.4] as V3, quayMark1: [0.2, 0, 1.45] as V3,
  preach: [0, 0.45, -6] as V3, villBarn: [1.6, 0, -6.4] as V3, villMark: [-1.9, 0, -7.2] as V3,
  pergaPaul: [-1.2, 0, 0] as V3, pergaBarn: [0, 0, 0.1] as V3, pergaMark: [1.4, 0, 0.05] as V3,
  lystPaul: [0, 0, -3] as V3, lystBarn: [1.7, 0, -4.2] as V3,
  coachA: [-10, 0, 0] as V3, coachB: [-10.2, 0, 3.2] as V3, player0: [-3.5, 0, 1.4] as V3, player1: [-8.4, 0, 1.6] as V3,
  cellPaul: [0.2, 0, -1.9] as V3, deskMark: [0, 0.5, -1.55] as V3,
};

// ---- framings ----
const Hf = (f: number) => f; // readability
const S = SHOTS;
const fr = (id: number) => S[id - 1].a;
// 1 hook (court): MS two-shot back to back -> closer on "broke up" -> Mark between them on "one guy who quit"
const S1a = (f: number) => dolly(COURT, [0.3, 1.4, 3.6], [0, 1.05, -2.5], pushK(f, 0, 0.0028), { fov: 40, roll: 0.02 });
const S1b = (f: number) => dolly(COURT, [0.15, 1.55, 3.3], [0, 1.35, -2.4], pushK(f, W("broke up"), 0.002, 0.006, 26), { fov: 40, roll: 0.04 });
const S1c = (f: number) => dolly(COURT, [0.06, 1.62, 0.7], [0.04, 1.5, -3.5], pushK(f, W("one guy"), 0.0025), { fov: 30, roll: -0.03 });
// 2 harbour wide (golden) -> the two on deck
const S2a = (f: number) => zoom(HARB, [-16, 8, 14], [5, 1.0, -6], 46, pushK(f, fr(2), 0.0018));
const S2b = (f: number) => dolly(HARB, [1.0, 1.9, 1.6], [3.9, 1.65, -5.1], pushK(f, W("paul and barnabas are"), 0.0022, 0.005, 30), { fov: 40, roll: -0.03 });
const S2c = (f: number) => dolly(HARB, [-1.6, 2.4, 3.0], [4.0, 4.2, -5.2], pushK(f, W("setting sail"), 0.002), { fov: 46, roll: 0.03 });
// 3 Mark runs along the quay (side tracking), then CU with Barnabas on "young cousin"
const runX = (t: number) => SPOT.quayMark0[0] + (SPOT.quayMark1[0] - SPOT.quayMark0[0]) * markRun(t);
const S3a = (f: number) => { const x = runX(f / FPS); return { pos: add(HARB, [x - 0.6, 1.5, 7.2]), look: add(HARB, [x - 0.2, 1.15, 1.4]), fov: 40, roll: 0 } as Shot; };
const S3b = (f: number) => dolly(HARB, [0.75, 1.6, 7.4], [0.75, 1.35, 1.5], pushK(f, W("young cousin"), 0.0025, 0.006, 30), { fov: 36, roll: 0.04 });
// 4 Cyprus: behind the crowd -> closer on Paul preaching (roll)
const S4a = (f: number) => dolly(VILL, [1.4, 2.2, 9.5], [0, 1.6, -5.5], pushK(f, fr(4), 0.002), { fov: 42 });
const S4b = (f: number) => dolly(VILL, [-1.2, 1.7, -1.6], [0.2, 2.0, -6], pushK(f, W("preaching town"), 0.0025), { fov: 38, roll: -0.04 });
// 5 Perga: side view of the three, mountains behind -> zoom to the mountains -> CU Mark -> Mark walks off
const S5a = (f: number) => dolly(PERGA, [1.5, 1.7, 8.5], [-1.0, 1.6, 0], pushK(f, fr(5), 0.002), { fov: 42 });
const S5b = (f: number) => zoom(PERGA, [3.0, 1.4, 9.5], [-60, 18, -70], 44, pushK(f, W("big mountain"), 0.002, 0.005, 30), { roll: 0.03 });
const S5c = (f: number) => dolly(PERGA, [1.9, 1.6, 3.4], [1.4, 1.5, 0.05], pushK(f, W("and mark packs"), 0.003), { fov: 34, roll: -0.04 });
const S5d = (f: number) => dolly(PERGA, [3.4, 1.75, 7.5], [1.2, 1.4, 0.2], pushK(f, W("goes home"), 0.002), { fov: 42 });
// 6 the two walk on: side tracking, road toward the mountains
const walkX = (t: number) => -1.2 - 1.1 * Math.max(0, t - T("paul and barnabas keep"));
export const pergaWalk = walkX;
const S6a = (f: number) => { const x = walkX(f / FPS); return { pos: add(PERGA, [x + 0.1, 1.7, 7.4]), look: add(PERGA, [x + 0.6, 1.35, 0]), fov: 42, roll: 0 } as Shot; };
// 7 Lystra: the crowd's view of Paul -> kicks on the hits -> down on the ground
const S7a = (f: number) => dolly(VILL, [0.6, 1.6, 2.8], [0, 1.45, -3], pushK(f, fr(7), 0.0025, 0.006, 30), { fov: 40, roll: 0.03 });
const S7b = (f: number) => dolly(VILL, [0.9, 1.25, -0.1], [0.3, 0.35, -3.4], pushK(f, W("left for dead"), 0.002), { fov: 40, roll: -0.05 });
// 8 planning trip two: high over the map on the table -> the two behind it
const S8a = (f: number) => dolly(COURT, [0.2, 3.6, 1.8], [0, 0.9, -1.5], pushK(f, fr(8), 0.002), { fov: 42 });
const S8b = (f: number) => dolly(COURT, [0.1, 1.85, 4.2], [0, 1.2, -1.9], pushK(f, W("plan trip"), 0.0025), { fov: 40 });
// 9-10 over-the-shoulder CUs; 11 two-shot with dutch rolls; 12-13 Barnabas CU (same lens both lines); 14 wide
const S9a = (f: number) => dolly(COURT, [-0.75, 1.62, 0.6], [0.7, 1.52, -2.25], pushK(f, fr(9), 0.0025, 0.005, 30), { fov: 36 });
const S10a = (f: number) => dolly(COURT, [0.8, 1.6, 0.6], [-0.66, 1.48, -2.2], pushK(f, fr(10), 0.002), { fov: 36 });
const S10b = (f: number) => dolly(COURT, [0.45, 1.55, -0.2], [-0.66, 1.5, -2.2], pushK(f, W("absolutely not"), 0.002, 0.007, 30), { fov: 34, roll: -0.045 });
const S11a = (f: number) => dolly(COURT, [0.05, 1.6, 3.4], [0.02, 1.4, -2.2], pushK(f, fr(11), 0.0025), { fov: 40, roll: 0.045 });
const S11b = (f: number) => dolly(COURT, [-0.1, 1.6, 2.9], [0.02, 1.45, -2.2], pushK(f, W("the greek word"), 0.0025, 0.006, 30), { fov: 42, roll: -0.045 });
const S12a = (f: number) => dolly(COURT, [-0.3, 1.6, 0.7], [0.7, 1.55, -2.25], pushK(f, fr(12), 0.0022), { fov: 34, roll: 0.0 });
const S13a = (f: number) => dolly(COURT, [-0.3, 1.6, 0.7], [0.7, 1.55, -2.25], pushK(f, fr(12), 0.0022), { fov: 34, roll: 0.045 });
const S14a = (f: number) => dolly(COURT, [0, 2.0, 5.2], [0, 1.2, -2.2], pushK(f, fr(14), 0.002), { fov: 42 });
// 15-17 the pitch
const playerX = (t: number) => SPOT.player0[0] + (SPOT.player1[0] - SPOT.player0[0]) * clamp01((t - T("walked off")) / 2.2);
export const playerAt = playerX;
const S15a = (f: number) => zoom(FIELD, [5, 3.4, 12], [-5, 0.9, 1], 44, pushK(f, fr(15), 0.002));
const S15b = (f: number) => { const x = playerX(f / FPS); return { pos: add(FIELD, [x + 1.2, 1.3, 6.2]), look: add(FIELD, [x - 0.4, 1.0, 1.5]), fov: 40, roll: 0 } as Shot; };
const S16a = (f: number) => dolly(FIELD, [-7.3, 1.62, 2.1], [-10, 1.55, 0], pushK(f, fr(16), 0.0025, 0.006, 30), { fov: 36, roll: -0.04 });
const S17a = (f: number) => dolly(FIELD, [-7.6, 1.6, 5.4], [-10.2, 1.5, 3.2], pushK(f, fr(17), 0.0022), { fov: 36, roll: 0.03 });
const S17b = (f: number) => dolly(FIELD, [-6.0, 1.35, 4.8], [-8.4, 1.0, 1.6], pushK(f, W("never comes back"), 0.003), { fov: 38, roll: 0.0 });
// 18 aerial over the harbour: the boat leaves, the road runs off along the coast
const S18a = (f: number) => dolly(HARB, [-6, 18, 32], [11, 0, -3], pushK(f, fr(18), 0.0015), { fov: 46 });
// 19 on the boat with Barnabas and Mark
export const boatPos = (t: number): V3 => [5 + 0.35 * boatOut(t), SEA_Y, -5 - boatOut(t)];
const S19a = (f: number) => { const b = boatPos(f / FPS); return dolly(HARB, [b[0] - 1.5, 2.1, b[2] + 5.0], [b[0] - 1.3, 1.25, b[2] - 0.1], pushK(f, fr(19), 0.002), { fov: 40, roll: 0.03 }); };
// 20 Paul and Silas on the coast road -> crane up over the coast "into Europe"
export const coastX = (t: number) => 14 + 1.15 * Math.max(0, t - T("paul takes silas"));
const S20a = (f: number) => { const x = coastX(f / FPS); return { pos: add(HARB, [x + 1.2, 1.6, 10.8]), look: add(HARB, [x + 0.1, 1.25, 4.2]), fov: 40, roll: 0 } as Shot; };
const S20b = (f: number): Shot => {
  const a = S20a(W("all the way into")), u = glide((f - W("all the way into")) / 60), x = coastX(f / FPS);
  return { pos: [a.pos[0] + 6 * u, a.pos[1] + 30 * u, a.pos[2] + 14 * u], look: [a.look[0] + (x + 70 - a.look[0]) * u, a.look[1] * (1 - u), a.look[2] - 30 * u],
    fov: 40 + 6 * u, roll: 0 };
};
// 21 prison cell (golden)
const S21a = (f: number) => dolly(PRISON, [1.3, 1.45, 2.2], [0.2, 0.8, -1.9], pushK(f, fr(21), 0.0022), { fov: 40 });
const S21b = (f: number) => dolly(PRISON, [0.55, 1.15, 0.5], [0.2, 0.85, -1.9], pushK(f, W("asks for mark"), 0.0025, 0.005, 30), { fov: 36, roll: 0.035 });
// 22 study: the scroll on the desk -> tilt up to Mark -> push on "Gospel of Mark"
const S22a = (f: number) => dolly(STUDY, [0.4, 1.6, 0.4], [0.05, 0.82, -1.0], pushK(f, fr(22), 0.0025), { fov: 38 });
const S22b = (f: number) => dolly(STUDY, [0.25, 1.5, 1.9], [0, 1.25, -1.55], pushK(f, W("tradition says"), 0.0022, 0.006, 40), { fov: 38 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: W("broke up"), cut: true, s: S1b }, { f: W("one guy"), dur: 26, s: S1c }],
  2: [{ f: fr(2), s: S2a }, { f: W("paul and barnabas are"), cut: true, s: S2b }, { f: W("setting sail") - 6, dur: 30, s: S2c }],
  3: [{ f: fr(3), s: S3a }, { f: W("young cousin"), cut: true, s: S3b }],
  4: [{ f: fr(4), s: S4a }, { f: W("preaching town") - 10, dur: 34, s: S4b }],
  5: [{ f: fr(5), s: S5a }, { f: W("big mountain") - 8, dur: 30, s: S5b }, { f: W("and mark packs"), cut: true, s: S5c }, { f: W("goes home"), dur: 26, s: S5d }],
  6: [{ f: fr(6), s: S6a }],
  7: [{ f: fr(7), s: S7a }, { f: W("left for dead"), cut: true, s: S7b }],
  8: [{ f: fr(8), s: S8a }, { f: W("plan trip") - 8, dur: 30, s: S8b }],
  9: [{ f: fr(9), s: S9a }],
  10: [{ f: fr(10), s: S10a }, { f: W("absolutely not") - 4, dur: 18, s: S10b }],
  11: [{ f: fr(11), s: S11a }, { f: W("the greek word"), cut: true, s: S11b }],
  12: [{ f: fr(12), s: S12a }],
  13: [{ f: fr(13), s: S13a }],
  14: [{ f: fr(14), s: S14a }],
  15: [{ f: fr(15), s: S15a }, { f: W("walked off"), cut: true, s: S15b }],
  16: [{ f: fr(16), s: S16a }],
  17: [{ f: fr(17), s: S17a }, { f: W("never comes back") - 6, dur: 26, s: S17b }],
  18: [{ f: fr(18), s: S18a }],
  19: [{ f: fr(19), s: S19a }],
  20: [{ f: fr(20), s: S20a }, { f: W("all the way into"), s: S20b, dur: 1 }],
  21: [{ f: fr(21), s: S21a }, { f: W("asks for mark"), cut: true, s: S21b }],
  22: [{ f: fr(22), s: S22a }, { f: W("tradition says") - 12, dur: 36, s: S22b }],
};
void Hf;

/** impact kicks: flip sign every frame, decaying over 7 frames */
export const KICKS: { f: number; a: number }[] = [
  { f: W("broke up"), a: 1 }, ...HITS.map((t) => ({ f: Math.round(t * FPS), a: 1.2 })), { f: W("absolutely not"), a: 0.7 },
  { f: W("sharp disagreement"), a: 1 }, { f: W("paroxysmos"), a: 0.8 }, { f: W("paroxysm"), a: 0.8 }, { f: W("unluckily"), a: 0.6 },
];
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

/** lens blur per beat: cInf px at 1080 wide (0 = sharp) and an optional focus point */
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  const id = shotAt(f).id;
  const tab: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 9, 8: 0, 9: 13, 10: 13, 11: 0, 12: 14, 13: 14, 14: 0, 15: 0, 16: 13, 17: 12, 18: 0, 19: 0, 20: 0, 21: 11, 22: 12 };
  let c = tab[id] ?? 0;
  if (id === 1 && f >= W("one guy")) c = 11 * glide((f - W("one guy")) / 20);
  if (id === 3 && f >= W("young cousin")) c = 10;
  if (id === 5 && f >= W("and mark packs") && f < W("goes home")) c = 12;
  if (id === 10 || id === 7) c = f >= W("left for dead") && id === 7 ? 0 : c;
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
