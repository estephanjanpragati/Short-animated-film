// Hindi narration cues, in seconds and frames.
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
// Set, light, cut, and camera target relative to the set. Distance controls shot size.
type Framing = [Set, Light, number, V3, number];
const frames: Framing[] = [
  ["hut", "golden", 0, [0, 0.55, 2.8], 2.15], // Red lentils
  ["hut", "golden", LF(1, 5), [0, 1.05, 2.5], 5.4], // The reach
  ["hut", "day", LF(2, 0), [0, 1.3, 2.1], 6], // Isaac and Rebekah
  ["hut", "golden", LF(2, 18), [0, 1.28, 2.1], 5.1], // The prayer
  ["hut", "day", LF(3, 0), [0.015, 0.43, 2.6], 4.55], // The twins
  ["fields", "day", LF(4, 0), [0, 1.22, 1], 6], // The hunter
  ["hut", "day", LF(4, 8), [0.28, 1.05, 2.5], 5.5], // Jacob tends the fire
  ["hut", "day", LF(5, 0), [0, 1.08, 2.4], 7.8], // Esau returns
  ["hut", "day", LF(5, 13), [0, 1.13, 2.5], 5.3], // Esau begs
  ["hut", "day", LF(6, 0), [0.72, 1.4, 2.05], 3.8], // Jacob sets his price
  ["hut", "golden", LF(7, 0), [0, 1.2, 2.4], 7.1], // The inheritance
  ["hut", "day", LF(8, 0), [-0.62, 1.4, 2.45], 3.85], // The shrug
  ["hut", "day", LF(8, 15), [0, 1.13, 2.45], 6.4], // The oath and meal
  ["dusk", "golden", LF(9, 0), [0, 1.16, 2.1], 5.2], // The empty bowl
  ["dusk", "golden", LF(10, 0), [0, 1.45, 2.1], 3.55], // The lesson
  ["hut", "golden", LF(11, 0), [0, 0.78, 2.65], 4.8], // The question
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
export const origin = (s: Set): V3 => s === "fields" ? PAST : s === "dusk" ? [0, 0, 0] : HUT;
export const beamOn = (_id: number, _t: number) => 0;
export const camAt = (id: number, f: number): Cam => {
  const [set, , a, [x, y, z], distance] = frames[id - 1];
  const [ox, oy, oz] = origin(set);
  const u = smooth((f - a) / Math.max(1, SHOTS[id - 1].b - a));
  const look: V3 = [ox + x, oy + y, oz + z];
  return { look, pos: [look[0] + (id % 2 ? -0.26 : 0.32) + 0.18 * u,
    look[1] + 0.27, look[2] + distance * (1 - 0.07 * u)], fov: 43, roll: 0 };
};
export const viewCam = camAt;
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } =>
  ({ cInf: frames[shotAt(f).id - 1][4] <= 4.1 ? 6 : 0 });
