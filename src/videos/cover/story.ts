// Timeline of "Should women cover their head in church?" (Have You Ever Thought? Day 1): every shot, camera key, kick and expression change is anchored to a
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
export const COURT: V3 = [0, 0, 0];       // Corinth street (the whitewashed courtyard of the Paul short)
export const HARB: V3 = [0, 0, -200];     // (unused here)
export const VILL: V3 = [200, 0, 0];
export const PERGA: V3 = [-300, 0, 150];
export const FIELD: V3 = [0, 0, 200];
export const PRISON: V3 = [400, 0, 0];
export const STUDY: V3 = [400, 0, 40];    // Paul writing to Corinth
export const CHURCH: V3 = [0, 0, 400];    // an Indian church today
export const QUAY_Z = -200, SEA_Y = -1.0;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "court" | "harbour" | "village" | "lystra" | "perga" | "field" | "prison" | "study" | "coast" | "church";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; sunAz?: number; sunEl?: number };
const starts: [Set, Light, string][] = [
  ["church", "day", ""],                          // 1 hook: covered / uncovered, the aunty stares
  ["church", "day", "this is day one"],           // 2 series title card
  ["study", "golden", "in first corinthians"],    // 3 Paul writes 1 Cor 11:5
  ["court", "day", "but look at the city"],       // 4 Corinth, the married woman's veil
  ["court", "day", "bare hair in public"],        // 5 bare hair, frowns
  ["study", "golden", "so paul cared"],           // 6 honour; "judge for yourselves"
  ["court", "day", "so christians read"],         // 7 view one: Corinth's custom
  ["church", "day", "others like catholics"],     // 8 view two: the covering still a sign
  ["church", "day", "but heres what both"],    // 9 the heart
  ["church", "day", "so if your church"],      // 10 together in one pew
  ["church", "day", "do women cover their"],   // 11 CTA
];
const SUN: Record<number, { sunAz?: number; sunEl?: number }> = { 3: { sunAz: 140, sunEl: 44 }, 6: { sunAz: 140, sunEl: 44 } };
export const SHOTS: ShotDef[] = starts.map(([set, light, w], i) => ({
  id: i + 1, set, light, a: i === 0 ? 0 : W(w), b: i + 1 < starts.length ? W(starts[i + 1][2]) : TOTAL, ...SUN[i + 1],
}));
/** crossfades (frames) at place / time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 3: 10, 4: 10, 6: 8, 7: 8, 8: 10, 9: 10, 10: 10 };
export const FLASH_AT = SHOTS[1].a;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story clocks (the Paul short's, idle here) ----------------
export const sailOpen = (t: number) => 0 * t;
export const boatOut = (t: number) => 0 * t;
export const markRun = (t: number) => 0 * t;
export const markLeave = (t: number) => 0 * t;
export const HITS: number[] = [];
export const DOWN_AT = 1e9;
/** the bare-haired woman crossing the Corinth street (shot 5), metres walked */
export const walkBy = (t: number) => Math.max(0, t - T("bare hair in public") + 0.3) * 1.05;

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
  // church: women in the aisle (hook), the aunty in the third pew on the left
  priya: [-0.42, 0, -1.2] as V3, anjali: [0.45, 0, -1.25] as V3, aunty: [-1.7, 0.5, -0.4] as V3,
  // church: the three of them in one pew (shot 10)
  pewPriya: [1.75, 0.5, 0.95] as V3, pewAnjali: [2.55, 0.5, 0.95] as V3, pewAunty: [3.35, 0.5, 0.95] as V3,
  // corinth
  matrona: [0.1, 0, -2.2] as V3, bare0: [-4.2, 0, -1.2] as V3,
  deskPaul: [0, 0.5, -1.55] as V3,
  cellPaul: [0.2, 0, -1.9] as V3, deskMark: [0, 0.5, -1.55] as V3,
  // (the Paul short's spots, still read by its idle staging code)
  hookPaul: [-0.62, 0, -2.0] as V3, hookBarn: [0.68, 0, -2.08] as V3, hookMark: [0.04, 0, -3.5] as V3,
  argPaul: [-0.66, 0, -2.2] as V3, argBarn: [0.7, 0, -2.25] as V3, argMark: [3.6, 0, -8.5] as V3,
  table: [0, 0, -1.2] as V3,
  deckPaul: [3.2, 0.25, -5.0] as V3, deckBarn: [4.6, 0.25, -5.2] as V3,
  quayBarn: [1.3, 0, 1.6] as V3, quayMark0: [-11, 0, 1.4] as V3, quayMark1: [0.2, 0, 1.45] as V3,
  preach: [0, 0.45, -6] as V3, villBarn: [1.6, 0, -6.4] as V3, villMark: [-1.9, 0, -7.2] as V3,
  pergaPaul: [-1.2, 0, 0] as V3, pergaBarn: [0, 0, 0.1] as V3, pergaMark: [1.4, 0, 0.05] as V3,
  lystPaul: [0, 0, -3] as V3, lystBarn: [1.7, 0, -4.2] as V3,
  coachA: [-10, 0, 0] as V3, coachB: [-10.2, 0, 3.2] as V3, player0: [-3.5, 0, 1.4] as V3, player1: [-8.4, 0, 1.6] as V3,
};
/** pew rows (church-relative z) and seat height, shared with world.ts */
export const PEW_Z = (r: number) => -9.5 + 3.2 + r * 1.35;

const S = SHOTS;
const fr = (id: number) => S[id - 1].a;
const CH = CHURCH, CO = COURT, ST = STUDY;
// 1 hook: wide down the aisle at the two women -> CU covered (Priya) -> CU uncovered (Anjali) -> two-shot with the aunty
const S1a = (f: number) => dolly(CH, [0.0, 1.55, 3.4], [0, 1.25, -1.2], pushK(f, 0, 0.0028), { fov: 40 });
const S1b = (f: number) => dolly(CH, [-0.3, 1.6, 0.6], [-0.42, 1.52, -1.2], pushK(f, W("some say always"), 0.0025, 0.006, 26), { fov: 34, roll: 0.03 });
const S1c = (f: number) => dolly(CH, [0.35, 1.6, 0.55], [0.45, 1.5, -1.25], pushK(f, W("some say not"), 0.0025, 0.006, 26), { fov: 34, roll: -0.03 });
const S1d = (f: number) => dolly(CH, [-0.45, 1.7, 4.4], [-0.5, 1.1, -1.0], pushK(f, W("and both are"), 0.0025), { fov: 46, roll: 0.02 });
// 2 title card: slow push to the cross over the heads, soft focus
const S2a = (f: number) => dolly(CH, [0, 1.8, 2.0], [0, 2.6, -9.4], pushK(f, fr(2), 0.003), { fov: 42 });
// 3 Paul at his desk writing (golden lamp light)
const S3a = (f: number) => dolly(ST, [0.4, 1.6, 0.5], [0.05, 0.85, -1.0], pushK(f, fr(3), 0.0025), { fov: 38 });
const S3b = (f: number) => dolly(ST, [0.25, 1.5, 1.9], [0, 1.25, -1.55], pushK(f, W("paul writes"), 0.0022, 0.005, 30), { fov: 38 });
// 4 Corinth street wide -> CU the married woman in her veil
const S4a = (f: number) => dolly(CO, [0.4, 2.2, 6.5], [0, 1.3, -2.5], pushK(f, fr(4), 0.0022), { fov: 42 });
const S4b = (f: number) => dolly(CO, [0.25, 1.6, 0.4], [0.1, 1.5, -2.2], pushK(f, W("many historians"), 0.0025, 0.005, 30), { fov: 34, roll: 0.02 });
// 5 the bare-haired woman crosses; the street frowns (side track)
export { walkBy as bareWalk };
const S5a = (f: number) => { const x = SPOT.bare0[0] + walkBy(f / FPS); return { pos: add(CO, [x + 0.4, 1.55, 4.4]), look: add(CO, [x + 0.6, 1.3, -1.2]), fov: 40, roll: 0 } as Shot; };
// 6 Paul CU: "honour" -> faces us on "judge for yourselves"
const S6a = (f: number) => dolly(ST, [0.2, 1.45, 1.2], [0, 1.3, -1.55], pushK(f, fr(6), 0.0025), { fov: 36 });
const S6b = (f: number) => dolly(ST, [0.05, 1.42, 0.6], [0, 1.38, -1.55], pushK(f, W("judge for yourselves"), 0.002, 0.007, 30), { fov: 34, roll: 0.03 });
// 7 Corinth wide again: view one
const S7a = (f: number) => dolly(CO, [-1.2, 1.9, 5.0], [0.2, 1.3, -2.2], pushK(f, fr(7), 0.002), { fov: 42 });
const S7b = (f: number) => dolly(CO, [0.3, 1.6, 1.0], [0.1, 1.45, -2.2], pushK(f, W("what stays"), 0.0022), { fov: 36 });
// 8 the congregation from the altar: rows of covered heads
const S8a = (f: number) => dolly(CH, [-2.3, 2.1, -7.6], [-2.4, 0.95, -1.2], pushK(f, fr(8), 0.0022), { fov: 50 });
const S8b = (f: number) => dolly(CH, [-2.3, 1.85, -7.4], [-2.4, 1.05, -3.2], pushK(f, W("say the covering"), 0.0025, 0.005, 30), { fov: 40, roll: -0.03 });
// 9 the two side by side, hearts
const S9a = (f: number) => dolly(CH, [0.0, 1.5, 2.9], [0, 1.3, -1.2], pushK(f, fr(9), 0.0025), { fov: 38 });
const S9b = (f: number) => dolly(CH, [0.0, 1.35, 1.2], [0, 1.15, -1.2], pushK(f, W("god looks at"), 0.002, 0.006, 30), { fov: 38 });
// 10 one pew, three women
const S10a = (f: number) => dolly(CH, [2.55, 1.55, -3.9], [2.55, 1.1, PEW_Z(5)], pushK(f, fr(10), 0.0022), { fov: 44 });
const S10b = (f: number) => dolly(CH, [3.25, 1.4, -1.25], [3.3, 1.2, PEW_Z(5)], pushK(f, W("dont judge"), 0.0025, 0.005, 30), { fov: 34, roll: 0.03 });
// 11 CTA: wide of the church from the back
const S11a = (f: number) => dolly(CH, [0.0, 2.2, 5.4], [0, 1.4, -6], pushK(f, fr(11), 0.002), { fov: 44 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: W("some say always"), cut: true, s: S1b }, { f: W("some say not"), cut: true, s: S1c }, { f: W("and both are"), cut: true, s: S1d }],
  2: [{ f: fr(2), s: S2a }],
  3: [{ f: fr(3), s: S3a }, { f: W("a woman who prays") - 10, dur: 36, s: S3b }],
  4: [{ f: fr(4), s: S4a }, { f: W("many historians") - 6, dur: 30, s: S4b }],
  5: [{ f: fr(5), s: S5a }],
  6: [{ f: fr(6), s: S6a }, { f: W("judge for yourselves") - 4, dur: 20, s: S6b }],
  7: [{ f: fr(7), s: S7a }, { f: W("what stays") - 8, dur: 30, s: S7b }],
  8: [{ f: fr(8), s: S8a }, { f: W("say the covering") - 8, dur: 30, s: S8b }],
  9: [{ f: fr(9), s: S9a }, { f: W("god looks at") - 8, dur: 30, s: S9b }],
  10: [{ f: fr(10), s: S10a }, { f: W("dont judge") - 6, dur: 26, s: S10b }],
  11: [{ f: fr(11), s: S11a }],
};

/** impact kicks: flip sign every frame, decaying over 7 frames */
export const KICKS: { f: number; a: number }[] = [{ f: W("shameful"), a: 0.6 }];
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

/** lens blur per beat: cInf px at 1080 wide (0 = sharp) */
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  const id = shotAt(f).id;
  const tab: Record<number, number> = { 1: 0, 2: 16, 3: 10, 4: 0, 5: 0, 6: 12, 7: 0, 8: 0, 9: 10, 10: 0, 11: 0 };
  let c = tab[id] ?? 0;
  if (id === 1 && f >= W("some say always") && f < W("and both are")) c = 12;
  if (id === 4 && f >= W("many historians")) c = 11 * glide((f - W("many historians")) / 20);
  if (id === 7 && f >= W("what stays")) c = 10;
  if (id === 10 && f >= W("dont judge")) c = 11;
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
// (the Paul short's walkers, idle)
export const pergaWalk = (t: number) => 0 * t;
export const playerAt = (t: number) => 0 * t;
export const coastX = (t: number) => 0 * t;
export const boatPos = (t: number): V3 => [5 + 0 * t, SEA_Y, -5];
