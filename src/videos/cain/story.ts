// Timeline of "The First Offering" (Cain and Abel): every shot, camera key, kick and expression change is anchored to a
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
  ["altars", "golden", ""],                   // 1 hook
  ["fields", "day", "cain is a farmer"],      // 2 farmer / shepherd
  ["altars", "day", "one day they"],          // 3 both bring an offering
  ["altars", "day", "cain brings some"],      // 4 some crops
  ["altars", "day", "abel brings the"],       // 5 firstborn, best parts
  ["altars", "day", "god looks at"],          // 6 accepted
  ["altars", "day", "he looks at"],           // 7 not accepted
  ["altars", "day", "wait"],                  // 8 what's wrong with vegetables?
  ["tab", "golden", "nothing later"],         // 9 grain offerings in the law
  ["altars", "day", "you see the"],           // 10 the heart
  ["fields", "day", "abel gave his"],         // 11 first and best / just some / by faith
  ["kitchen", "day", "its like two"],         // 12 birthday card vs receipt
  ["altars", "golden", "cain is furious"],    // 13 furious; God doesn't give up
  ["hut", "night", "he says do"],             // 14 sin crouching at the door
  ["dusk", "golden", "cain doesnt"],          // 15 the field
  ["dusk", "golden", "god asks where"],       // 16 am I my brother's keeper?
  ["fields", "golden", "funny thing"],        // 17 the keeper of sheep
  ["dusk", "golden", "abels blood cried"],    // 18 the voice from the ground
  ["cross", "golden", "but the new"],         // 19 a better word
  ["cross", "golden", "abels cried for"],     // 20 justice / mercy
];
const SUN: Record<number, { sunAz?: number; sunEl?: number }> = { 1: { sunAz: 165, sunEl: 14 }, 13: { sunAz: 160, sunEl: 16 }, 15: { sunAz: 160, sunEl: 10 }, 16: { sunAz: 165, sunEl: 11 }, 17: { sunAz: 150, sunEl: 14 }, 18: { sunAz: 160, sunEl: 10 }, 19: { sunAz: 150, sunEl: 12 }, 20: { sunAz: 160, sunEl: 13 }, 14: { sunAz: 160, sunEl: 45 }, 9: { sunAz: 160, sunEl: 18 } };
export const SHOTS: ShotDef[] = starts.map(([set, light, w], i) => ({
  id: i + 1, set, light, a: i === 0 ? 0 : W(w), b: i + 1 < starts.length ? W(starts[i + 1][2]) : TOTAL, ...SUN[i + 1],
}));
export const XFADE: Record<number, number> = { 2: 8, 3: 8, 9: 8, 10: 8, 11: 8, 12: 10, 13: 10, 14: 10, 15: 10, 17: 8, 18: 8, 19: 12 };
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
/** brothers climbing to the altars (shot 3): 0..1 */
export const climb = (t: number) => clamp01((t - T("one day they") + 0.2) / 2.4);
/** the light that accepts Abel's offering (shot 6): 0..1 */
export const beamOn = (id: number, t: number) => (id === 6 ? smooth((t - T("and accepts it")) / 0.5) : id === 5 || id === 10 ? 0 : 0);
/** the two walking into the dusk field (shot 15) */
export const duskWalk = (t: number) => Math.max(0, t - T("cain doesnt")) * 1.1;

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
const S1a = (f: number) => dolly(ALT, [0, 1.7, 13], [0, 1.2, 0], pushK(f, 0, 0.0028), { fov: 44 });
const S1b = (f: number) => dolly(ALT, [0.2, 1.6, 8.2], [0, 1.3, 0.5], pushK(f, W("one of them"), 0.002, 0.006, 30), { fov: 42, roll: -0.04 });
const S2a = (f: number) => dolly(FARM, [1.6, 1.6, 6.2], [0, 1.2, 0], pushK(f, fr(2), 0.0025), { fov: 40 });
const S2b = (f: number) => dolly(PAST, [-1.6, 1.6, 6.2], [0, 1.2, 0], pushK(f, W("his little brother"), 0.0025), { fov: 40 });
const S3a = (f: number) => dolly(ALT, [1.0, 3.0, 19], [0, 1.0, 4], pushK(f, fr(3), 0.002), { fov: 48 });
const S4a = (f: number) => dolly(CAIN_ALT, [0.3, 1.6, 3.9], [0.5, 1.2, 0.3], pushK(f, fr(4), 0.003, 0.006, 30), { fov: 40 });
const S5a = (f: number) => dolly(ABEL_ALT, [-0.3, 1.6, 3.9], [-0.5, 1.2, 0.3], pushK(f, fr(5), 0.0025), { fov: 40 });
const S5b = (f: number) => dolly(ABEL_ALT, [-0.2, 1.5, 2.9], [-0.35, 1.15, 0.2], pushK(f, W("the best parts"), 0.003, 0.006, 30), { fov: 38, roll: 0.03 });
const S6a = (f: number) => dolly(ALT, [1.8, 2.4, 9.5], [1.6, 3.2, 0], pushK(f, fr(6), 0.002), { fov: 44 });
const S7a = (f: number) => dolly(CAIN_ALT, [1.0, 1.6, 4.2], [0.45, 1.3, 0.3], pushK(f, fr(7), 0.0025, 0.006, 30), { fov: 40, roll: -0.04 });
const S8a = (f: number) => dolly(CAIN_ALT, [0.15, 1.45, 1.4], [0, 1.0, -0.05], pushK(f, fr(8), 0.003, 0.007, 30), { fov: 32, roll: 0.05 });
const S9a = (f: number) => dolly(TAB, [3.2, 2.0, 7.5], [0, 1.4, 0], pushK(f, fr(9), 0.002), { fov: 42 });
const S10a = (f: number) => dolly(ALT, [0, 1.7, 8.2], [0, 1.45, 1.5], pushK(f, fr(10), 0.0025), { fov: 40 });
const S11a = (f: number) => dolly(PAST, [-1.2, 1.5, 4.8], [0.4, 1.0, 0.5], pushK(f, fr(11), 0.003), { fov: 38 });
const S11b = (f: number) => dolly(FARM, [1.2, 1.5, 4.8], [-0.2, 1.0, 0.5], pushK(f, W("cain just brought"), 0.003), { fov: 38, roll: -0.03 });
const S11c = (f: number) => dolly(ABEL_ALT, [-0.6, 1.6, 3.0], [0, 1.4, 0.3], pushK(f, W("the bible says"), 0.0025), { fov: 38 });
const S12a = (f: number) => dolly(KIT, [0.1, 1.4, 4.6], [-0.1, 0.9, 0], pushK(f, fr(12), 0.0025), { fov: 44 });
const S12b = (f: number) => dolly(KIT, [1.1, 1.25, 2.0], [0.7, 1.0, 0], pushK(f, W("the other signs"), 0.003, 0.006, 30), { fov: 36, roll: 0.04 });
const S13a = (f: number) => dolly(CAIN_ALT, [0.7, 1.65, 3.6], [0.6, 1.45, 0.4], pushK(f, fr(13), 0.003, 0.006, 30), { fov: 40, roll: 0.04 });
const S13b = (f: number) => dolly(CAIN_ALT, [1.4, 1.9, 4.6], [0.5, 1.6, 0.3], pushK(f, W("but god doesnt"), 0.002), { fov: 42 });
const S14a = (f: number) => dolly(HUT, [0.2, 1.6, 7.6], [0, 1.0, 0.8], pushK(f, fr(14), 0.002), { fov: 46 });
const S14b = (f: number) => dolly(HUT, [2.0, 1.0, 4.0], [1.1, 0.6, 0.5], pushK(f, W("but sin is"), 0.003, 0.006, 40), { fov: 38, roll: -0.04 });
const S15a = (f: number) => dolly(ALT, [1.5, 1.9, 29], [0, 1.3, 16], pushK(f, fr(15), 0.0015), { fov: 42 });
const S15b = (f: number) => dolly(ALT, [2.4, 1.5, 17.2], [0, 1.1, 13], pushK(f, W("and kills him"), 0.002), { fov: 40 });
const S16a = (f: number) => dolly(ALT, [0.5, 1.6, 17.0], [-0.5, 1.4, 13], pushK(f, fr(16), 0.0025, 0.005, 30), { fov: 38 });
const S16b = (f: number) => dolly(ALT, [0.2, 1.6, 16.0], [-0.5, 1.45, 13], pushK(f, W("cain says"), 0.003, 0.006, 30), { fov: 36, roll: -0.04 });
const S17a = (f: number) => dolly(PAST, [0.6, 0.9, 3.4], [0, 0.6, 0], pushK(f, fr(17), 0.003, 0.006, 30), { fov: 36 });
const S18a = (f: number) => dolly(ALT, [0.8, 0.9, 15.6], [0.3, 0.1, 13.2], pushK(f, fr(18), 0.002), { fov: 38 });
const S19a = (f: number) => dolly(HILLX, [2.5, 2.2, 17], [0, 4.0, -6], pushK(f, fr(19), 0.0018), { fov: 44 });
const S20a = (f: number) => dolly(HILLX, [0.6, 1.7, 9.5], [0, 1.6, 6], pushK(f, fr(20), 0.0025), { fov: 38 });
const S20b = (f: number) => dolly(HILLX, [0.3, 1.65, 8.4], [0, 1.6, 6], pushK(f, W("jesus cries for"), 0.0028, 0.006, 40), { fov: 36 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: W("one of them") - 6, dur: 30, s: S1b }],
  2: [{ f: fr(2), s: S2a }, { f: W("his little brother"), cut: true, s: S2b }],
  3: [{ f: fr(3), s: S3a }],
  4: [{ f: fr(4), s: S4a }],
  5: [{ f: fr(5), s: S5a }, { f: W("the best parts"), cut: true, s: S5b }],
  6: [{ f: fr(6), s: S6a }],
  7: [{ f: fr(7), s: S7a }],
  8: [{ f: fr(8), s: S8a }],
  9: [{ f: fr(9), s: S9a }],
  10: [{ f: fr(10), s: S10a }],
  11: [{ f: fr(11), s: S11a }, { f: W("cain just brought"), cut: true, s: S11b }, { f: W("the bible says"), cut: true, s: S11c }],
  12: [{ f: fr(12), s: S12a }, { f: W("the other signs"), cut: true, s: S12b }],
  13: [{ f: fr(13), s: S13a }, { f: W("but god doesnt") - 6, dur: 30, s: S13b }],
  14: [{ f: fr(14), s: S14a }, { f: W("but sin is") - 8, dur: 36, s: S14b }],
  15: [{ f: fr(15), s: S15a }, { f: W("and kills him"), cut: true, s: S15b }],
  16: [{ f: fr(16), s: S16a }, { f: W("cain says"), cut: true, s: S16b }],
  17: [{ f: fr(17), s: S17a }],
  18: [{ f: fr(18), s: S18a }],
  19: [{ f: fr(19), s: S19a }],
  20: [{ f: fr(20), s: S20a }, { f: W("jesus cries for") - 6, dur: 40, s: S20b }],
};

export const KICKS: { f: number; a: number }[] = [{ f: W("killing the other"), a: 0.8 }, { f: W("cain is furious"), a: 0.9 }, { f: W("and kills him"), a: 0.6 }, { f: W("wait"), a: 0.5 }];
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
  const tab: Record<number, number> = { 1: 0, 2: 9, 3: 0, 4: 12, 5: 12, 6: 0, 7: 12, 8: 14, 9: 0, 10: 10, 11: 11, 12: 9, 13: 12, 14: 9, 15: 0, 16: 11, 17: 13, 18: 12, 19: 0, 20: 11 };
  let c = tab[id] ?? 0;
  if (id === 1 && f >= W("one of them")) c = 10 * glide((f - W("one of them")) / 20);
  if (id === 12 && f >= W("the other signs")) c = 12;
  if (id === 14 && f >= W("but sin is")) c = 12;
  if (id === 15 && f >= W("and kills him")) c = 10;
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
