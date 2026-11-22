// Cast of "पौलुस की यात्राएँ 1: शाऊल से पौलुस" (Acts 9) as lit flat cards in the Paul world (machinery from the bridge
// and Mark shorts: canvas pool, lit billboards, contact blobs, blinks). Expressions change on Hindi words via LF(line, word).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxBurst, fxStars, fxContact, fxShadow, fxPuff } from "./toon";
import { PAUL, folk, fxSteam, fxLetter, fxSpark, fxGlow } from "./people";
import {
  FPS, SHOTS, V3, T, W, LF, L, viewCam, SPOT, COURT, VILL, PERGA, STUDY, clamp01, smooth, roadX, XS, lightOn, fallU, blindX, outX,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
export let LNAME: "day" | "golden" | "storm" | "night" = "day";
export const setLight = (l: "day" | "golden", sun: THREE.Vector3) => { LNAME = l; SUN.copy(sun); };
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden" | "storm" | "night", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], storm: [0.3, 0.32, 0.42], night: [0.2, 0.22, 0.4] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- crowd by shot ----------------

// ---------------- staging helpers ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const add = (o: V3, p: V3): V3 => [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
/** expression by cue: the last cue whose word has started (reactions land 2 f early) */
/** swap times collected from the cue() calls of the character about to be placed (who() picks them up) */
let pendingSwaps: number[] = [];
const on = (t: number, w: string) => Math.round(t * FPS) >= W(w);
const cue = (t: number, first: Expr, cues: [string, Expr][]): Expr => {
  let e = first;
  for (const [w, x] of cues) { if (on(t, w)) e = x; pendingSwaps.push(W(w) / FPS + LEAD); }
  return e;
};
const swapsOf = (cues: [string, Expr][]) => cues.map(([w]) => T(w));
type Opts = { expr: Expr; arms?: FrontOpts["arms"]; wave?: number; mode?: "stand" | "sit" | "march"; phase?: number; stride?: number;
  look?: number; mirror?: boolean; roll?: number; swaps?: number[]; scale?: number; front?: number; headTilt?: number; noBlob?: boolean; tilt?: number; shut?: boolean };
const OK: Map<Outfit, string> = new Map();
const okey = (o: Outfit) => { let k = OK.get(o); if (!k) { k = "o" + OK.size; OK.set(o, k); } return k; };
/** one character at p (world), looking along (dx, dz) */
let VIEW: CamInfo | null = null; // the key camera of this frame (story.ts viewCam), set by stage()
const who = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, p: V3, dir: [number, number], op: Opts) => {
  const [x, y, z] = p, l = Math.hypot(dir[0], dir[1]) || 1, dx = dir[0] / l, dz = dir[1] / l;
  const vc = VIEW ?? cam;
  const tx = vc.pos.x - x, tz = vc.pos.z - z, tl = Math.hypot(tx, tz) || 1, c = (tx * dx + tz * dz) / tl;
  const sideSign = dx * vc.right.x + dz * vc.right.z;
  if (!op.swaps) op.swaps = pendingSwaps;
  pendingSwaps = [];
  const walking = op.mode === "march";
  const side = walking ? true : c < (op.front ?? 0.5) && op.mode !== "sit"; // walkers are always drawn in profile (no view flips while tracking)
  const blink = op.shut ? 1 : lidAt(t, i, op.swaps);
  const fs = Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20;
  const facing = (c > 0.93 ? 0 : sideSign > 0 ? 1 : -1) as -1 | 0 | 1;
  const fo: FrontOpts = { expr: op.expr, mode: walking ? "stroll" : op.mode ?? "stand", phase: op.phase ?? 0, arms: op.arms, wave: op.wave, blink, look: op.look ?? 0,
    facing: op.mirror ? (-facing as -1 | 0 | 1) : facing, headTilt: op.headTilt ?? 0, tilt: op.tilt ?? 0 };
  const so: SideOpts = { expr: op.expr, mode: walking ? "march" : "stand", phase: op.phase ?? 0, stride: (op.stride ?? 0.8) * fs, stomp: 0.6, blink };
  const pl = person(cam, { i, o, okey: okey(o) }, x, y, z, { side, mirror: side ? sideSign < 0 : !!op.mirror }, fo, so, op.scale ?? 1);
  if (!side && op.mirror) pl.mirror = true;
  if (op.roll) pl.roll = op.roll;
  out.places.push(pl);
  if (!op.noBlob && !op.roll) blob(out, x, y, z, op.scale ?? 1);
};
const dirTo = (a: V3, b: V3): [number, number] => [b[0] - a[0], b[2] - a[2]];
const toCam = (cam: CamInfo, p: V3, k = 1, side: [number, number] = [0, 0]): [number, number] => [(cam.pos.x - p[0]) * k + side[0], (cam.pos.z - p[2]) * k + side[1]];
/** talking: wave the open arm a little on stressed words */
const fxAt = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, w: number, h: number, rot = 0, soft = false) =>
  out.fx.push({ key, cw, ch, draw, x: p[0], y: p[1], z: p[2], w, h, rot, soft });
const steam = (out: Stage, t: number, head: V3, seed: number) => {
  for (let n = 0; n < 2; n++) {
    const u = q(((t * 1.4 + n * 0.5 + seed * 0.37) % 1), 20);
    fxAt(out, `steam${u}`, 300, 300, (p) => fxSteam(p, u), [head[0] + (n ? 0.22 : -0.22) * (1 + u), head[1] + 0.25 + 0.5 * u, head[2]], 0.35 + 0.2 * u, 0.35 + 0.2 * u, 0, true);
  }
};
const sparkles = (out: Stage, t: number, c: V3) => {
  for (let n = 0; n < 5; n++) {
    const a = n * 1.26 + t * 0.6, r = 0.55 + 0.08 * Math.sin(t * 3 + n), pop = 0.6 + 0.4 * Math.sin(t * 8 + n * 2);
    fxAt(out, "spark", 200, 200, (p) => fxSpark(p), [c[0] + r * Math.cos(a), c[1] + 0.35 * Math.sin(a) + 0.1, c[2] + 0.05], 0.13 * pop, 0.13 * pop);
  }
};
const LOOKAWAY = (t: number, i: number) => Math.round(Math.sin(t * 0.7 + i * 2.1));
// ---------------- our people ----------------
/** Saul before Damascus: Paul's face, a dark Pharisee's mantle and a head cloth */
const SAUL: Outfit = { ...PAUL, jacket: "#2f3448", dress: "#5a4a78", pants: "#5a4a78", hat: "wrap", cap: "#e9e0cc" };
const ANANIAS: Outfit = { jacket: "#e9cf8f", dress: "#7a9a4a", pants: "#7a9a4a", boots: "#7a4f33", hat: "wrap", cap: "#efe3c8", beard: "#d8d2c8", skin: "#e8b88a", buttons: "none", build: "stout" };
const COMP = [folk(3), folk(5)];
const GUARD: Outfit = { ...folk(7), jacket: "#8a3a32", dress: "#6a5040", pants: "#6a5040", hat: "hair", hair: "#2e2018", beard: "#2e2018" };

/** time t is at or past word k of line n (reaction 2 f early) */
const at = (t: number, n: number, k = 0) => Math.round(t * FPS) >= LF(n, k);
const sw = (...ws: [number, number][]) => ws.map(([n, k]) => L(n, k));

// ---------------- the cast, shot by shot ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  pendingSwaps = [];
  { // key camera for view decisions
    const kc = viewCam(id, Math.round(t * FPS)), kp = new THREE.Vector3(...kc.pos), kl = new THREE.Vector3(...kc.look);
    const fw = kl.sub(kp).normalize(), rt = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)).normalize();
    VIEW = { pos: kp, right: rt };
  }
  const V = (p: V3) => add(VILL, p), R = (p: V3) => add(PERGA, p), S = (p: V3) => add(STUDY, p), C = (p: V3) => add(COURT, p);
  const letter = (p: V3, k = 1) => fxAt(out, "letter", 240, 160, (pn) => fxLetter(pn), p, 0.34 * k, 0.23 * k, 0.15 * Math.sin(t * 2));
  const glow = (p: V3, w: number) => fxAt(out, "glow", 300, 300, (pn) => fxGlow(pn), p, w, w, 0, true);
  const burst = (p: V3, u: number, w: number) => { const k = Math.round(u * 10) / 10; fxAt(out, `burst${k}`, 500, 500, (pn) => fxBurst(pn, k, "#fff3b0", 12, 40, 240), p, w, w, 0, true); };
  /** the listening / frightened crowd around the preaching step (village) */
  const crowd = (n: number, ex: (i: number) => Expr, target: V3) => {
    for (let i = 0; i < n; i++) {
      const a = -1.1 + (i % 6) * 0.44, r = 3.2 + (i >> 1 & 1) * 1.1 + (i > 5 ? 1.2 : 0);
      const p = V([Math.sin(a) * r + (hh(i) - 0.5) * 0.4, 0, -6 + Math.cos(a) * r]);
      who(out, cam, t, 10 + i, folk(i + 1), p, dirTo(p, target), { expr: ex(i), front: 0.3, look: 0 });
    }
  };
  switch (id) {
    case 1: {
      if (!at(t, 1, 8)) {
        // Saul, letters in hand, believers backing away behind him
        const sp = V([-0.35, 0, -2.6]);
        who(out, cam, t, 0, SAUL, sp, toCam(cam, sp, 1, [0.4, 0]), { expr: "stern", arms: "point", front: 0.3 });
        letter(add(sp, [0.42, 1.25, 0.25]), 1.1);
        for (let i = 0; i < 3; i++) { const p = V([0.9 + i * 0.9, 0, -5.4 - (i % 2) * 0.6]); who(out, cam, t, 10 + i, folk(i + 1), p, toCam(cam, p), { expr: "nervous", front: 0.3 }); }
      } else {
        const pr = V(SPOT.preach);
        who(out, cam, t, 0, PAUL, pr, toCam(cam, pr), { expr: "grin", arms: "open", front: 0.3, swaps: sw([1, 8]) });
        crowd(10, (i) => (i % 3 ? "smile" : "shock"), pr);
      }
      break;
    }
    case 2: {
      const sp = V([-0.6, 0, -2.6]), gp = V([0.5, 0, -3.3]);
      who(out, cam, t, 0, SAUL, sp, dirTo(sp, V([1.4, 0, -4.4])), { expr: "stern", arms: at(t, 2, 4) ? "point" : undefined, front: 0.25, swaps: sw([2, 4]) });
      who(out, cam, t, 1, GUARD, gp, dirTo(gp, V([1.4, 0, -4.4])), { expr: "stern", front: 0.3 });
      for (let i = 0; i < 2; i++) { const p = V([1.4 + i * 0.85, 0, -4.4 - i * 0.3]); who(out, cam, t, 10 + i, folk(i + 4), p, dirTo(p, sp), { expr: at(t, 2, 6) ? "shock" : "nervous", front: 0.3, swaps: sw([2, 6]) }); }
      for (let i = 0; i < 4; i++) { const p = V([-3.4 + i * 2.3, 0, -8.5 - (i % 2)]); who(out, cam, t, 20 + i, folk(i + 8), p, dirTo(p, sp), { expr: "nervous", front: 0.3 }); }
      break;
    }
    case 3: {
      // Saul ahead (heading -x), two companions behind him
      const x = roadX(t), ph = ((t * 1.15) / 1.28) % 1;
      who(out, cam, t, 0, SAUL, R([x, 0, 0.2]), [-1, 0], { expr: "stern", mode: "march", phase: ph, stride: 0.8 });
      COMP.forEach((o, k) => who(out, cam, t, 1 + k, o, R([x + 1.2 + k * 1.1, 0, -0.3 + k * 0.4]), [-1, 0], { expr: "neutral", mode: "march", phase: (ph + 0.3 + k * 0.27) % 1, stride: 0.8 }));
      letter(R([x - 0.25, 1.15, 0.45]), 0.9);
      break;
    }
    case 4: case 5: case 6: {
      if (id === 6) {
        // blind: a companion leads him by the hand toward Damascus
        const x = blindX(t), ph = ((t * 0.55) / 1.28) % 1;
        who(out, cam, t, 1, COMP[0], R([x - 0.75, 0, 0.15]), [-1, 0], { expr: "nervous", mode: "march", phase: ph, stride: 0.5 });
        who(out, cam, t, 0, SAUL, R([x, 0, 0.2]), [-1, 0], { expr: "pained", mode: "march", phase: (ph + 0.5) % 1, stride: 0.45, shut: true });
        who(out, cam, t, 2, COMP[1], R([x + 1.0, 0, -0.3]), [-1, 0], { expr: "nervous", mode: "march", phase: (ph + 0.2) % 1, stride: 0.5 });
        break;
      }
      const sp = R([XS, 0, 0.2]), u = fallU(t), lit = id === 5 ? 1 : lightOn(t);
      if (id === 4 && u < 1) who(out, cam, t, 0, SAUL, sp, toCam(cam, sp, 1, [0.5, 0]), { expr: lit > 0 ? "shock" : "stern", front: 0.3, swaps: sw([3, 2]),
        roll: u > 0 ? -1.3 * smooth(u) : undefined, tilt: 0 });
      else {
        // on the ground, looking up into the light
        const ex: Expr = id === 4 ? "dazed" : at(t, 4, 4) ? "relief_open" : "shock";
        who(out, cam, t, 0, SAUL, add(sp, [-0.9, 0.08, 0.3]), toCam(cam, sp), { expr: ex, roll: -Math.PI / 2 + 0.25, noBlob: true, swaps: sw([4, 4]) });
      }
      COMP.forEach((o, k) => { const p = R([XS + 1.7 + k * 1.1, 0, -0.2 + k * 0.5]); who(out, cam, t, 1 + k, o, p, dirTo(p, sp), { expr: lit > 0.5 ? "shock" : "neutral", front: 0.3, look: 0 }); });
      if (lit > 0.01) {
        glow(add(sp, [0, 4.5, -0.4]), 7 * lit);
        if (id === 4 && t < L(3, 2) + 0.8) burst(add(sp, [0, 2.2, 0.2]), clamp01((t - L(3, 2)) / 0.8), 3.2);
      }
      if (id === 5 && at(t, 4, 4)) glow(add(sp, [0, 2.6, -0.2]), 4.2);
      break;
    }
    case 7: {
      // three days in the dark: he sits, eyes shut, no food
      const sp = S(SPOT.deskMark);
      who(out, cam, t, 0, SAUL, sp, toCam(cam, sp), { expr: "pained", mode: "sit", headTilt: 6, shut: true });
      break;
    }
    case 8: {
      const ap = C([0, 0, -2.2]);
      who(out, cam, t, 3, ANANIAS, ap, toCam(cam, ap), { expr: at(t, 6, 8) ? "smile" : "nervous", arms: at(t, 6, 8) ? "open" : undefined, swaps: sw([6, 8]), look: at(t, 6, 8) ? 0 : -1 });
      glow(add(ap, [0, 3.2, -0.4]), 3.4);
      break;
    }
    case 9: {
      const sp = S(SPOT.deskMark), ap = S([1.05, 0, -1.75]);
      const sees = at(t, 7, 11), baptised = at(t, 7, 15);
      who(out, cam, t, 0, PAUL, sp, toCam(cam, sp, 1, [0.6, 0]), { expr: sees ? "grin" : at(t, 7, 9) ? "shock" : "pained", mode: "sit", shut: !at(t, 7, 9), swaps: sw([7, 9], [7, 11]) });
      who(out, cam, t, 3, ANANIAS, ap, dirTo(ap, sp), { expr: "smile_closed", arms: "open", front: 0.3 });
      const u = clamp01((t - L(7, 9)) / 0.7);
      if (u > 0 && u < 1) burst(add(sp, [0, 1.15, 0.2]), u, 1.4);
      if (sees) for (let n = 0; n < 5; n++) { const a = n * 1.26 + t * 0.6; fxAt(out, "spark", 200, 200, (p) => fxSpark(p), add(sp, [0.5 * Math.cos(a), 1.3 + 0.3 * Math.sin(a), 0.1]), 0.12, 0.12); }
      if (baptised) glow(add(sp, [0, 1.4, -0.3]), 2.6 * clamp01((t - L(7, 15)) / 0.5));
      break;
    }
    case 10: {
      const pr = V(SPOT.preach);
      who(out, cam, t, 0, PAUL, pr, toCam(cam, pr), { expr: at(t, 8, 15) ? "grin" : "smile", arms: "open", front: 0.3, wave: Math.sin(t * 5), swaps: sw([8, 15]) });
      crowd(12, (i) => (at(t, 8, 12) ? (i % 2 ? "shock" : "nervous") : "neutral"), pr);
      break;
    }
    case 11: {
      const pp = R([XS - 0.2, 0, 0.2]);
      who(out, cam, t, 0, PAUL, pp, toCam(cam, pp, 1, [0.4, 0]), { expr: at(t, 9, 9) ? "smile" : "smile_closed", swaps: sw([9, 9]) });
      break;
    }
    case 12: {
      const x = outX(t), ph = ((t * 0.9) / 1.28) % 1, moving = t > L(10, 0);
      who(out, cam, t, 0, PAUL, R([x - 0.2, 0, 0.2]), [-1, 0], { expr: "smile", mode: moving ? "march" : "stand", phase: ph, stride: 0.7 });
      break;
    }
  }
  return out;
};
export { FPS, clamp01, smooth };
