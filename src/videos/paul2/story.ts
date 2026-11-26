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
export const sailOpen = (t: number) => smooth((t - L(3, 9)) / 1.2);
export const boatPos = (t: number): V3 => [4.8 - sailOpen(t) * 0.8, SEA_Y, -5 - sailOpen(t)];

// ---------------- shots ----------------
export type Light = "day" | "golden" | "storm" | "night";
export type Set = "court" | "harbour" | "village" | "lystra" | "perga" | "field" | "prison" | "study" | "coast";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; sunAz?: number; sunEl?: number };
// Set, light, cut, and camera target relative to the set. Distance controls shot size.
type Framing = [Set, Light, number, V3, number];
const frames: Framing[] = [
  ["court", "golden", 0, [0, 1, -2], 5], // Prayer meeting
  ["court", "day", LF(2, 0), [0, 1.2, -2], 8.3], // The congregation
  ["court", "golden", LF(2, 14), [0, 1.15, -2], 5.1], // Set apart
  ["harbour", "golden", LF(3, 6), [3.35, 1.45, 1.8], 8.65], // Mark at the quay
  ["village", "day", LF(4, 0), [0.28, 1.22, -2], 7.4], // The governor listens
  ["village", "day", LF(4, 11), [0.15, 1.25, -1.6], 6.5], // Elymas intervenes
  ["village", "day", LF(5, 0), [-0.05, 1.25, -1.6], 5.5], // Paul confronts him
  ["village", "day", LF(5, 20), [0.62, 1.45, -1.6], 3.8], // Temporary blindness
  ["village", "golden", LF(6, 0), [0.45, 1.02, -2], 3.8], // The governor believes
  ["perga", "day", LF(7, 0), [0, 1.25, 0], 7.5], // The mountain road
  ["village", "day", LF(7, 7), [0.12, 1.85, -6], 4.05], // The synagogue
  ["village", "day", LF(7, 15), [0, 1.45, -4], 11], // The next Sabbath
  ["village", "day", LF(8, 0), [0, 1.3, -2.5], 6.5], // Opposition
  ["village", "golden", LF(8, 13), [0, 1.3, -2.5], 7.9], // The Gentiles rejoice
  ["perga", "golden", LF(9, 0), [0, 1.46, 0], 3.6], // The lesson
  ["perga", "golden", LF(10, 0), [0, 1.35, 0], 7.5], // Toward Lystra
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
  p: [0, 0, -2.4] as V3, o: id === 1 || id === 3 ? 0.04 + 0.012 * Math.sin(t * 2) : 0,
});
export const camAt = (id: number, f: number): Cam => {
  const [set, , a, [x, y, z], distance] = frames[id - 1];
  const [ox, oy, oz] = origin(set);
  const u = smooth((f - a) / Math.max(1, SHOTS[id - 1].b - a));
  const look: V3 = [ox + x, oy + y, oz + z];
  if (set === "perga") {
    const d = distance * (1 - 0.07 * u);
    return { look, pos: [look[0] + 0.8*d, look[1] + 0.34, look[2] + 0.6*d], fov: 43, roll: 0 };
  }
  return { look, pos: [look[0] + (id % 2 ? -0.26 : 0.32) + 0.18 * u,
    look[1] + 0.27, look[2] + distance * (1 - 0.07 * u)], fov: 43, roll: 0 };
};
export const viewCam = camAt;
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } =>
  ({ cInf: frames[shotAt(f).id - 1][4] <= 4.1 ? 6 : 0 });
