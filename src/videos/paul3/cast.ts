// Stage the cast in the set's local coordinates. Expression cues use the Hindi narration.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxContact, fxShadow } from "./toon";
import { FPS, SHOTS, V3, L, LF, viewCam, origin, clamp01, smooth, easeOut } from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { PAUL, BARNABAS, LAME, ZPRIEST, OPP, folk, fxSmoke, fxSpark, fxStone, fxGarland, fxRip, fxLabel, fxSteam, drawBeast } from "./people";
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

export type Stage = { places: Place[]; fx: FxPlace[] };
const add = (o: V3, p: V3): V3 => [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
type Opts = { expr: Expr; arms?: FrontOpts["arms"]; wave?: number; mode?: "stand" | "sit" | "march" | "fall"; phase?: number; stride?: number;
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
  const walking = op.mode === "march";
  const side = walking ? true : c < (op.front ?? 0.5) && op.mode !== "sit" && op.mode !== "fall"; // walkers are always drawn in profile (no view flips while tracking)
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
const fxAt = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, w: number, h: number, rot = 0, soft = false) =>
  out.fx.push({ key, cw, ch, draw, x: p[0], y: p[1], z: p[2], w, h, rot, soft });
const sparkles = (out: Stage, t: number, c: V3) => {
  for (let n = 0; n < 5; n++) {
    const a = n * 1.26 + t * 0.6, r = 0.55 + 0.08 * Math.sin(t * 3 + n), pop = 0.6 + 0.4 * Math.sin(t * 8 + n * 2);
    fxAt(out, "spark", 200, 200, (p) => fxSpark(p), [c[0] + r * Math.cos(a), c[1] + 0.35 * Math.sin(a) + 0.1, c[2] + 0.05], 0.13 * pop, 0.13 * pop);
  }
};
const townspeople = Array.from({ length: 16 }, (_, i) => folk(i + 1));
const disciples = Array.from({ length: 6 }, (_, i) => folk(i + 20));
/** a side-view animal card (people.ts drawBeast) walking along x; faces screen right unless walking the other way */
const beast = (out: Stage, cam: CamInfo, kind: "ox", p: V3, dx: number, phase: number, scale: number) => {
  const d = cam.pos.distanceTo(tmp.set(p[0], p[1] + 0.8, p[2])) / scale;
  const [w, h, k] = tier(d);
  const ph = Math.round((phase % 1) * 8) / 8;
  const mirror = dx * cam.right.x < 0;
  out.places.push({ key: `B|${kind}|${ph}`, x: p[0], y: p[1], z: p[2], scale, mirror, draw: (pn) => drawBeast(pn, kind, ph), size: [w, h, k] });
  blob(out, p[0], p[1], p[2], scale * 1.4);
};
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const shot = SHOTS[id - 1], f = Math.round(t * FPS);
  LNAME = shot.light;
  findSun(cam, SUN);
  const key = viewCam(id, shot.a);
  const pos = new THREE.Vector3(...key.pos), forward = new THREE.Vector3(...key.look).sub(pos);
  VIEW = { pos, right: forward.cross(new THREE.Vector3(0, 1, 0)).normalize() };
  const point = (x: number, y: number, z: number): V3 => add(origin(shot.set), [x, y, z]);
  const at = (line: number, word: number) => f >= LF(line, word);
  const since = (line: number, word: number) => (f - LF(line, word)) / FPS;
  const progress = smooth((f - shot.a) / (shot.b - shot.a));
  const lin = clamp01((f - shot.a) / (shot.b - shot.a));
  const actor = (i: number, outfit: Outfit, x: number, z: number, op: Opts, y = 0, dx = 0) =>
    who(out, cam, t, i, outfit, point(x, y, z), [dx, op.mode === "march" ? 0 : 1], { phase: (t * 1.2 + i * 0.21) % 1, ...op });
  /** someone facing a direction (dx, dz) instead of the camera */
  const facing = (i: number, outfit: Outfit, x: number, z: number, dir: [number, number], op: Opts, y = 0) =>
    who(out, cam, t, i, outfit, point(x, y, z), dir, { phase: (t * 1.2 + i * 0.21) % 1, ...op });
  const stone = (n: number, from: V3, to: V3, rate = 1.4) => {
    const u = (t * rate + n * 0.37) % 1, a = point(...from), b = point(...to);
    const p: V3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + 0.9 * Math.sin(Math.PI * u), a[2] + (b[2] - a[2]) * u];
    fxAt(out, "stone" + (n % 3), 200, 160, (pn) => fxStone(pn, n), p, 0.17, 0.14, u * 6 + n);
  };
  const label = (text: string, x: number, y: number, z: number, o: number) => {
    if (o <= 0) return;
    const s = 0.4 + 0.6 * easeOut(o);
    fxAt(out, "label" + text, 480, 160, (pn) => fxLabel(pn, text), point(x, y, z), 0.8 * s, 0.27 * s);
  };
  const crowd = (n: number, z0: number, spread: number, op: (i: number) => Opts, start = 0) => {
    for (let i = 0; i < n; i++) {
      const col = i % 7 - 3, row = Math.floor(i / 7);
      actor(30 + i, townspeople[(i + start) % 16], col * (spread / 6) + row * 0.35, z0 - row * 1.0 - Math.abs(col) * 0.12, op(i), 0, col > 0 ? -1.5 : 1.5);
    }
  };
  const lying = (i: number, outfit: Outfit, x: number, z: number, r: number, op: Partial<Opts> = {}) =>
    actor(i, outfit, x, z, { expr: "dazed", shut: true, roll: r, noBlob: true, ...op }, 0.3 * Math.sin(Math.abs(r)));
  const ground = (x: number, z: number, w = 1.6) =>
    out.fx.push({ key: "blob|contact|lie", cw: 128, ch: 128, draw: (p) => fxContact(p, "#8a84a8"), ...(() => { const q2 = point(x, 0.022, z); return { x: q2[0], y: q2[1], z: q2[2] }; })(), w, h: 0.55, flat: true, rot: 0 });

  switch (id) {
    case 1: { // hook: kneeling crowd worships Paul and Barnabas on the step
      actor(0, PAUL, -0.5, -5.95, { expr: "nervous", arms: "open" }, 0.45);
      actor(1, BARNABAS, 0.7, -6.1, { expr: "nervous" }, 0.45);
      for (let i = 0; i < 7; i++) actor(10 + i, townspeople[i], (i - 3) * 0.95, -4.3 + Math.abs(i - 3) * 0.25 - (i % 2) * 0.3,
        { expr: i % 2 ? "grin" : "smile_closed", mode: "sit", arms: "open", shut: i % 2 === 0 });
      for (let n = 0; n < 4; n++) fxAt(out, "garland", 300, 300, fxGarland, point(-1.6 + n * 1.1, 0.45 + 0.08 * Math.sin(t * 3 + n), -5.1 - (n % 2) * 0.3), 0.42, 0.42);
      sparkles(out, t, point(0, 2.6, -5.8));
      break;
    }
    case 2: { // hook: the same crowd throws stones
      actor(0, PAUL, -0.3, -5.95, { expr: "shock", arms: "cross" }, 0.45);
      const cx = [-3.4, -2.5, -1.7, 1.5, 2.4, 3.3], cz = [-3.8, -3.3, -2.9, -2.9, -3.3, -3.8];
      for (let i = 0; i < 6; i++) actor(10 + i, townspeople[i], cx[i], cz[i], { expr: "stern", arms: i % 2 ? "point" : "cross" });
      for (let n = 0; n < 6; n++) stone(n, [cx[n], 1.6, cz[n]], [-0.3 + 0.2 * Math.sin(n), 1.9, -5.9], 1.7);
      break;
    }
    case 3: { // Lystra: Paul and Barnabas arrive; the lame man by the wall
      const x = -3.5 + 3.2 * lin;
      actor(0, PAUL, x, 0.4, { mode: "march", expr: "smile" }, 0, 1);
      actor(1, BARNABAS, x - 1.1, 0.75, { mode: "march", expr: "grin" }, 0, 1);
      actor(2, LAME, -2.2, -3, { mode: "sit", expr: "pained", arms: "cross" });
      for (let i = 0; i < 6; i++) actor(10 + i, townspeople[i + 3], [-5, -4, 3.5, 4.6, 2.2, -1][i], [-6, 2, -4, 1, -8, -9][i], { expr: "neutral" });
      break;
    }
    case 4: case 5: { // a man lame from birth, who had never walked
      actor(2, LAME, -2.2, -3, { mode: "sit", expr: id === 5 ? "pained" : "neutral", arms: "cross", look: -0.3 });
      if (id === 4) for (let i = 0; i < 2; i++) actor(10 + i, townspeople[i + 7], -4.5 + 6 * lin + i * 0.9, -5.2 - i * 0.4, { mode: "march", expr: "neutral" }, 0, 1);
      break;
    }
    case 6: case 7: { // Paul looks at him: "Stand up straight on your feet!"
      const shout = id === 7;
      facing(0, PAUL, 0.7, -2.4, shout ? [-0.3, 1] : [-1, 0.25], { expr: "stern", arms: shout ? "point" : undefined, front: 0.6 });
      actor(1, BARNABAS, 1.75, -2.85, { expr: shout ? "shock" : "neutral" });
      actor(2, LAME, -2.2, -3, { mode: "sit", expr: shout ? "shock" : "neutral", arms: "open", look: 0.4 });
      crowd(5, -5.3, 7, (i) => ({ expr: shout ? "shock" : "neutral" }));
      break;
    }
    case 8: { // he leaps up and walks
      const hop = Math.abs(Math.sin(t * 5.5)) * 0.32 * (1 - 0.4 * lin);
      actor(2, LAME, -1.6 + 0.5 * lin, -3, { expr: "laugh", arms: "open" }, hop);
      sparkles(out, t, point(-1.4 + 0.5 * lin, 1.1 + hop, -2.8));
      actor(0, PAUL, 0.7, -2.4, { expr: "smile", arms: "open" });
      actor(1, BARNABAS, 1.75, -2.85, { expr: "grin" });
      crowd(6, -5.2, 7, (i) => ({ expr: i % 2 ? "shock" : "laugh", arms: "open" }));
      break;
    }
    case 9: { // the crowd shouts: the gods have come down in human form
      actor(0, PAUL, -0.55, -3.2, { expr: "nervous" });
      actor(1, BARNABAS, 0.6, -3.35, { expr: "nervous" });
      crowd(14, -4.8, 8, (i) => ({ expr: i % 3 === 0 ? "shock" : "laugh", arms: i % 2 ? "open" : "point", wave: i % 4 === 1 ? Math.sin(t * 6 + i) : undefined }));
      actor(2, LAME, -2.6, -2.7, { expr: "laugh", arms: "open" }, Math.abs(Math.sin(t * 5)) * 0.12);
      break;
    }
    case 10: { // "Barnabas they called Zeus, Paul Hermes"
      actor(0, PAUL, -0.55, -2.5, { expr: at(4, 12) ? "shock" : "nervous" });
      actor(1, BARNABAS, 0.65, -2.6, { expr: at(4, 10) ? "shock" : "nervous" });
      label("ज़्यूस", 0.5, 2.3, -2.55, clamp01(since(4, 10) * 4));
      label("हिरमेस", -0.45, 2.22, -2.45, clamp01(since(4, 14) * 4));
      break;
    }
    case 11: { // the priest of Zeus brings a bull and garlands to sacrifice
      const x = 4.6 - 3.0 * progress;
      beast(out, cam, "ox", point(x - 1.3, 0, -1.2), -1, t * 1.1, 1.4);
      actor(5, ZPRIEST, x, -0.3, { mode: "march", expr: "grin" }, 0, -1);
      actor(6, townspeople[9], x + 1.1, 0.1, { mode: "march", expr: "smile" }, 0, -1);
      fxAt(out, "garland", 300, 300, fxGarland, point(x - 0.35, 1.25, -0.15), 0.4, 0.4);
      fxAt(out, "garland", 300, 300, fxGarland, point(x + 0.75, 1.2, 0.25), 0.38, 0.38);
      crowd(7, -3.4, 7, (i) => ({ expr: "grin", arms: "open" }), 4);
      break;
    }
    case 12: { // they tear their clothes
      const rip = at(5, 6);
      actor(0, PAUL, -0.5, -2.5, { expr: rip ? "pained" : "shock", arms: rip ? "open" : "cross" });
      actor(1, BARNABAS, 0.62, -2.6, { expr: rip ? "pained" : "shock", arms: rip ? "open" : "cross" });
      if (rip) {
        const s = easeOut(since(5, 6) * 3);
        fxAt(out, "rip", 240, 120, fxRip, point(-0.5, 1.2, -2.35), 0.42 * s, 0.2 * s, 1.1);
        fxAt(out, "rip", 240, 120, fxRip, point(0.62, 1.15, -2.45), 0.48 * s, 0.22 * s, -1.2);
      }
      break;
    }
    case 13: { // they rush into the crowd: "Stop!"
      const x = 0.6 - 2.4 * lin;
      actor(0, PAUL, x, -2.2, { mode: "march", expr: "shock", stride: 1.2 }, 0, -1);
      actor(1, BARNABAS, x + 0.95, -2.5, { mode: "march", expr: "shock", stride: 1.2 }, 0, -1);
      for (let i = 0; i < 6; i++) actor(30 + i, townspeople[i + 2], -3.2 - (i % 3) * 0.9, -2.0 - Math.floor(i / 3) * 0.9 - (i % 2) * 0.2,
        { expr: at(5, 11) ? "shock" : "grin", arms: at(5, 11) ? "cross" : "open" });
      break;
    }
    case 14: { // "We too are only human, like you"
      actor(0, PAUL, 0, -2.2, { expr: "pained", arms: "open" });
      actor(1, BARNABAS, 1.05, -2.5, { expr: "nervous", arms: "open" });
      break;
    }
    case 15: { // "...to turn you to the living God": the crowd listens
      facing(0, PAUL, 0.3, -3.6, [0, 1], { expr: "relief_open", arms: "point" });
      for (let i = 0; i < 10; i++) {
        const col = i % 5 - 2, row = Math.floor(i / 5);
        facing(30 + i, townspeople[i], col * 1.0 + row * 0.4, -1.2 + row * 1.0, [0, -1], { expr: i % 3 ? "neutral" : "shock" });
      }
      sparkles(out, t, point(0.3, 2.9, -3.6));
      break;
    }
    case 16: { // opponents arrive and stir the crowd up
      const x = 5 - 2.6 * lin;
      for (let i = 0; i < 3; i++) actor(40 + i, OPP(i), x + i * 0.95, -0.8 - (i % 2) * 0.5, { mode: "march", expr: "stern" }, 0, -1);
      crowd(6, -3.2, 6, (i) => ({ expr: at(6, 6) ? "stern" : "nervous", arms: at(6, 6) && i % 2 ? "point" : undefined }), 6);
      if (at(6, 6)) for (let i = 0; i < 3; i++) {
        const u = ((t - L(6, 6)) * 0.9 + i * 0.33) % 1;
        fxAt(out, "steam" + Math.round(u * 8), 300, 300, (p) => fxSteam(p, Math.round(u * 8) / 8), point(-1.5 + i * 1.4, 2.3 + u * 0.4, -3.2), 0.6, 0.6, 0, true);
      }
      break;
    }
    case 17: { // stones rain down
      actor(0, PAUL, 0, -2.4, { expr: "shock", arms: "cross" });
      for (let i = 0; i < 4; i++) actor(40 + i, i < 3 ? OPP(i) : townspeople[2], i < 2 ? -2.6 - i * 0.9 : 2.5 + (i - 2) * 0.9, -2.0 - (i % 2) * 0.6, { expr: "stern", arms: "point" });
      for (let n = 0; n < 9; n++) stone(n, [n % 2 ? -2.6 : 2.6, 1.6, -2.1], [0.15 * Math.sin(n * 2), 1.5, -2.35], 1.9);
      break;
    }
    case 18: { // Paul falls
      const u = clamp01((f - shot.a) / 10);
      if (u < 1) actor(0, PAUL, 0, -2.4, { expr: "pained", mode: "fall", shut: true, roll: u * 1.45 }, 0.3 * u);
      else lying(0, PAUL, 0, -2.4, 1.5);
      ground(0, -2.4);
      for (let n = 0; n < 3; n++) if (lin < 0.4) stone(n, [n % 2 ? -2.6 : 2.6, 1.4, -2.1], [0.3 * n, 0.4, -2.3], 2.2);
      for (let n = 0; n < 5; n++) fxAt(out, "stone" + (n % 3), 200, 160, (pn) => fxStone(pn, n), point(-0.9 + n * 0.45, 0.07, -2.0 - (n % 2) * 0.5), 0.16, 0.13);
      break;
    }
    case 19: { // dragged outside the city, thought dead
      const x = 0.6 - 2.6 * lin;
      actor(40, OPP(0), x, 0.25, { mode: "march", expr: "stern" }, 0, -1);
      actor(41, OPP(1), x + 0.2, -0.35, { mode: "march", expr: "stern" }, 0, -1);
      lying(0, PAUL, x + 1.9, 0, 1.5);
      ground(x + 1.2, 0);
      break;
    }
    case 20: case 21: { // the disciples gather round ... and Paul gets up
      const up = id === 21 ? clamp01((f - shot.a) / 16) : 0;
      if (up < 1) lying(0, PAUL, -3, 0, 1.5 * (1 - up), up > 0 ? { expr: "stern", shut: false } : {});
      else actor(0, PAUL, -3, 0, { expr: "stern", arms: "cross" });
      if (up < 1) ground(-3.6, 0);
      for (let i = 0; i < 5; i++) {
        const a = -0.4 + i * 0.75, x = -3.4 + 1.45 * Math.cos(a + Math.PI), z = -1.35 * Math.sin(a + Math.PI) * -1;
        facing(50 + i, disciples[i], x, z, [-3.4 - x, -z], { expr: id === 21 ? (up > 0.5 ? "relief_open" : "shock") : "pained", shut: id === 20 && i % 2 === 0 });
      }
      break;
    }
    case 22: // "Do you know where he went?"
      facing(0, PAUL, -3, 0, [1, -0.15], { expr: "stern" });
      break;
    case 23: { // back into the same city
      const x = -2.4 + 3.2 * lin;
      actor(0, PAUL, x, 3, { mode: "march", expr: "stern" }, 0, 1);
      actor(1, BARNABAS, x - 1.05, 3.3, { mode: "march", expr: "neutral" }, 0, 1);
      for (let i = 0; i < 6; i++) facing(30 + i, townspeople[i + 5], [-3.5, -2.6, 3.4, 2.5, 4.2, -4.3][i], [4.6, 5.2, 4.4, 5.3, 6, 6.1][i], [0, -1], { expr: "shock" });
      break;
    }
    case 24: case 25: { // strengthening the disciples: "through many hardships"
      actor(0, PAUL, 0, -3.6, { expr: id === 25 ? "relief_open" : "smile", arms: "open" });
      if (id === 24) {
        actor(1, BARNABAS, 1.2, -3.85, { expr: "smile" });
        for (let i = 0; i < 6; i++) facing(50 + i, disciples[i], (i - 2.5) * 0.95, -1.9 - Math.abs(i - 2.5) * 0.22, [0, -1], { mode: "sit", expr: "smile" });
      }
      break;
    }
    case 26: // the lesson
      actor(0, PAUL, -3, 0, { expr: at(9, 5) ? "relief_open" : "smile", arms: "open" });
      sparkles(out, t, point(-3, 1.6, 0.2));
      break;
    case 27: case 28: { // he refused the praise, and went back after the stones / walk on toward the next reel
      const x = (id === 27 ? -2.4 : -4.2) - 1.6 * lin;
      actor(0, PAUL, x - 0.55, 0.05, { mode: "march", expr: "smile" }, 0, -1);
      actor(1, BARNABAS, x + 0.55, -0.3, { mode: "march", expr: "grin" }, 0, -1);
      if (id === 27) {
        out.fx.push({ key: "garlandFlat", cw: 300, ch: 300, draw: fxGarland, ...(() => { const q2 = point(-1.6, 0.03, 0.9); return { x: q2[0], y: q2[1], z: q2[2] }; })(), w: 0.5, h: 0.5, flat: true, rot: 0.4 });
        for (let n = 0; n < 4; n++) { const q2 = point(-3.4 + n * 0.5, 0.07, 1.1 + (n % 2) * 0.3); fxAt(out, "stone" + (n % 3), 200, 160, (pn) => fxStone(pn, n), q2, 0.16, 0.13); }
      }
      break;
    }
  }
  return out;
};
