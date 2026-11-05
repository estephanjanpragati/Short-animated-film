// Cast for "Should women cover their head in church?" (Have You Ever Thought? Day 1), built on the cast of "The Quitter Who Wrote a Gospel": first-century robes (dress = robe, jacket = mantle), plus the modern
// coaches of the analogy, and the extra 2D effects this story needs (stones, anger steam, a sealed letter).
import { Outfit, Pen, INK, SKINS, mix } from "./toon";

export const PAUL: Outfit = { jacket: "#b8483a", dress: "#3c5a9a", pants: "#3c5a9a", boots: "#7a4f33", hat: "bald", hair: "#3a2a22", beard: "#3a2a22", skin: "#ecc49a", buttons: "none" };
export const BARNABAS: Outfit = { jacket: "#d8a548", dress: "#5f7f3a", pants: "#5f7f3a", boots: "#7a4f33", hat: "wrap", cap: "#efe3c8", beard: "#7a5a3c", skin: "#f2cfa6", build: "stout", buttons: "none" };
export const MARK: Outfit = { jacket: "#3f8f8a", dress: "#d9b77a", pants: "#d9b77a", boots: "#7a4f33", hat: "hair", hair: "#2e2018", skin: "#f5d3ae", buttons: "none", bag: true };
export const MARK_OLD: Outfit = { ...MARK, bag: false, beard: "#6a4a32", hair: "#4a3426" };
export const SILAS: Outfit = { jacket: "#e0c9a0", dress: "#8a5a9a", pants: "#8a5a9a", boots: "#7a4f33", hat: "hair", hair: "#4a3020", beard: "#4a3020", skin: "#d9a878", buttons: "none" };
const ROBES = ["#c25a4a", "#4f7fb0", "#d9a441", "#7a9a4a", "#9a6aa8", "#e0d2b4", "#b5653f", "#3f8f8a"];
const MANTLES = ["#efe3c8", "#8a5a34", "#e9cf8f", "#5d6f9a", "#c9775a", "#3f6f5a"];
/** townsfolk of the Roman east: men in robes with hair or a head cloth (some bearded), women with a veil */
export const folk = (v: number): Outfit => {
  const o: Outfit = { jacket: MANTLES[(v * 5 + 1) % 6], dress: ROBES[v % 8], pants: ROBES[v % 8], boots: "#7a4f33", skin: SKINS[(v * 3) % 4], buttons: "none" };
  if (v % 3 === 1) return { ...o, hat: "wrap", cap: MANTLES[(v + 2) % 6] === o.jacket ? "#efe3c8" : MANTLES[(v + 2) % 6] };
  return { ...o, hat: v % 3 === 0 ? "hair" : "wrap", hair: ["#2e2018", "#4a3020", "#6a4a32"][v % 3], cap: "#e9e0cc", beard: v % 2 ? ["#2e2018", "#4a3020", "#8a8078"][v % 3] : undefined };
};
// the analogy: two coaches (tracksuits, caps) and a kid in a jersey
export const COACH_A: Outfit = { jacket: "#c8403a", pants: "#2f3448", boots: "#f4f1ea", hat: "cap", cap: "#2f3448", moustache: "#4a3020", build: "stout", buttons: "none", skin: SKINS[1] };
export const COACH_B: Outfit = { jacket: "#3f6fb5", pants: "#2f3448", boots: "#f4f1ea", hat: "cap", cap: "#f3d35a", skin: SKINS[3], buttons: "none" };
export const PLAYER: Outfit = { jacket: "#f3d35a", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#5a3b2a", build: "kid", buttons: "none", skin: SKINS[0] };
export const TEAMMATE = (v: number): Outfit => ({ ...PLAYER, hair: ["#2e2018", "#c98a3a", "#4a3020"][v % 3], skin: SKINS[(v + 1) % 4] });

/** a thrown stone (200 x 160) */
export const fxStone = (p: Pen, k: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, r = 1 + 0.18 * Math.sin(i * 2.3 + k * 1.7); pts.push([100 + 78 * r * Math.cos(a), 80 + 56 * r * Math.sin(a)]); }
  p.poly(pts, ["#a59a8c", "#8f8478", "#b4aa9c"][k % 3], 10);
  p.arc(84, 66, 34, 20, 200, 290, 8, "#d7cfc2");
};
/** anger steam puff (300 x 300); t 0..1 grows and fades */
export const fxSteam = (p: Pen, t: number) => {
  const r = 50 + 70 * t;
  for (const [dx, dy, k] of [[0, 0, 1], [-r * 0.6, 20, 0.7], [r * 0.6, 24, 0.75], [0, -r * 0.4, 0.8]] as const)
    p.ell(150 + dx, 160 + dy, r * k, r * k * 0.85, mix("#ffffff", "#d9dbe4", 0.3 + 0.5 * t), 9);
};
/** the anger "vein" mark (200 x 200) */
export const fxVein = (p: Pen) => {
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    p.line([[100 + 22 * c - 18 * s, 100 + 22 * s + 18 * c], [100 + 62 * c, 100 + 62 * s], [100 + 22 * c + 18 * s, 100 + 22 * s - 18 * c]], "#e2453c", 14, true);
  }
};
/** a rolled letter with a red seal (240 x 160) */
export const fxLetter = (p: Pen) => {
  p.poly([[30, 40], [210, 40], [210, 120], [30, 120]], "#f4ead2", 8);
  p.ell(30, 80, 16, 40, "#e6d8b8", 8); p.ell(210, 80, 16, 40, "#e6d8b8", 8);
  for (const y of [62, 80, 98]) p.stroke([[60, y], [180, y]], 4, "#8a7a64");
  p.ell(120, 120, 18, 18, "#c8323a", 6);
};
/** small sparkle (200 x 200) */
export const fxSpark = (p: Pen, col = "#fff3b0") => {
  p.poly([[100, 10], [118, 82], [190, 100], [118, 118], [100, 190], [82, 118], [10, 100], [82, 82]], col, 9);
};

// ---- head-covering reel: an Indian church today, and Roman Corinth ----
/** Priya: covers her head with her dupatta */
export const PRIYA: Outfit = { jacket: "#f3c64a", dress: "#d9416b", pants: "#d9416b", boots: "#7a4f33", hat: "veil", cap: "#f3c64a", skin: SKINS[2], buttons: "none" };
/** Anjali: long hair, no covering */
export const ANJALI: Outfit = { jacket: "#3f8f8a", dress: "#5d6fc2", pants: "#5d6fc2", boots: "#7a4f33", hat: "longhair", hair: "#2a1c16", skin: SKINS[1], buttons: "none" };
/** the aunty: saree pallu over her head, stout */
export const AUNTY: Outfit = { jacket: "#efe3c8", dress: "#8a2f3c", pants: "#8a2f3c", boots: "#7a4f33", hat: "veil", cap: "#efe3c8", skin: SKINS[3], build: "stout", buttons: "none" };
/** a Roman married woman in Corinth: palla over her hair */
export const MATRONA: Outfit = { jacket: "#e9cf8f", dress: "#b5653f", pants: "#b5653f", boots: "#7a4f33", hat: "veil", cap: "#efe3c8", skin: SKINS[0], buttons: "none" };
/** a Corinthian woman with her hair down */
export const BAREHAIR: Outfit = { jacket: "#c9775a", dress: "#9a6aa8", pants: "#9a6aa8", boots: "#7a4f33", hat: "longhair", hair: "#6a4a32", skin: SKINS[1], buttons: "none" };
const SAREE = ["#d9416b", "#3f8f8a", "#d9a441", "#7a9a4a", "#9a6aa8", "#c25a4a", "#4f7fb0"];
const DUPATTA = ["#f3c64a", "#efe3c8", "#e9a0b4", "#9fd4c8", "#f4ead2"];
/** the congregation: women with and without a covering, men with hair */
export const flock = (v: number, covered = v % 2 === 0): Outfit => {
  const base: Outfit = { jacket: DUPATTA[(v * 3) % 5], dress: SAREE[v % 7], pants: SAREE[v % 7], boots: "#7a4f33", skin: SKINS[(v * 3 + 1) % 4], buttons: "none" };
  if (v % 3 === 2) return { ...base, jacket: "#efe3c8", dress: ["#4a5a7a", "#6a5a4a", "#3f6f5a"][v % 3], pants: "#3b3f52", hat: "hair", hair: ["#2e2018", "#4a3020"][v % 2] };
  return covered ? { ...base, hat: "veil", cap: DUPATTA[(v + 1) % 5] } : { ...base, hat: "longhair", hair: ["#2a1c16", "#3a2a22", "#4a3020"][v % 3] };
};
/** a heart (220 x 200) */
export const fxHeart = (p: Pen, col = "#ff5a7a") => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); pts.push([110 + x * 5.6, 96 - y * 5.6]); }
  p.poly(pts, col, 9);
  p.arc(80, 70, 22, 14, 200, 290, 7, "#ffd0da");
};
export { INK };
