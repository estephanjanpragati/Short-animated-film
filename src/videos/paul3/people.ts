// Our cast for "The Quitter Who Wrote a Gospel": first-century robes (dress = robe, jacket = mantle), plus the modern
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
export { INK };

// ---------------- Noah reel ----------------
export const NOAH: Outfit = { jacket: "#8a5a34", dress: "#d8c49a", pants: "#d8c49a", boots: "#6a4630", hat: "hair", hair: "#eeeae2", beard: "#eeeae2", skin: "#f0c9a0", buttons: "none", build: "stout" };
export const NOAH_WIFE: Outfit = { jacket: "#c25a7a", dress: "#5a8fc2", pants: "#5a8fc2", boots: "#6a4630", hat: "wrap", cap: "#e9cf8f", skin: "#f2cfa6", buttons: "none" };
export const SON = (v: number): Outfit => ({ jacket: ["#3f6f5a", "#b5653f", "#5d6f9a"][v % 3], dress: ["#d9a441", "#7a9a4a", "#9a6aa8"][v % 3], pants: "#6a4630", boots: "#6a4630", hat: "hair", hair: ["#2e2018", "#4a3020", "#3a2a22"][v % 3], beard: ["#2e2018", "#4a3020", "#3a2a22"][v % 3], skin: ["#f5d3ae", "#ecc49a", "#d9a878"][v % 3], buttons: "none" });
export const JESUS: Outfit = { jacket: "#b8322e", dress: "#f2efe6", pants: "#f2efe6", boots: "#7a4f33", hat: "hair", hair: "#5a3a24", beard: "#5a3a24", skin: "#e8bf95", buttons: "none" };
export const FRIEND: Outfit = { jacket: "#f3c234", pants: "#2f3448", boots: "#2a2a30", hat: "cap", cap: "#f3c234", skin: "#d9a878", buttons: "none" };
export const SITTER: Outfit = { jacket: "#5a8fc2", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#2e2018", skin: "#f5d3ae", buttons: "none" };

/** side-view animal on the 600 x 1000 actor canvas (feet at y 975), facing screen right; phase = walk cycle 0..1 */
export type Beast = "elephant" | "giraffe" | "lion" | "zebra" | "sheep" | "camel" | "ram" | "ox";
export const drawBeast = (p: Pen, kind: Beast, phase: number, blink = false) => {
  const sw = Math.sin(phase * Math.PI * 2), INKc = INK;
  const leg = (x: number, y0: number, len: number, w: number, col: string, k: number) => {
    const a = 0.32 * sw * k;
    p.stroke([[x, y0], [x + Math.sin(a) * len * 0.5, y0 + len * 0.5], [x + Math.sin(a) * len, y0 + len]], w + 8, INKc);
    p.stroke([[x, y0], [x + Math.sin(a) * len * 0.5, y0 + len * 0.5], [x + Math.sin(a) * len, y0 + len]], w, col);
  };
  const eye = (x: number, y: number, r = 7) => blink ? p.stroke([[x - r, y], [x + r, y]], 4) : p.dot(x, y, r);
  if (kind === "elephant") {
    const c = "#9aa0ae", d = "#7d8392";
    for (const [x, k] of [[170, -1], [400, 1]] as const) leg(x, 690, 280, 52, d, k);
    p.ell(290, 600, 210, 150, c, 9);
    for (const [x, k] of [[230, 1], [460, -1]] as const) leg(x, 690, 285, 56, c, k);
    p.ell(470, 470, 110, 105, c, 9);
    p.ell(430, 470, 70, 95, "#b5bac6", 7); // ear
    p.line([[545, 490], [585, 600], [560, 700], [600, 730]], c, 40);
    eye(505, 445, 8);
  } else if (kind === "giraffe") {
    const c = "#f0c45a";
    for (const [x, k] of [[210, -1], [380, 1]] as const) leg(x, 640, 330, 24, "#d9a441", k);
    p.ell(290, 590, 150, 85, c, 9);
    for (const [x, k] of [[240, 1], [410, -1]] as const) leg(x, 640, 335, 26, c, k);
    p.poly([[380, 560], [430, 560], [500, 150], [455, 140]], c, 9);
    p.ell(500, 135, 62, 38, c, 9, 0, 360, 15);
    for (const [x, y] of [[250, 560], [320, 600], [300, 545], [380, 590], [450, 400], [470, 270]]) p.ell(x, y, 20, 15, "#b5653f", 0);
    p.stroke([[480, 100], [470, 70]], 8); p.stroke([[505, 98], [505, 66]], 8);
    eye(512, 125, 7);
  } else if (kind === "lion") {
    const c = "#e8a94a";
    for (const [x, k] of [[200, -1], [380, 1]] as const) leg(x, 760, 210, 34, "#d39540", k);
    p.ell(290, 720, 170, 95, c, 9);
    for (const [x, k] of [[230, 1], [410, -1]] as const) leg(x, 760, 215, 36, c, k);
    p.line([[130, 700], [70, 640], [60, 600]], c, 14); p.ell(58, 590, 20, 26, "#8a4a24", 6);
    p.ell(450, 600, 120, 120, "#a8582a", 9); // mane
    p.ell(470, 615, 75, 70, c, 8);
    eye(495, 600, 7); p.ell(535, 630, 12, 9, INKc, 0);
  } else if (kind === "zebra") {
    const c = "#f6f4ee";
    for (const [x, k] of [[210, -1], [380, 1]] as const) leg(x, 700, 270, 26, "#dcd8ce", k);
    p.ell(290, 650, 160, 90, c, 9);
    p.clip([[130, 560], [450, 560], [450, 740], [130, 740]], () => { for (let i = 0; i < 7; i++) p.stroke([[170 + i * 42, 570], [150 + i * 42, 740]], 14, INKc); });
    for (const [x, k] of [[240, 1], [410, -1]] as const) leg(x, 700, 275, 28, c, k);
    p.poly([[400, 620], [450, 600], [540, 470], [500, 450]], c, 9);
    p.ell(545, 470, 55, 34, c, 9, 0, 360, 30);
    p.stroke([[470, 470], [430, 590]], 16, INKc);
    eye(545, 455, 6);
  } else if (kind === "camel") {
    const c = "#d9b07a";
    for (const [x, k] of [[200, -1], [370, 1]] as const) leg(x, 640, 330, 26, "#c49a64", k);
    p.ell(285, 590, 160, 80, c, 9); p.ell(240, 520, 60, 55, c, 8); p.ell(340, 525, 55, 50, c, 8);
    for (const [x, k] of [[230, 1], [400, -1]] as const) leg(x, 640, 335, 28, c, k);
    p.line([[420, 570], [470, 420], [520, 400]], c, 44);
    p.ell(540, 405, 46, 30, c, 8); eye(545, 392, 6);
  } else if (kind === "ox") { // the sacrificial bull of Lystra (Acts 14:13): cream hide, long horns, a marigold garland
    const c = "#efe2c8", d = "#d6c4a2";
    for (const [x, k] of [[190, -1], [370, 1]] as const) leg(x, 700, 250, 34, d, k);
    p.ell(280, 640, 185, 105, c, 9);
    p.ell(220, 600, 70, 40, "#c9a882", 0); p.ell(330, 690, 55, 30, "#c9a882", 0); // patches
    for (const [x, k] of [[225, 1], [400, -1]] as const) leg(x, 700, 255, 36, c, k);
    p.line([[100, 600], [70, 660], [74, 740]], c, 14); p.ell(74, 752, 14, 22, "#6a4630", 6); // tail
    p.poly([[400, 560], [470, 520], [520, 600], [440, 660]], c, 9); // neck
    p.ell(520, 600, 70, 58, c, 9); p.ell(565, 630, 34, 28, "#e8b8a0", 7); // head + muzzle
    p.dot(556, 630, 5); p.dot(574, 636, 5);
    p.arc(500, 548, 50, 34, 190, 300, 26, INKc); p.arc(500, 548, 50, 34, 190, 300, 16, "#f4ead2"); // horn
    p.ell(486, 575, 18, 26, "#d6c4a2", 6); // ear
    eye(530, 588, 7);
    for (let i = 0; i < 11; i++) { // marigold garland round the neck
      const a = Math.PI * (0.15 + 0.07 * i), x = 455 + 70 * Math.cos(a) * 0.6, y = 590 + 95 * Math.sin(a) * 0.8;
      p.ell(x, y, 17, 17, i % 3 ? "#f39a1e" : "#ffd23f", 5);
    }
  } else { // sheep
    const c = "#f7f3ea";
    for (const [x, k] of [[220, -1], [360, 1]] as const) leg(x, 820, 150, 22, "#3a3036", k);
    for (let i = 0; i < 9; i++) p.ell(200 + (i % 3) * 70, 720 + Math.floor(i / 3) * 40 - (i % 2) * 15, 70, 60, c, 0);
    p.poly([[150, 700], [430, 700], [430, 840], [150, 840]].map(([x, y]) => [x, y] as [number, number]), null, 0);
    p.ell(290, 760, 160, 95, null, 9);
    for (const [x, k] of [[250, 1], [390, -1]] as const) leg(x, 820, 155, 22, "#3a3036", k);
    p.ell(450, 720, 55, 45, "#3a3036", 8); eye(470, 712, 6);
  }
  if (kind === "ram") { // the ram: sheep body plus curled horns
    p.arc(440, 700, 34, 30, 120, 420, 26, INKc); p.arc(440, 700, 34, 30, 120, 420, 16, "#c9a46a");
  }
};
/** a hand-held lantern glow (300 x 300, unlit soft card) */
export const fxLantern = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(150, 150, 0, 150, 150, 150);
  gr.addColorStop(0, "rgba(255,230,160,0.95)"); gr.addColorStop(0.18, "rgba(255,200,110,0.6)"); gr.addColorStop(1, "rgba(255,170,80,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 300, 300);
  p.poly([[125, 120], [175, 120], [185, 190], [115, 190]], "#ffd78a", 6);
  p.poly([[118, 105], [182, 105], [175, 120], [125, 120]], "#7a5a2a", 6);
  p.arc(150, 100, 22, 22, 180, 360, 6);
};
/** rain streak (40 x 300, soft) */
export const fxRain = (p: Pen) => { p.g.strokeStyle = "rgba(220,230,255,0.75)"; p.g.lineWidth = 6; p.g.lineCap = "round"; p.g.beginPath(); p.g.moveTo(26, 10); p.g.lineTo(14, 290); p.g.stroke(); };
/** knock lines (300 x 300); t 0..1 */
export const fxKnock = (p: Pen, t: number) => {
  for (let i = 0; i < 3; i++) { const a = -0.7 + i * 0.7, r0 = 50 + 60 * t, r1 = r0 + 50; p.stroke([[150 + r0 * Math.cos(a), 150 + r0 * Math.sin(a)], [150 + r1 * Math.cos(a), 150 + r1 * Math.sin(a)]], 14); }
};
/** golden glow (300 x 300, soft) for the shut door / light under the door */
export const fxGlow = (p: Pen, col = "255,225,150") => {
  const g = p.g, gr = g.createRadialGradient(150, 150, 0, 150, 150, 150);
  gr.addColorStop(0, `rgba(${col},0.9)`); gr.addColorStop(0.4, `rgba(${col},0.45)`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 300, 300);
};
/** food on the feast table (400 x 200) */
export const fxFeast = (p: Pen) => {
  p.ell(80, 140, 60, 26, "#f4ead2", 6); p.ell(80, 125, 40, 22, "#c8704a", 5);
  p.ell(200, 140, 60, 26, "#f4ead2", 6); for (let i = 0; i < 5; i++) p.ell(175 + i * 12, 120 - (i % 2) * 8, 12, 12, ["#7a3a6a", "#9a4a7a"][i % 2], 4);
  p.poly([[300, 70], [340, 70], [335, 150], [305, 150]], "#c8704a", 6); p.ell(320, 70, 20, 8, "#8a4a2a", 5);
};

// ---------------- Cain and Abel reel ----------------
export const CAIN: Outfit = { jacket: "#9a4a2a", dress: "#c9a46a", pants: "#c9a46a", boots: "#6a4630", hat: "hair", hair: "#2a1a14", beard: "#2a1a14", skin: "#d9a878", buttons: "none", build: "stout" };
export const ABEL: Outfit = { jacket: "#4f7fb0", dress: "#ece2c8", pants: "#ece2c8", boots: "#6a4630", hat: "hair", hair: "#6a4a32", skin: "#f2cfa6", buttons: "none" };
export const PRIEST: Outfit = { jacket: "#3f5fa8", dress: "#f4f1ea", pants: "#f4f1ea", boots: "#7a4f33", hat: "wrap", cap: "#f4f1ea", beard: "#4a3020", skin: "#e8bf95", buttons: "none" };
export const KID_A: Outfit = { jacket: "#e2453c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#c98a3a", build: "kid", buttons: "none", skin: "#f5d3ae" };
export const KID_B: Outfit = { jacket: "#5d7a3a", pants: "#3b3f52", boots: "#f4f1ea", hat: "cap", cap: "#2f3448", build: "kid", buttons: "none", skin: "#d9a878" };
export const MOM: Outfit = { jacket: "#9a6aa8", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#3a2a22", dress: "#9a6aa8", skin: "#ecc49a", buttons: "none" };

/** a little basket of crops (300 x 220) */
export const fxCrops = (p: Pen) => {
  p.poly([[40, 110], [260, 110], [230, 205], [70, 205]], "#b5803f", 9);
  for (let i = 0; i < 5; i++) p.stroke([[60 + i * 45, 120], [80 + i * 40, 200]], 5, "#8a5a2a");
  p.poly([[70, 110], [95, 40], [120, 110]], "#e8892c", 7); p.stroke([[95, 40], [85, 15]], 8, "#4f9a3c"); p.stroke([[95, 40], [108, 12]], 8, "#4f9a3c");
  p.ell(160, 95, 34, 30, "#7a3a6a", 7); p.ell(215, 98, 30, 26, "#d9c03a", 7);
};
/** the firstborn lamb held in the arms (260 x 220) */
export const fxLamb = (p: Pen) => {
  for (let i = 0; i < 7; i++) p.ell(80 + (i % 4) * 34, 110 + Math.floor(i / 4) * 34 - (i % 2) * 10, 38, 32, "#fbf8f0", 0);
  p.ell(125, 120, 95, 58, null, 8);
  p.ell(215, 95, 34, 28, "#f2e8de", 7); p.dot(225, 88, 6); p.ell(200, 78, 16, 9, "#f2e8de", 5, 0, 360, -30);
};
/** altar fire (300 x 400); t animates */
export const fxFire = (p: Pen, t: number, big = 1) => {
  const g = p.g, k = 0.85 + 0.15 * Math.sin(t * 17) * big;
  const gr = g.createRadialGradient(150, 330, 10, 150, 250, 200); gr.addColorStop(0, "rgba(255,240,180,0.9)"); gr.addColorStop(1, "rgba(255,150,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 300, 400);
  const flame = (cx: number, h: number, col: string, w: number) => p.poly([[cx - w, 380], [cx - w * 0.6, 380 - h * 0.5], [cx + Math.sin(t * 9 + cx) * 12, 380 - h], [cx + w * 0.6, 380 - h * 0.45], [cx + w, 380]], col, 8);
  flame(150, 300 * k * big, "#f08a2c", 90); flame(120, 200 * k * big, "#f3c234", 50); flame(185, 170 * k * big, "#f3c234", 45); flame(150, 110 * k * big, "#fff3b0", 35);
};
/** smoke puff (300 x 300, soft), u 0..1 */
export const fxSmoke = (p: Pen, u: number, dark = false) => {
  const c = dark ? [110, 105, 110] : [235, 232, 228], a = 0.75 * (1 - u);
  for (const [dx, dy, r] of [[0, 0, 70], [-50, 20, 55], [50, 25, 55], [0, -40, 50]] as const) {
    const g = p.g, gr = g.createRadialGradient(150 + dx, 160 + dy, 0, 150 + dx, 160 + dy, r * (1 + u));
    gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, 300, 300);
  }
};
/** heart (200 x 200), gold or grey */
export const fxHeart = (p: Pen, col: string) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, x = 16 * Math.sin(a) ** 3, y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push([100 + x * 5.2, 100 + y * 5.2]); }
  p.poly(pts, col, 10);
  p.arc(70, 72, 18, 14, 200, 290, 7, "#ffffff");
};
/** question mark (200 x 260) */
export const fxQuestion = (p: Pen) => {
  p.line([[60, 80], [80, 40], [130, 30], [160, 70], [140, 110], [105, 130], [100, 175]], "#f3c234", 26);
  p.ell(100, 225, 18, 18, "#f3c234", 9);
};
/** the big colourful birthday card (300 x 240) and the receipt (160 x 260) */
export const fxCard = (p: Pen) => {
  p.poly([[20, 30], [280, 30], [280, 220], [20, 220]], "#fdf3d8", 9);
  p.ell(150, 110, 70, 55, "#e2453c", 7); p.poly([[150, 165], [120, 125], [180, 125]], "#e2453c", 0);
  for (const [x, y, c] of [[60, 60, "#3f6fb5"], [240, 60, "#f3c234"], [60, 190, "#4f9a3c"], [240, 190, "#9a6aa8"], [150, 200, "#f08a2c"]] as const) p.poly([[x, y - 16], [x + 5, y - 5], [x + 16, y], [x + 5, y + 5], [x, y + 16], [x - 5, y + 5], [x - 16, y], [x - 5, y - 5]], c, 4);
};
export const fxReceipt = (p: Pen) => {
  const pts: [number, number][] = [[20, 20], [140, 20]];
  for (let i = 0; i <= 8; i++) pts.push([140 - i * 15, 240 + (i % 2) * 14]);
  pts.push([20, 20]);
  p.poly(pts, "#f8f6f0", 7);
  for (let i = 0; i < 7; i++) p.stroke([[38, 50 + i * 22], [38 + 40 + (i * 37) % 60, 50 + i * 22]], 6, "#9a9a9a");
  p.line([[40, 215], [70, 200], [90, 215], [115, 198]], "#2a2a60", 5, false);
};
/** sin crouching at the door: a dark crouching shape with two glowing eyes (500 x 400 actor-like card) */
export const fxSin = (p: Pen, t: number) => {
  // drawn on the 600 x 1000 actor canvas, crouching on the ground line (y 975)
  p.g.save(); p.g.translate(20, 600); p.g.scale(1.15, 1.0);
  const b = 1 + 0.03 * Math.sin(t * 3);
  p.poly([[60, 380], [40, 300], [90, 210], [180, 150 * b + 20], [300, 140 * b + 20], [400, 190], [450, 260], [470, 380]], "#1a1424", 10);
  p.poly([[300, 160], [330, 90], [350, 165]], "#1a1424", 8); p.poly([[380, 175], [425, 110], [420, 195]], "#1a1424", 8);
  for (const x of [330, 395]) { p.ell(x, 230, 18, 12, "#ffcf4a", 0); p.dot(x + 4, 230, 6, "#1a1424"); }
  p.stroke([[60, 380], [20, 340], [10, 300]], 18, "#1a1424");
  p.g.restore();
};
/** a sound ring rising from the ground (400 x 400), u 0..1 */
export const fxCry = (p: Pen, u: number) => { for (let k = 0; k < 2; k++) { const r = 40 + 140 * ((u + k * 0.5) % 1); p.g.globalAlpha = 1 - ((u + k * 0.5) % 1); p.ell(200, 200, r, r * 0.4, null, 10); } p.g.globalAlpha = 1; };


// ---------------- Two Mountains reel ----------------
export const ABRAHAM: Outfit = { jacket: "#8a5a9a", dress: "#e6d8b8", pants: "#e6d8b8", boots: "#6a4630", hat: "wrap", cap: "#efe3c8", beard: "#f2efe8", hair: "#f2efe8", skin: "#e8bf95", buttons: "none" };
export const ISAAC: Outfit = { jacket: "#4f9a8a", dress: "#d9b77a", pants: "#d9b77a", boots: "#6a4630", hat: "hair", hair: "#3a2a22", skin: "#f2cfa6", buttons: "none" };
export const MOSES: Outfit = { jacket: "#b8483a", dress: "#efe3c8", pants: "#efe3c8", boots: "#6a4630", hat: "wrap", cap: "#d8c49a", beard: "#cfcac0", hair: "#cfcac0", skin: "#e0b48a", buttons: "none" };
export const AARON: Outfit = { jacket: "#3f5fa8", dress: "#e9cf8f", pants: "#e9cf8f", boots: "#6a4630", hat: "wrap", cap: "#f4f1ea", beard: "#6a4a32", skin: "#e8bf95", buttons: "none", build: "stout" };
/** a bundle of firewood tied with rope (300 x 200) */
export const fxWood = (p: Pen) => {
  for (let i = 0; i < 6; i++) { const y = 60 + i * 18; p.line([[20, y + (i % 2) * 6], [280, y - 6 + (i % 3) * 5]], ["#8a5a34", "#a8743f", "#7a4f2e"][i % 3], 16); }
  for (const x of [90, 210]) p.stroke([[x, 45], [x - 6, 170]], 8, "#d8c49a");
};
/** the golden calf on a little plinth (400 x 340), side view facing right */
export const fxCalf = (p: Pen, shine = 0) => {
  const g = "#f3c234", d = "#d39a24";
  p.poly([[70, 300], [330, 300], [330, 335], [70, 335]], "#b8a48c", 8);
  for (const x of [130, 250]) p.line([[x, 210], [x, 298]], d, 26);
  p.ell(195, 185, 115, 62, g, 9);
  for (const x of [160, 285]) p.line([[x, 210], [x, 298]], g, 28);
  p.line([[82, 170], [55, 205], [62, 240]], g, 14);
  p.ell(310, 130, 52, 44, g, 9); p.ell(345, 145, 26, 20, "#f6d670", 6);
  p.arc(290, 88, 22, 20, 180, 330, 10, INK); p.arc(330, 86, 22, 20, 210, 360, 10, INK);
  p.dot(318, 122, 7);
  p.arc(170, 160, 60, 26, 200, 300, 10, "#fff3b0");
  if (shine > 0) for (const [x, y] of [[120, 120], [300, 60], [240, 240]]) { p.g.globalAlpha = shine; p.poly([[x, y - 26], [x + 7, y - 7], [x + 26, y], [x + 7, y + 7], [x, y + 26], [x - 7, y + 7], [x - 26, y], [x - 7, y - 7]], "#fffbe0", 4); p.g.globalAlpha = 1; }
};
/** the two stone tablets (300 x 260); broken = 0 whole .. 1 smashed into pieces */
export const fxTablets = (p: Pen, broken = 0) => {
  const tab = (x: number, rot: number) => {
    const pts: [number, number][] = [[x, 230], [x, 70], [x + 15, 40], [x + 55, 28], [x + 95, 40], [x + 110, 70], [x + 110, 230]];
    const c = Math.cos(rot), s = Math.sin(rot), cx = x + 55, cy = 130;
    p.poly(pts.map(([a, b]) => [cx + (a - cx) * c - (b - cy) * s, cy + (a - cx) * s + (b - cy) * c] as [number, number]), "#c7c0b4", 9);
    for (let i = 0; i < 5; i++) { const y = 80 + i * 28; p.stroke([[cx - 35 * c - (y - cy) * s, cy - 35 * s + (y - cy) * c], [cx + 35 * c - (y - cy) * s, cy + 35 * s + (y - cy) * c]], 5, "#8a8378"); }
  };
  if (broken < 0.5) { tab(30, -0.06); tab(160, 0.06); return; }
  const k = broken;
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9, r = 40 + 70 * k, cx = 150 + Math.cos(a) * r, cy = 180 + Math.sin(a) * r * 0.4;
    p.poly([[cx - 22, cy - 10], [cx + 4, cy - 24], [cx + 24, cy - 2], [cx + 6, cy + 20], [cx - 18, cy + 14]], i % 2 ? "#c7c0b4" : "#b8b0a2", 6);
  }
};

export const ELYMAS: Outfit = { ...PAUL, hat: "wrap", cap: "#241c28", jacket: "#493255", dress: "#352341", pants: "#352341" };
export const SERGIUS: Outfit = { ...MARK, bag: false, jacket: "#efe8d6", dress: "#f8f0de", sash: "#a43232", hair: "#422c22" };

/** a marigold garland held up (300 x 300) */
export const fxGarland = (p: Pen) => {
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, x = 150 + 105 * Math.cos(a), y = 160 + 120 * Math.sin(a);
    p.ell(x, y, 22, 22, i % 3 ? "#f39a1e" : "#ffd23f", 6); }
};
/** cloth tear strip (240 x 120): a jagged rip mark */
export const fxRip = (p: Pen) => {
  p.line([[10, 60], [50, 30], [80, 80], [120, 25], [160, 85], [200, 35], [230, 60]], "#ffffff", 14);
};
// ---------------- Paul reel 3 (Lystra) ----------------
export const LAME: Outfit = { jacket: "#9a8a6a", dress: "#c9b48a", pants: "#c9b48a", boots: "#7a4f33", hat: "hair", hair: "#3a2a22", beard: "#3a2a22", skin: "#d9a878", buttons: "none" };
export const ZPRIEST: Outfit = { jacket: "#e0b23a", dress: "#f4f1ea", pants: "#f4f1ea", boots: "#7a4f33", hat: "wrap", cap: "#f4f1ea", beard: "#d8d2c8", skin: "#e8bf95", buttons: "none", build: "stout" };
export const OPP = (v: number): Outfit => ({ jacket: ["#3a2c40", "#4a2a2a", "#2f3448"][v % 3], dress: ["#5a3a3a", "#3c3a52", "#4a3a2a"][v % 3], pants: "#3a3040", boots: "#4a3426",
  hat: "wrap", cap: ["#241c28", "#5a4a3a", "#3a2c40"][v % 3], beard: ["#2e2018", "#4a3020", "#1e1a1a"][v % 3], skin: ["#d9a878", "#ecc49a", "#c99a6a"][v % 3], buttons: "none" });
/** a name tag floating over a head (480 x 160): yellow pill, dark ink, Devanagari text */
export const fxLabel = (p: Pen, text: string) => {
  const g = p.g;
  p.poly([[40, 20], [440, 20], [460, 80], [440, 140], [40, 140], [20, 80]], "#ffd23f", 12);
  g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = '900 78px "Noto Sans Devanagari", "Nirmala UI", "Mangal", sans-serif';
  g.fillText(text, 240, 86);
};
