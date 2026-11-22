// Timeline of "पौलुस की यात्राएँ 1: शाऊल से पौलुस" (Acts 9), Hindi only. Every shot, camera key and expression change is
// anchored to a word of the Hindi narration: L(line, word) = start time (s) of word k of script line n (1-based lines),
// from words.ts (tools/words_ts_hi.py), so a new voice take re-times the whole film.
import { WORDS, LINES, END_AT } from "./words";

export const FPS = 30;
export const D0 = 0; // ground height (build.ts reads it)
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- words ----------------
/** start time (s) of word k (0-based) of script line n (1-based) */
export const L = (n: number, k = 0): number => WORDS[LINES[n - 1] + k][1];
/** frame a reaction should land on: 2 frames before the word */
export const LF = (n: number, k = 0) => Math.max(0, Math.round(L(n, k) * FPS) - 2);
/** compatibility with the shared cast machinery (English phrase anchors are not used in this film) */
export const T = (_p: string, _n = 1): number => 0;
export const W = (_p: string, _n = 1): number => 0;
const END = Math.max(END_AT, WORDS[WORDS.length - 1][2]);
export const TOTAL = Math.round((END + 0.9) * FPS);

// ---------------- sets (world origins: the Paul world of the Mark reel) ----------------
export const COURT: V3 = [0, 0, 0];       // a courtyard (Ananias at night)
export const HARB: V3 = [0, 0, -200];     // harbour (later reels)
export const VILL: V3 = [200, 0, 0];      // a town street with the preaching step (Jerusalem / Damascus)
export const PERGA: V3 = [-300, 0, 150];  // the road through the hills, heading -x (the Damascus road)
export const FIELD: V3 = [0, 0, 200];
export const PRISON: V3 = [400, 0, 0];
export const STUDY: V3 = [400, 0, 40];    // Judas' house on Straight Street: the room where Saul waits blind
export const QUAY_Z = -200, SEA_Y = -1.0;
export const SPOT = {
  table: [0, 0, -1.2] as V3, preach: [0, 0.45, -6] as V3, deskMark: [0, 0.5, -1.55] as V3, cellPaul: [0.2, 0, -1.9] as V3,
  quayMark0: [-11, 0, 1.4] as V3, quayMark1: [0.2, 0, 1.45] as V3,
};
export const sailOpen = (_t: number) => 0;
export const boatPos = (_t: number): V3 => [5, SEA_Y, -5];

// ---------------- shots ----------------
export type Light = "day" | "golden" | "storm" | "night";
export type Set = "court" | "harbour" | "village" | "lystra" | "perga" | "field" | "prison" | "study" | "coast";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; sunAz?: number; sunEl?: number };
const starts: [Set, Light, number][] = [
  ["village", "day", 0],                    // 1 hook: Saul with his arrest letters -> Paul preaching
  ["village", "day", LF(2, 0)],             // 2 Saul the Pharisee drags believers off
  ["perga", "day", LF(2, 11)],              // 3 on the road to Damascus with the letters
  ["perga", "day", LF(3, 0)],               // 4 the light from heaven, he falls
  ["perga", "day", LF(4, 0)],               // 5 "who are you, Lord?" "I am Jesus"
  ["perga", "day", LF(5, 0)],               // 6 blind, led by the hand
  ["study", "night", LF(5, 8)],             // 7 three days in the dark room
  ["court", "night", LF(6, 0)],             // 8 God sends Ananias
  ["study", "golden", LF(7, 0)],            // 9 hands, scales fall, he sees; baptism
  ["village", "day", LF(8, 0)],             // 10 preaching in the synagogues
  ["perga", "golden", LF(9, 0)],            // 11 the lesson
  ["perga", "golden", LF(10, 0)],           // 12 the journeys begin (CTA)
];
const SUN: Record<number, { sunAz?: number; sunEl?: number }> = { 9: { sunAz: 140, sunEl: 44 }, 11: { sunAz: 120, sunEl: 14 }, 12: { sunAz: 120, sunEl: 14 } };
export const SHOTS: ShotDef[] = starts.map(([set, light, f], i) => ({
  id: i + 1, set, light, a: f, b: i + 1 < starts.length ? starts[i + 1][2] : TOTAL, ...SUN[i + 1],
}));
export const XFADE: Record<number, number> = { 3: 10, 7: 12, 8: 12, 9: 12, 11: 14 };
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
/** Saul walking the road (shots 3-4), x offset from PERGA; stops when the light hits */
const T3 = L(2, 11), STOP = L(3, 2);
export const roadX = (t: number) => 2.0 - 1.15 * (Math.min(t, STOP) - T3);
export const XS = roadX(STOP);
/** the light: 0..1 */
export const lightOn = (t: number) => clamp01((t - STOP + 0.1) / 0.35);
/** fall: 0 standing .. 1 on the ground */
export const fallU = (t: number) => clamp01((t - L(3, 10) + 0.05) / 0.3);
/** blind walk (shot 6): led slowly toward Damascus */
export const blindX = (t: number) => XS - 1.5 - 0.55 * Math.max(0, t - L(5, 0));
/** final walk-off (shot 12) */
export const outX = (t: number) => XS - 0.6 * 0 - 0.9 * Math.max(0, t - L(10, 0));
/** beam from heaven per shot: position (base) and opacity */
export const beamAt = (id: number, t: number): { p: V3; o: number } => {
  const base: V3 = [PERGA[0] + XS, 0, PERGA[2]];
  if (id === 4) return { p: base, o: 0.1 * lightOn(t) };
  if (id === 5) return { p: base, o: 0.09 };
  if (id === 8) return { p: [COURT[0], 0, COURT[2] - 2.2], o: 0.1 * clamp01((t - L(6, 0)) / 0.6) };
  return { p: base, o: 0 };
};

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
// ---- framings ----
const fr = (id: number) => SHOTS[id - 1].a;
const P = (x: number, y: number, z: number): V3 => [x, y, z];
// 1 hook: Saul MCU with the letters -> Paul on the step preaching ("वही")
const S1a = (f: number) => dolly(VILL, P(0.55, 1.62, 1.2), P(-0.35, 1.45, -2.6), pushK(f, 0, 0.0028, 0.006, 30), { fov: 38, roll: 0.03 });
const S1b = (f: number) => dolly(VILL, P(-1.2, 1.7, -1.6), P(0.2, 2.0, -6), pushK(f, LF(1, 8), 0.0025, 0.006, 30), { fov: 38, roll: -0.04 });
// 2 the arrests: wide, then Saul pointing
const S2a = (f: number) => dolly(VILL, P(1.8, 2.0, 4.8), P(0.3, 1.3, -3.2), pushK(f, fr(2), 0.002), { fov: 42 });
const S2b = (f: number) => dolly(VILL, P(0.3, 1.6, 1.5), P(-0.6, 1.5, -2.6), pushK(f, LF(2, 4), 0.0028, 0.006, 30), { fov: 36, roll: -0.03 });
// 3 the road: side tracking with the hills behind
const S3a = (f: number) => { const x = roadX(f / FPS); return { pos: add(PERGA, [x + 0.6, 1.7, 7.6]), look: add(PERGA, [x + 0.9, 1.35, 0]), fov: 42, roll: 0 } as Shot; };
// 4 the light: wide, Saul stops; tilt up into the light; then the fall (lower, closer)
const S4a = (f: number) => dolly(PERGA, P(XS + 2.0, 1.6, 9.0), P(XS + 0.8, 2.2, 0), pushK(f, fr(4), 0.002, 0.006, 30), { fov: 46 });
const S4b = (f: number) => dolly(PERGA, P(XS + 1.6, 0.9, 5.2), P(XS + 0.2, 0.6, 0), pushK(f, LF(3, 10), 0.0025, 0.007, 30), { fov: 42, roll: 0.05 });
const S4c = (f: number) => dolly(PERGA, P(XS + 1.4, 1.1, 4.6), P(XS - 0.2, 1.6, 0), pushK(f, LF(3, 12), 0.0022), { fov: 44, roll: -0.03 });
// 5 Saul on the ground looking up; the voice
const S5a = (f: number) => dolly(PERGA, P(XS + 1.0, 1.9, 4.4), P(XS + 0.2, 0.45, 0.5), pushK(f, fr(5), 0.0025, 0.006, 30), { fov: 40, roll: 0.04 });
const S5b = (f: number) => dolly(PERGA, P(XS + 0.8, 1.7, 3.5), P(XS + 0.3, 0.5, 0.5), pushK(f, LF(4, 4), 0.0028, 0.007, 30), { fov: 38, roll: -0.04 });
// 6 blind, led by the hand: tracking
const S6a = (f: number) => { const x = blindX(f / FPS); return { pos: add(PERGA, [x + 0.2, 1.6, 6.8]), look: add(PERGA, [x + 0.05, 1.35, 0]), fov: 40, roll: 0 } as Shot; };
// 7 the dark room
const S7a = (f: number) => dolly(STUDY, P(0.35, 1.5, 1.9), P(0, 1.2, -1.55), pushK(f, fr(7), 0.0022, 0.005, 30), { fov: 40 });
// 8 Ananias in the courtyard at night, the light on him
const S8a = (f: number) => dolly(COURT, P(0.4, 1.7, 3.6), P(0, 1.6, -2.2), pushK(f, fr(8), 0.0022), { fov: 42 });
const S8b = (f: number) => dolly(COURT, P(0.25, 1.6, 0.9), P(0, 1.55, -2.2), pushK(f, LF(6, 8), 0.0025, 0.005, 30), { fov: 36, roll: 0.03 });
// 9 the healing: two-shot -> Saul CU on "देखने"
const S9a = (f: number) => dolly(STUDY, P(0.7, 1.5, 1.6), P(0.4, 1.2, -1.6), pushK(f, fr(9), 0.0025), { fov: 40 });
const S9b = (f: number) => dolly(STUDY, P(0.15, 1.45, 0.25), P(0, 1.35, -1.55), pushK(f, LF(7, 11), 0.003, 0.007, 30), { fov: 36, roll: 0.04 });
// 10 preaching in the synagogue street: behind the crowd -> closer on "यीशु"
const S10a = (f: number) => dolly(VILL, P(1.4, 2.2, 9.5), P(0, 1.6, -5.5), pushK(f, fr(10), 0.002), { fov: 42 });
const S10b = (f: number) => dolly(VILL, P(-1.2, 1.7, -1.6), P(0.2, 2.0, -6), pushK(f, LF(8, 15), 0.0025, 0.007, 30), { fov: 38, roll: -0.04 });
// 11 lesson: Paul in golden light on the road
const S11a = (f: number) => dolly(PERGA, P(XS + 0.4, 1.6, 3.0), P(XS - 0.2, 1.5, 0), pushK(f, fr(11), 0.0022), { fov: 38 });
const S11b = (f: number) => dolly(PERGA, P(XS + 0.3, 1.6, 2.3), P(XS - 0.2, 1.55, 0), pushK(f, LF(9, 9), 0.0025, 0.005, 30), { fov: 36, roll: 0.03 });
// 12 he walks off toward the hills, camera rises
const S12a = (f: number): Shot => {
  const u = glide((f - fr(12)) / 150), x = outX(f / FPS);
  return { pos: add(PERGA, [XS + 2.5 + 1.0 * u, 1.7 + 3.5 * u, 7.5 + 5 * u]), look: add(PERGA, [x - 1.0 - 4 * u, 1.3 + 0.6 * u, -2 * u]), fov: 42 + 4 * u, roll: 0 };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: LF(1, 8), cut: true, s: S1b }],
  2: [{ f: fr(2), s: S2a }, { f: LF(2, 4), cut: true, s: S2b }],
  3: [{ f: fr(3), s: S3a }],
  4: [{ f: fr(4), s: S4a }, { f: LF(3, 10), cut: true, s: S4b }, { f: LF(3, 12), dur: 30, s: S4c }],
  5: [{ f: fr(5), s: S5a }, { f: LF(4, 4) - 4, dur: 20, s: S5b }],
  6: [{ f: fr(6), s: S6a }],
  7: [{ f: fr(7), s: S7a }],
  8: [{ f: fr(8), s: S8a }, { f: LF(6, 8) - 6, dur: 30, s: S8b }],
  9: [{ f: fr(9), s: S9a }, { f: LF(7, 11), cut: true, s: S9b }],
  10: [{ f: fr(10), s: S10a }, { f: LF(8, 15) - 8, dur: 26, s: S10b }],
  11: [{ f: fr(11), s: S11a }, { f: LF(9, 9) - 6, dur: 30, s: S11b }],
  12: [{ f: fr(12), s: S12a }],
};

export const KICKS: { f: number; a: number }[] = [{ f: LF(3, 6), a: 0.9 }, { f: LF(3, 10), a: 1.1 }, { f: LF(4, 5), a: 0.6 }, { f: LF(8, 15), a: 0.6 }];
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

/** lens blur per beat: cInf px at 1080 wide (0 = sharp); only on close-ups, never on wides */
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  const id = shotAt(f).id;
  const tab: Record<number, number> = { 1: 8, 5: 8, 9: 0, 11: 9 };
  let c = tab[id] ?? 0;
  if (id === 9 && f >= LF(7, 11)) c = 9;
  if (id === 1 && f >= LF(1, 8)) c = 0;
  return { cInf: c };
};

/** the camera that decides how characters are drawn (front / side, facing, mirror) at frame f */
export const viewCam = (id: number, f: number): Cam => {
  const keys = CAMS[id];
  let k = keys[0];
  for (const kk of keys) if (f >= kk.f) k = kk;
  const s = SHOTS[id - 1];
  const vf = Math.min(s.b - 1, Math.max(s.a, k === keys[0] ? s.a : k.cut ? k.f : k.f + (k.dur ?? 24)));
  return run(keys, vf);
};
