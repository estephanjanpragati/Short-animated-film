// The Tower of Babel (Genesis 11:1-9, with Acts 2). Hindi narration cues, in seconds and frames.
// Fast cutting (26 shots) and moving cameras: push / pull / orbit / rise / drop / truck / shake.
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
export const T = (_p: string, _n = 1): number => 0;
export const W = (_p: string, _n = 1): number => 0;
const END = Math.max(END_AT, WORDS[WORDS.length - 1][2]);
export const TOTAL = Math.round((END + 1.4) * FPS);

// ---------------- sets ----------------
export const COURT: V3 = [0, 0, 0];       // Jerusalem courtyard (Pentecost)
export const HARB: V3 = [0, 0, -200];
export const VILL: V3 = [200, 0, 0];
export const PERGA: V3 = [-300, 0, 150];
export const FIELD: V3 = [0, 0, 200];
export const PRISON: V3 = [400, 0, 0];
export const STUDY: V3 = [400, 0, 40];
export const BAB: V3 = [300, 0, 450];     // the plain of Shinar: the tower stands at local (0, 0, -30)
export const QUAY_Z = -200, SEA_Y = -1.0;
export const SPOT = {
  table: [0, 0, -1.2] as V3, preach: [0, 0.45, -6] as V3, deskMark: [0, 0.5, -1.55] as V3, cellPaul: [0.2, 0, -1.9] as V3,
  quayMark0: [-11, 0, 1.4] as V3, quayMark1: [0.2, 0, 1.45] as V3,
};
export const sailOpen = (_t: number) => 0;
export const boatPos = (_t: number): V3 => [5, SEA_Y, -5];

// ---------------- the tower ----------------
export const TOWER_Z = -30, TIER_H = 3.4;
export const TIER_HALF = [13, 11.2, 9.4, 7.6, 5.8, 4.0, 2.4];
export const tierTop = (i: number) => (i + 1) * TIER_H;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "storm" | "night";
export type Set = "court" | "harbour" | "village" | "lystra" | "perga" | "field" | "prison" | "study" | "coast" | "babel";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; sunAz?: number; sunEl?: number };
type Move = "push" | "pull" | "orbit" | "rise" | "drop" | "truck" | "shake" | "still";
type CamOpt = { az?: number; el?: number; move?: Move; amt?: number; fov?: number };
type Framing = [Set, Light, number, V3, number, CamOpt?];
const TZ = TOWER_Z, TERR = TZ + TIER_HALF[1] - 0.9; // the second-tier terrace where the builders work (front edge)
const frames: Framing[] = [
  ["babel", "golden", 0, [0, 13, TZ], 44, { az: 15, el: -11, move: "rise", amt: 5 }],                        // 1 hook: a tower to reach the sky
  ["babel", "day", LF(1, 7), [-3.8, 8.1, TERR], 7.6, { az: 10, el: 0.3, move: "shake", amt: 0.08 }],           // 2 hook: nobody understands anybody
  ["babel", "day", LF(2, 0), [-14, 1.2, 22], 9.5, { az: 0, el: 0.6, move: "truck", amt: 3 }],               // 3 after the flood: one language
  ["babel", "day", LF(2, 10), [0, 2, 0], 42, { az: 10, el: 22, move: "drop", amt: 10 }],                    // 4 settled on the plain of Shinar
  ["babel", "day", LF(3, 0), [8, 1.1, -4], 6.5, { az: 18, el: 0.5, move: "orbit", amt: 14 }],               // 5 "come, let us make bricks"
  ["babel", "golden", LF(3, 7), [12.6, 1.1, -7.6], 5.6, { az: -15, el: 0.6, move: "push", amt: 0.15 }],         // 6 and bake them in the fire
  ["babel", "day", LF(3, 10), [3, 1.4, -16.2], 6, { az: 28, el: 0.5, move: "push", amt: 0.12 }],            // 7 brick for stone, tar for mortar
  ["babel", "day", LF(4, 0), [0, 1.7, -11.5], 3.8, { az: -15, el: -0.8, move: "push", amt: 0.15 }],         // 8 "come, let us build a tower"
  ["babel", "day", LF(4, 6), [0, 9, TZ], 52, { az: 25, el: 1, move: "rise", amt: 9 }],                      // 9 time-lapse: the tower rises
  ["babel", "golden", LF(4, 11), [0, 2.4, -12], 9.5, { az: 0, el: -0.3, move: "push", amt: 0.12 }],         // 10 "let us make a name for ourselves"
  ["babel", "golden", LF(5, 0), [0, 0, -10], 85, { az: 30, el: 62, move: "orbit", amt: 20 }],               // 11 but God had said: fill the earth
  ["babel", "day", LF(6, 0), [0, 23, TZ], 6, { az: 20, el: 170, move: "drop", amt: 120 }],                  // 12 the LORD came down to see
  ["babel", "day", LF(6, 7), [0, 10, TZ], 10, { az: 40, el: 75, move: "orbit", amt: 50 }],                  // 13 the "sky-high" tower, from above
  ["babel", "day", LF(6, 14), [-3.8, 8.4, TERR], 7.8, { az: -8, el: -0.9, move: "push", amt: 0.1 }],           // 14 God had to come down
  ["babel", "day", LF(7, 0), [-3.8, 8.1, TERR], 7.6, { az: 12, el: 0.4, move: "orbit", amt: -16 }],            // 15 he confused their language
  ["babel", "day", LF(7, 8), [-5.3, 8.3, TERR], 3.0, { az: 20, el: 0.1, move: "push", amt: 0.12 }],         // 16 one asks for a brick
  ["babel", "day", LF(7, 11), [-4.85, 8.2, TERR], 4.2, { az: -12, el: 0.1, move: "push", amt: 0.1 }],         // 17 the other understands something else
  ["babel", "day", LF(7, 17), [0, 8, TZ], 26, { az: 38, el: 3, move: "pull", amt: 0.12 }],                  // 18 the work stopped
  ["babel", "golden", LF(8, 0), [0, 0, -6], 42, { az: 0, el: 26, move: "rise", amt: 8 }],                   // 19 scattered over the earth
  ["babel", "storm", LF(8, 6), [0, 11, TZ], 50, { az: -20, el: 0, move: "pull", amt: 0.12 }],               // 20 its name: Babel, confusion
  ["court", "golden", LF(9, 0), [0, 1.8, -3], 6.2, { az: 0, el: 0.2, move: "push", amt: 0.12 }],            // 21 Pentecost: tongues of fire
  ["court", "day", LF(9, 6), [0, 1.3, -2.6], 8.5, { az: 160, el: 0.8, move: "orbit", amt: -18 }],           // 22 each heard in his own language
  ["court", "golden", LF(9, 19), [0, 1.4, -3], 7.5, { az: 10, el: 0.5, move: "rise", amt: 1.2 }],           // 23 what was scattered, God joined
  ["babel", "golden", LF(10, 0), [0, 1.4, -12], 5.5, { az: 18, el: 0.3, move: "pull", amt: 0.2 }],          // 24 lesson: those who exalt their own name scatter
  ["court", "golden", LF(10, 9), [0, 1.4, -3], 6.5, { az: -12, el: 0.4, move: "push", amt: 0.12 }],         // 25 those who exalt God's name are joined
  ["babel", "golden", LF(11, 0), [0, 10, TZ], 56, { az: 30, el: 2, move: "orbit", amt: 12 }],               // 26 question + end card
];
export const SHOTS: ShotDef[] = frames.map(([set, light, a], i) => ({
  id: i + 1, set, light, a, b: frames[i + 1]?.[2] ?? TOTAL,
}));
export const FLASH_AT = LF(2, 0);
export const XFADE = {};
export const KICKS = [];
export const shotAt = (f: number) => SHOTS.find(s => f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number) => [{ id: shotAt(f).id, alpha: 1 }];
export type Cam = { pos: V3; look: V3; roll: number; fov: number };
export const origin = (s: Set): V3 => s === "court" ? COURT : s === "harbour" ? HARB : s === "perga" ? PERGA : s === "babel" ? BAB : VILL;

/** how many tiers stand (fractional = the top tier is being built) */
export const towerAt = (id: number, f: number): number => {
  if (id <= 2) return 6.6;                                   // the hook: the finished-looking tower
  if (id <= 6) return 0;                                     // before building
  if (id === 7) return 0.28;                                 // the first course of bricks
  if (id === 8) return 0.6;
  if (id === 9) { const s = SHOTS[8]; return 0.8 + 5.8 * smooth((f - s.a) / (s.b - s.a)); }
  return 6.6;                                                // unfinished for ever
};
/** light from heaven onto the tower top (shots 12-14) and over the apostles (21) */
export const beamAt = (id: number, t: number) => {
  if (id === 14) return { p: [BAB[0], tierTop(5), BAB[2] + TZ] as V3, o: 0.05 + 0.01 * Math.sin(t * 2) };
  if (id === 12 || id === 13) return { p: [BAB[0], tierTop(5), BAB[2] + TZ] as V3, o: 0.018 };
  if (id === 21) return { p: [0, 0, -3.4] as V3, o: 0.018 + 0.005 * Math.sin(t * 2) };
  return { p: [0, 0, 0] as V3, o: 0 };
};
const hash = (n: number) => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
export const camAt = (id: number, f: number): Cam => {
  const [set, , a, [x, y, z], distance, o = {}] = frames[id - 1];
  const [ox, oy, oz] = origin(set);
  const u = smooth((f - a) / Math.max(1, SHOTS[id - 1].b - a));
  const mv = o.move ?? "push", amt = o.amt ?? 0.07;
  let d = distance, az = o.az ?? 0, el = o.el ?? 0.27, side = 0;
  const look: V3 = [ox + x, oy + y, oz + z];
  if (mv === "push") d *= 1 - amt * u;
  if (mv === "pull") d *= 1 + amt * u;
  if (mv === "orbit") az += amt * u;
  if (mv === "rise") el += amt * u;
  if (mv === "drop") el += amt * (1 - u) - amt;
  if (mv === "truck") side = amt * (u - 0.5);
  const r = (az * Math.PI) / 180, cx = Math.sin(r), cz = Math.cos(r);
  look[0] += side * cz; look[2] += -side * cx;
  let roll = 0;
  if (mv === "shake") {
    const k = Math.floor(f / 2);
    look[0] += amt * (hash(k) - 0.5); look[1] += amt * (hash(k + 99) - 0.5); roll = 0.02 * (hash(k + 7) - 0.5);
    d *= 1 - 0.1 * u;
  }
  return { look, pos: [look[0] + d * cx, look[1] + el, look[2] + d * cz], fov: o.fov ?? 43, roll };
};
export const viewCam = camAt;
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } =>
  ({ cInf: frames[shotAt(f).id - 1][4] <= 3.7 ? 6 : 0 });
