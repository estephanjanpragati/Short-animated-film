// Timeline of "Only One Handle" (Noah and the door): every shot, camera key, kick and expression change is anchored to a
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
export const ARK: V3 = [0, 0, 0];          // the ark: hull along x (-30..30), door in the +z side at x 6..9
export const HILL: V3 = [-8, 0, 30];       // the neighbours' hill
export const FEAST: V3 = [42, 0, 32];      // the neighbours' village, eating and a wedding
export const COT: V3 = [300, 0, 0];        // cottage door in the rain (the friend knocking)
export const JDOOR: V3 = [300, 0, 60];     // the overgrown door Jesus knocks at
export const ROOM: V3 = [400, 0, 0];       // inside the house: the handle is on this side
export const DOOR_X = 7.5, DOOR_Z = 6.0, DOOR_Y = 1.6, DOOR_W = 3.0, DOOR_H = 4.0;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "storm" | "night";
export type Set = "ark" | "hill" | "feast" | "flood" | "cottage" | "jdoor" | "room";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; sunAz?: number; sunEl?: number };
const starts: [Set, Light, string][] = [
  ["ark", "day", ""],                              // 1 hook: one door
  ["ark", "day", "noah is building"],              // 2 Noah hammering, crane out
  ["hill", "day", "for years his"],                // 3 neighbours watch
  ["ark", "day", "he keeps warning"],              // 4 Noah warns / they laugh
  ["ark", "day", "then the animals"],              // 5 animals two by two
  ["feast", "golden", "and the neighbours"],       // 6 eating, drinking, weddings
  ["ark", "golden", "noah walks in"],              // 7 family walks in, the Lord shuts the door
  ["ark", "golden", "not noah"],                   // 8 God closed the door
  ["flood", "storm", "luckily"],                   // 9 the door kept the flood out
  ["flood", "storm", "unluckily"],                 // 10 ... and everyone else
  ["ark", "golden", "you see for years"],          // 11 the open door, years of waiting
  ["cottage", "night", "think of a friend"],       // 12 a friend knocking in the rain
  ["jdoor", "night", "thats what jesus says"],     // 13 I stand at the door and knock
  ["jdoor", "night", "in holman hunts"],           // 14 no handle on the outside
  ["jdoor", "night", "he left it off"],            // 15 on purpose
  ["room", "night", "noahs door was"],             // 16 the handle is on your side
];
const SUN: Record<number, { sunAz?: number; sunEl?: number }> = { 1: { sunAz: 165, sunEl: 40 }, 2: { sunAz: 165, sunEl: 45 }, 3: { sunAz: 168, sunEl: 40 }, 4: { sunAz: 160, sunEl: 40 }, 5: { sunAz: 165, sunEl: 40 }, 7: { sunAz: 165, sunEl: 14 }, 8: { sunAz: 165, sunEl: 16 }, 11: { sunAz: 160, sunEl: 15 }, 6: { sunAz: 100, sunEl: 12 }, 16: { sunAz: 160, sunEl: 55 } };
export const SHOTS: ShotDef[] = starts.map(([set, light, w], i) => ({
  id: i + 1, set, light, a: i === 0 ? 0 : W(w), b: i + 1 < starts.length ? W(starts[i + 1][2]) : TOTAL, ...SUN[i + 1],
}));
export const XFADE: Record<number, number> = { 6: 8, 7: 8, 9: 8, 11: 10, 12: 10, 13: 8, 16: 10 };
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
/** ark door angle: 0 open (lying down as the ramp-side hatch swings out) .. 1 shut; shuts on "the Lord shut him in" */
export const doorShut = (id: number, t: number) => (id === 7 ? smooth((t - T("the lord shut")) / 0.9) : id >= 8 && id <= 10 ? 1 : 0);
/** flood water level (m above the ground at the ark) */
export const waterY = (id: number, t: number) => (id === 9 ? Math.min(7, 1.2 + 1.1 * Math.max(0, t - T("luckily"))) : id === 10 ? 1.7 + 0.22 * Math.max(0, t - T("unluckily")) : -2);
/** the ark floats once the water reaches its keel (keel at 0.5 m) */
export const arkLift = (id: number, t: number) => Math.max(0, waterY(id, t) - 2.2);
/** animals walk to the ramp: progress (m along the path) */
export const animalWalk = (t: number) => Math.max(0, t - T("then the animals") + 1.2) * 2.6;
/** family walking up the ramp (shot 7) */
export const familyWalk = (t: number) => clamp01((t - T("noah walks in") + 0.2) / 2.6);
/** the neighbours' hill: ground height at a point (11 x 9 m dome, 2.6 m high) */
export const hillY = (x: number, z: number) => 2.6 * Math.sqrt(Math.max(0, 1 - ((x - HILL[0]) / 11) ** 2 - ((z - HILL[2]) / 9) ** 2));
export const KNOCKS = (() => { const a = T("knocking on your door"), b = T("i stand at the door"); return [a + 0.1, a + 0.45, a + 0.8, b + 0.6, b + 0.95, b + 1.3]; })();

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
const S1a = (f: number) => dolly(ARK, [24, 1.3, 32], [4, 5.2, 0], pushK(f, 0, 0.0025), { fov: 46 });
const S1b = (f: number) => dolly(ARK, [12.5, 3.2, 19], [DOOR_X, 3.5, DOOR_Z], pushK(f, W("one door"), 0.002, 0.006, 30), { fov: 38, roll: 0.03 });
const S2a = (f: number) => dolly(ARK, [-7.6, 4.9, 13], [-10, 4.9, 6.8], pushK(f, fr(2), 0.0025), { fov: 40 });
const S2b = (f: number) => dolly(ARK, [46, 30, 72], [0, 4, 0], pushK(f, W("longer than"), 0.0015), { fov: 46 });
const S3a = (f: number) => dolly(HILL, [7, 4.4, 9], [-0.5, 2.8, -6], pushK(f, fr(3), 0.002), { fov: 42 });
const S4a = (f: number) => dolly(ARK, [3.0, 1.6, 17.5], [4.4, 1.55, 12.5], pushK(f, fr(4), 0.0025, 0.005, 30), { fov: 38 });
const S4b = (f: number) => dolly(HILL, [2.6, 3.6, 4.6], [1.5, 3.3, -0.6], pushK(f, W("they keep laughing"), 0.0025), { fov: 38, roll: -0.04 });
const S5a = (f: number) => dolly(ARK, [24, 2.4, 26], [10, 2.4, 13], pushK(f, fr(5), 0.002), { fov: 44 });
const S5b = (f: number) => dolly(ARK, [17, 2.2, 21], [12.5, 2.4, 14], pushK(f, W("two by two"), 0.0025, 0.006, 30), { fov: 40, roll: 0.03 });
const S5c = (f: number) => dolly(HILL, [2.4, 3.6, 4.4], [1.5, 3.3, -0.6], pushK(f, W("on their own"), 0.003), { fov: 38, roll: 0.04 });
const S6a = (f: number) => dolly(FEAST, [1.2, 2.0, 9.5], [0, 1.4, 0], pushK(f, fr(6), 0.002), { fov: 42 });
const S6b = (f: number) => dolly(FEAST, [1.2, 2.0, 9.5], [-12, 22, -30], pushK(f, W("jesus said"), 0.0015), { fov: 46 });
const S7a = (f: number) => dolly(ARK, [17, 2.6, 21], [DOOR_X, 3.0, 9], pushK(f, fr(7), 0.002), { fov: 42 });
const S7b = (f: number) => dolly(ARK, [10.8, 3.4, 14], [DOOR_X, 3.6, DOOR_Z], pushK(f, W("the lord shut"), 0.002, 0.006, 30), { fov: 38 });
const S8a = (f: number) => dolly(ARK, [10.2, 3.4, 16.5], [DOOR_X, 3.6, DOOR_Z], pushK(f, fr(8), 0.0025, 0.006, 40), { fov: 38, roll: -0.04 });
const S9a = (f: number) => dolly(ARK, [42, 15, 52], [0, 5, 0], pushK(f, fr(9), 0.0015), { fov: 46 });
const S10a = (f: number) => dolly(HILL, [5, 4.4, 9.5], [0.5, 3.4, -1.5], pushK(f, fr(10), 0.0025), { fov: 40, roll: -0.03 });
const S11a = (f: number) => dolly(ARK, [13, 2.2, 18], [DOOR_X, 3.2, DOOR_Z], pushK(f, fr(11), 0.0018), { fov: 40 });
const S12a = (f: number) => dolly(COT, [2.4, 1.7, 6.2], [0.25, 1.35, 0.9], pushK(f, fr(12), 0.0025), { fov: 40 });
const S12b = (f: number) => dolly(ROOM, [0.9, 1.35, 1.4], [0.55, 1.05, -2.9], pushK(f, W("but the handle"), 0.003, 0.006, 30), { fov: 36 });
const S13a = (f: number) => dolly(JDOOR, [3.0, 1.7, 5.6], [0.3, 1.4, 0.7], pushK(f, fr(13), 0.002), { fov: 40 });
const S13b = (f: number) => dolly(JDOOR, [1.9, 1.62, 3.4], [0.75, 1.55, 1.0], pushK(f, W("if anyone hears"), 0.0025, 0.005, 30), { fov: 34, roll: 0.03 });
const S14a = (f: number) => dolly(JDOOR, [-0.6, 1.3, 2.6], [-0.2, 1.2, 0.05], pushK(f, fr(14), 0.002), { fov: 36 });
const S14b = (f: number) => dolly(JDOOR, [0.4, 1.25, 2.4], [-0.5, 1.15, 0.05], pushK(f, W("has no handle"), 0.0025, 0.006, 30), { fov: 34, roll: -0.03 });
const S15a = (f: number) => dolly(JDOOR, [1.7, 1.6, 3.2], [0.75, 1.55, 1.0], pushK(f, fr(15), 0.003), { fov: 34, roll: -0.02 });
const S16a = (f: number) => dolly(ROOM, [0.2, 1.55, 2.4], [0, 1.25, -2.9], pushK(f, fr(16), 0.0022), { fov: 40 });
const S16b = (f: number) => dolly(ROOM, [0.45, 1.25, 0.6], [0.55, 1.05, -2.9], pushK(f, W("this one"), 0.0025, 0.006, 40), { fov: 36 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: W("one door") - 6, dur: 34, s: S1b }],
  2: [{ f: fr(2), s: S2a }, { f: W("longer than") - 4, dur: 40, s: S2b }],
  3: [{ f: fr(3), s: S3a }],
  4: [{ f: fr(4), s: S4a }, { f: W("they keep laughing"), cut: true, s: S4b }],
  5: [{ f: fr(5), s: S5a }, { f: W("two by two"), cut: true, s: S5b }, { f: W("on their own"), cut: true, s: S5c }],
  6: [{ f: fr(6), s: S6a }, { f: W("jesus said") - 4, dur: 40, s: S6b }],
  7: [{ f: fr(7), s: S7a }, { f: W("the lord shut"), cut: true, s: S7b }],
  8: [{ f: fr(8), s: S8a }],
  9: [{ f: fr(9), s: S9a }],
  10: [{ f: fr(10), s: S10a }],
  11: [{ f: fr(11), s: S11a }],
  12: [{ f: fr(12), s: S12a }], // (the room cut on "but the handle" left the room set in this canvas and darkened shot 16; the handle close-up is shot 16)
  13: [{ f: fr(13), s: S13a }, { f: W("if anyone hears"), cut: true, s: S13b }],
  14: [{ f: fr(14), s: S14a }, { f: W("has no handle") - 8, dur: 36, s: S14b }],
  15: [{ f: fr(15), s: S15a }],
  16: [{ f: fr(16), s: S16a }, { f: W("this one") - 10, dur: 40, s: S16b }],
};

export const KICKS: { f: number; a: number }[] = [
  { f: W("closed the door"), a: 1 }, { f: W("the lord shut") + 26, a: 0.8 }, ...KNOCKS.map((t) => ({ f: Math.round(t * FPS), a: 0.25 })),
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
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  const id = shotAt(f).id;
  const tab: Record<number, number> = { 1: 0, 2: 10, 3: 0, 4: 12, 5: 0, 6: 0, 7: 0, 8: 12, 9: 0, 10: 9, 11: 0, 12: 9, 13: 9, 14: 13, 15: 13, 16: 10 };
  let c = tab[id] ?? 0;
  if (id === 2 && f >= W("longer than") - 4) c = 0;
  if (id === 4 && f >= W("they keep laughing")) c = 10;
  if (id === 5 && f >= W("two by two")) c = 10;
  if (id === 7 && f >= W("the lord shut")) c = 11;
  if (id === 13 && f >= W("if anyone hears")) c = 13;
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
