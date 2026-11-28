// Paul Reel 3 (Lystra, Acts 14). Hindi narration cues, in seconds and frames.
// Faster cutting than reel 2 (26 shots, ~2.4 s each) and moving cameras: push / pull / orbit / rise / truck / shake.
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
export const TOTAL = Math.round((END + 1.2) * FPS);

// ---------------- sets (world origins: the Paul world) ----------------
export const COURT: V3 = [0, 0, 0];
export const HARB: V3 = [0, 0, -200];
export const VILL: V3 = [200, 0, 0];      // Lystra: the town street with the preaching step
export const PERGA: V3 = [-300, 0, 150];  // the road outside the town, heading -x
export const FIELD: V3 = [0, 0, 200];
export const PRISON: V3 = [400, 0, 0];
export const STUDY: V3 = [400, 0, 40];
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
/** camera: az = degrees around the target from +z (toward +x), el = height above the target, move over the shot */
type Move = "push" | "pull" | "orbit" | "rise" | "drop" | "truck" | "shake" | "still";
type CamOpt = { az?: number; el?: number; move?: Move; amt?: number; fov?: number };
type Framing = [Set, Light, number, V3, number, CamOpt?];
const frames: Framing[] = [
  ["village", "day", 0, [0, 1.9, -5.8], 8.5, { el: -0.45, move: "push", amt: 0.16 }],                 // 1 hook: worshipped as a god
  ["village", "storm", LF(1, 8), [-0.2, 1.7, -5.6], 5.6, { el: -0.3, az: 0, move: "shake", amt: 0.12 }],    // 2 hook: the same crowd stones him
  ["village", "day", LF(2, 0), [0, 1.2, -1], 20, { el: 9, move: "drop", amt: 6 }],                      // 3 Lystra: establishing crane down
  ["village", "day", LF(2, 2), [-2.2, 0.75, -3], 4.2, { az: -25, el: 0.2, move: "push", amt: 0.12 }],    // 4 a man lame from birth
  ["village", "day", LF(2, 9), [-2.2, 1.0, -3], 3.1, { az: -10, el: 0.1, move: "push", amt: 0.12 }],     // 5 never walked a step (close)
  ["village", "day", LF(3, 0), [0.7, 1.55, -2.4], 2.6, { az: 35, el: 0.05, move: "push", amt: 0.12 }],   // 6 Paul looks at him
  ["village", "day", LF(3, 9), [0.7, 1.4, -2.4], 3.2, { az: 8, el: -0.75, move: "push", amt: 0.25 }],   // 7 "Stand up!" (low angle)
  ["village", "day", LF(3, 16), [-1.4, 1.2, -3], 5.4, { az: -18, el: -0.3, move: "orbit", amt: 22 }], // 8 he leaps and walks
  ["village", "day", LF(4, 0), [0, 1.3, -4.4], 8.5, { az: 0, el: 0.6, move: "orbit", amt: -18 }],        // 9 the crowd: gods have come down
  ["village", "day", LF(4, 8), [0.05, 1.6, -2.5], 4.6, { az: 4, el: 0.1, move: "push", amt: 0.1 }],     // 10 Zeus and Hermes labels
  ["village", "day", LF(4, 15), [2.6, 1.0, -0.5], 7.2, { az: 12, el: 0.3, move: "truck", amt: -1.6 }],   // 11 priest, bull, garlands
  ["village", "day", LF(5, 0), [0.05, 1.5, -2.5], 3.7, { az: -6, el: 0.05, move: "push", amt: 0.2 }],   // 12 they tear their clothes
  ["village", "day", LF(5, 7), [-1.2, 1.2, -2.5], 6, { az: 0, el: 0.3, move: "truck", amt: -1.6 }],     // 13 they rush into the crowd: "stop!"
  ["village", "day", LF(5, 12), [0.5, 1.5, -2.3], 4.4, { az: 20, el: -0.2, move: "orbit", amt: -14 }],  // 14 we are human like you
  ["village", "day", LF(5, 18), [0, 1.3, -3.6], 6.5, { az: 165, el: 0.8, move: "push", amt: 0.1 }],   // 15 the living God (reverse: the crowd)
  ["village", "storm", LF(6, 0), [2.6, 1.3, -1.5], 6, { az: 60, el: 0.3, move: "truck", amt: 1.2 }],     // 16 opponents stir the crowd
  ["village", "storm", LF(6, 7), [0, 1.3, -2.4], 4.6, { az: 25, el: -0.2, move: "shake", amt: 0.1 }],    // 17 stones rain down
  ["village", "storm", LF(6, 10), [-0.8, 0.6, -2.4], 4.4, { az: -20, el: 0.2, move: "push", amt: 0.15 }], // 18 Paul falls
  ["perga", "storm", LF(6, 13), [-1, 0.9, 0], 7.5, { az: 50, el: 0.8, move: "truck", amt: -2.2 }],       // 19 dragged out of the city
  ["perga", "storm", LF(7, 0), [-3, 0.3, 0], 5.2, { az: 30, el: 3.6, move: "drop", amt: 1.2 }],          // 20 disciples stand around him (high)
  ["perga", "golden", LF(7, 6), [-3, 1.2, 0], 3.6, { az: 20, el: -0.7, move: "rise", amt: 0.6 }],        // 21 Paul gets up
  ["perga", "golden", LF(7, 11), [-3, 1.5, 0], 2.8, { az: 115, el: 0.1, move: "push", amt: 0.12 }],      // 22 do you know where he went?
  ["village", "day", LF(7, 16), [0, 1.3, 3], 7, { az: 180, el: 0.5, move: "push", amt: 0.2 }],        // 23 back into the same city
  ["village", "day", LF(8, 0), [0, 1.0, -3.2], 5.5, { az: 12, el: 0.6, move: "orbit", amt: 16 }],     // 24 strengthening the disciples
  ["village", "day", LF(8, 7), [0, 1.5, -3.0], 2.6, { az: 5, el: 0, move: "push", amt: 0.1 }],        // 25 "through many hardships"
  ["perga", "golden", LF(9, 0), [-3, 1.5, 0], 3.2, { az: 22, el: 0.25, move: "push", amt: 0.12 }],        // 26 the lesson
  ["perga", "golden", LF(9, 9), [-3.5, 1.2, 0], 7, { az: 20, el: 0.4, move: "pull", amt: 0.2 }],           // 27 he refused praise and went back
  ["perga", "golden", LF(10, 0), [-4.5, 1.3, 0], 6.5, { az: 18, el: 0.3, move: "rise", amt: 1.0 }],        // 28 question + next reel
];
export const SHOTS: ShotDef[] = frames.map(([set, light, a], i) => ({
  id: i + 1, set, light, a, b: frames[i + 1]?.[2] ?? TOTAL,
}));
export const FLASH_AT = LF(2, 0); // end of the opening headline
export const XFADE = {};
export const KICKS = [];
export const shotAt = (f: number) => SHOTS.find(s => f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number) => [{ id: shotAt(f).id, alpha: 1 }];
export type Cam = { pos: V3; look: V3; roll: number; fov: number };
export const origin = (s: Set): V3 => s === "court" ? COURT : s === "harbour" ? HARB : s === "perga" ? PERGA : VILL;
export const beamAt = (id: number, t: number) => ({
  p: [PERGA[0] - 3, 0, PERGA[2]] as V3, o: id === 21 ? 0.035 + 0.01 * Math.sin(t * 2) : 0,
});
const hash = (n: number) => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
export const camAt = (id: number, f: number): Cam => {
  const [set, , a, [x, y, z], distance, o = {}] = frames[id - 1];
  const [ox, oy, oz] = origin(set);
  const u = smooth((f - a) / Math.max(1, SHOTS[id - 1].b - a));
  const mv = o.move ?? "push", amt = o.amt ?? 0.07;
  let d = distance, az = o.az ?? (set === "perga" ? 53 : 0), el = o.el ?? 0.27, side = 0;
  const look: V3 = [ox + x, oy + y, oz + z];
  if (mv === "push") d *= 1 - amt * u;
  if (mv === "pull") d *= 1 + amt * u;
  if (mv === "orbit") az += amt * u;
  if (mv === "rise") el += amt * u;
  if (mv === "drop") el += amt * (1 - u) - amt;
  if (mv === "truck") side = amt * (u - 0.5);
  const r = (az * Math.PI) / 180, cx = Math.sin(r), cz = Math.cos(r);
  // lateral move: slide both camera and target along the camera's right vector
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
