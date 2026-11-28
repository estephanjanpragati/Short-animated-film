// Stage the cast in the set's local coordinates. Expression cues use the Hindi narration.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxContact, fxShadow } from "./toon";
import { FPS, SHOTS, V3, L, LF, viewCam, origin, clamp01, smooth, easeOut, TOWER_Z, TIER_HALF, tierTop } from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { LEADER, WORKER, folk, fxSmoke, fxSpark, fxFire, fxVein, fxBubble, fxTongue } from "./people";
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
const workers = Array.from({ length: 12 }, (_, i) => WORKER(i));
const nations = Array.from({ length: 14 }, (_, i) => folk(i * 3 + 2));
const TZ = TOWER_Z, TERR = TZ + TIER_HALF[1] - 0.9, TY = tierTop(1);
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
  const lin = clamp01((f - shot.a) / (shot.b - shot.a));
  const actor = (i: number, outfit: Outfit, x: number, z: number, op: Opts, y = 0, dx = 0) =>
    who(out, cam, t, i, outfit, point(x, y, z), [dx, op.mode === "march" ? 0 : 1], { phase: (t * 1.2 + i * 0.21) % 1, ...op });
  const facing = (i: number, outfit: Outfit, x: number, z: number, dir: [number, number], op: Opts, y = 0) =>
    who(out, cam, t, i, outfit, point(x, y, z), dir, { phase: (t * 1.2 + i * 0.21) % 1, ...op });
  /** a speech bubble that pops in at time t0 (s) over a head at (x, y, z) */
  const bubble = (kind: number, x: number, y: number, z: number, t0: number, size = 0.62, dx = 0.35) => {
    const o = (t - t0) * 5;
    if (o <= 0) return;
    const s = 0.5 + 0.5 * easeOut(o), wob = 0.03 * Math.sin(t * 6 + kind);
    fxAt(out, "bubble" + kind, 320, 240, (p) => fxBubble(p, kind), point(x + dx, y + wob, z + 0.05), size * 1.33 * s, size * s);
  };
  const terrace = (n: number, op: (i: number) => Opts) => {
    const xs = [-5.4, -4.3, -3.2, -2.2, -6.5, 2.6];
    for (let i = 0; i < n; i++) actor(10 + i, workers[i], xs[i], TERR, op(i), TY);
  };
  switch (id) {
    case 1: { // hook: the tower that would touch the sky (tiny builders on its terraces)
      for (let i = 0; i < 6; i++) { const tier = 1 + (i % 4), hs = TIER_HALF[tier]; actor(10 + i, workers[i], -hs * 0.6 + (i * 2.3) % (hs * 1.2), TZ + hs + 0.5 - (i % 2) * 0.4, { expr: "smile", mode: i % 3 ? "stand" : "march" }, tierTop(tier - 1), 1); }
      for (let i = 0; i < 5; i++) actor(20 + i, workers[i + 6], -6 + i * 3.1, -14 - (i % 2) * 1.2, { expr: "smile" });
      break;
    }
    case 2: { // hook: suddenly nobody understands anybody
      terrace(4, (i) => ({ expr: (["shock", "stern", "nervous", "shock"] as const)[i], arms: i % 2 ? "point" : "open" }));
      const xs = [-5.4, -4.3, -3.2, -2.2];
      for (let i = 0; i < 4; i++) bubble(i, xs[i], TY + 2.45 + (i % 2) * 0.35, TERR, L(1, 7) - 0.15 + i * 0.35, 0.5, 0);
      if (at(1, 13)) bubble(8, -3.8, TY + 3.2, TERR, L(1, 13), 0.45, 0);
      break;
    }
    case 3: { // after the flood: one people, one language, travelling together
      const x = -14.2 + 3 * lin;
      for (let i = 0; i < 4; i++) actor(10 + i, i === 0 ? LEADER : workers[i], x - i * 0.9, 22 + (i % 2) * 0.5, { mode: "march", expr: i % 2 ? "smile" : "grin" }, 0, 1);
      bubble(10, x - 0.4, 2.55, 22, L(2, 6), 0.55, 0);
      break;
    }
    case 4: // settled on the plain of Shinar
      for (let i = 0; i < 9; i++) actor(10 + i, workers[i], [-10, -6, -2, 3, 7, 11, -14, 14, 0][i], [6, 9, 4, 8, 5, 9, 12, 13, 14][i], { expr: "smile", mode: i % 3 === 1 ? "march" : "stand" }, 0, i % 2 ? 1 : -1);
      break;
    case 5: { // "come, let us make bricks"
      actor(0, LEADER, 5.6, -3.6, { expr: "grin", arms: at(3, 2) ? "point" : "open" });
      for (let i = 0; i < 3; i++) actor(10 + i, workers[i], 8 + i * 1.4, -4.6 + (i % 2) * 0.4, { expr: "smile", mode: "sit", arms: "cross" });
      actor(13, workers[3], 11.6, -2.0, { expr: "grin", arms: "open" });
      bubble(6, 5.6, 2.55, -3.6, L(3, 3), 0.6);
      break;
    }
    case 6: { // ...and bake them in the fire
      fxAt(out, "fire" + (f % 4), 300, 400, (p) => fxFire(p, Math.floor(t * 8) / 8, 0.7), point(12, 0.55, -6.9), 0.95, 1.25);
      for (let k = 0; k < 3; k++) { const u = (t * 0.35 + k / 3) % 1; fxAt(out, "smoke" + Math.round(u * 8), 300, 300, (p) => fxSmoke(p, Math.round(u * 8) / 8), point(12 + 0.3 * k - 0.3, 1.8 + u * 2.4, -8.6), 1.3 + u, 1.3 + u, 0, true); }
      actor(14, workers[4], 13.6, -6.6, { expr: "smile", arms: "open" });
      break;
    }
    case 7: { // brick instead of stone, tar instead of mortar: the first course
      actor(10, workers[0], 2.2, -15.6, { expr: "smile", arms: "open" });
      actor(11, workers[1], 4.3, -15.2, { expr: "grin" });
      actor(12, workers[2], 6.0, -15.9, { expr: "smile", arms: "cross" });
      break;
    }
    case 8: // "come, let us build a tower to the heavens"
      actor(0, LEADER, 0, -11.5, { expr: "grin", arms: "point", headTilt: 0.15 });
      break;
    case 9: // the tower rises (time-lapse)
      for (let i = 0; i < 5; i++) actor(20 + i, workers[i + 4], -6 + i * 3, -12 - (i % 2), { expr: "smile", mode: "march" }, 0, i % 2 ? 1 : -1);
      break;
    case 10: { // "let us make a name for ourselves"
      actor(0, LEADER, 0, -13.2, { expr: "laugh", arms: "open" });
      for (let i = 0; i < 8; i++) { const sx = i % 2 ? 1 : -1, k = Math.floor(i / 2); facing(10 + i, workers[i], sx * (1.0 + k * 0.55), -11.6 + k * 0.55, [-sx, -0.6], { expr: i % 3 ? "grin" : "laugh", arms: "open" }); }
      sparkles(out, t, point(0, 2.7, -13));
      break;
    }
    case 11: break; // the high, wide view of the one crowded spot
    case 12: { // the LORD came down to see: through the clouds
      for (let k = 0; k < 3; k++) { const y = 135 + k * 18, a = k * 2.1; fxAt(out, "cloudpuff", 300, 300, (p) => fxSmoke(p, 0.35), point(Math.cos(a) * 14, y, TZ + Math.sin(a) * 14), 30, 30, 0, true); }
      break;
    }
    case 13:
      for (let i = 0; i < 6; i++) { const tier = 1 + (i % 4), hs = TIER_HALF[tier]; actor(10 + i, workers[i], -hs * 0.6 + (i * 2.3) % (hs * 1.2), TZ + hs + 0.5, { expr: "smile" }, tierTop(tier - 1)); }
      break;
    case 14: // light from above on the tower: the builders look up
      terrace(4, (i) => ({ expr: i % 2 ? "shock" : "dazed", arms: "open", headTilt: -0.1 }));
      sparkles(out, t, point(0, TY + 3.2, TERR - 1.5));
      break;
    case 15: { // he confused their language
      terrace(4, (i) => ({ expr: at(7, 5) ? (["shock", "stern", "nervous", "dazed"][i] as Opts["expr"]) : "smile", arms: i % 2 ? "point" : "open" }));
      const xs = [-5.4, -4.3, -3.2, -2.2];
      for (let i = 0; i < 4; i++) bubble(i + 1, xs[i], TY + 2.45 + (i % 2) * 0.35, TERR, L(7, 3) + i * 0.3, 0.5, 0);
      break;
    }
    case 16: // one asks for a brick
      terrace(2, (i) => ({ expr: i === 0 ? "grin" : "neutral", arms: i === 0 ? "point" : undefined }));
      bubble(6, -5.4, TY + 2.45, TERR, L(7, 9) - 0.1, 0.6, 0.2);
      break;
    case 17: { // the other brings something else entirely
      terrace(2, (i) => ({ expr: i === 0 ? (at(7, 15) ? "stern" : "shock") : "smile", arms: i === 0 ? "cross" : "open" }));
      bubble(7, -4.3, TY + 2.45, TERR, L(7, 12), 0.55, 0.15);
      if (at(7, 15)) { bubble(8, -5.4, TY + 2.75, TERR, L(7, 15), 0.5, -0.1); fxAt(out, "vein", 200, 200, fxVein, point(-5.15, TY + 1.95, TERR + 0.1), 0.22, 0.22); }
      break;
    }
    case 18: // the work stopped
      for (let i = 0; i < 6; i++) { const tier = 1 + (i % 3), hs = TIER_HALF[tier]; actor(10 + i, workers[i], -hs * 0.7 + i * 2.6, TZ + hs + 0.5, { expr: i % 2 ? "nervous" : "stern", mode: "sit", arms: "cross" }, tierTop(tier - 1)); }
      break;
    case 19: { // scattered over all the earth: each group with its own language
      const groups: [number, number, number, number][] = [[-5, 4, -1, 0], [5, 2, 1, 1], [-3, 11, -1, 2], [4, 13, 1, 3], [-8, -2, -1, 4]];
      groups.forEach(([x0, z, dir, kind], gi) => {
        const x = x0 + dir * 11 * lin;
        for (let k = 0; k < 3; k++) actor(10 + gi * 3 + k, workers[(gi * 3 + k) % 12], x - dir * k * 1.1, z + (k % 2) * 0.5, { mode: "march", expr: "nervous" }, 0, dir);
        bubble(kind, x, 2.5, z, L(8, 0) + gi * 0.2, 0.9, 0);
      });
      break;
    }
    case 20: break; // the empty tower: Babel, confusion
    case 21: case 25: { // Pentecost: tongues of fire on the apostles / those who exalt God's name are joined
      for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * 0.95;
        actor(10 + i, nations[i], x, -3.4 - Math.abs(i - 2.5) * 0.15, { expr: id === 25 ? "smile" : "relief_open", arms: "open" });
        if (id === 21) fxAt(out, "tongue" + (f % 3), 200, 260, (p) => fxTongue(p, Math.floor(t * 10) / 10, i), point(x, 2.45 + 0.03 * Math.sin(t * 5 + i), -3.35 - Math.abs(i - 2.5) * 0.15), 0.22, 0.29);
      }
      if (id === 25) { for (let i = 0; i < 6; i++) actor(20 + i, nations[i + 6], (i - 2.5) * 0.9 + 0.4, -1.6 + (i % 2) * 0.3, { expr: "smile", arms: "open" }); sparkles(out, t, point(0, 2.6, -2.6)); }
      break;
    }
    case 22: { // each heard them in his own language
      for (let i = 0; i < 10; i++) {
        const col = i % 5 - 2, row = Math.floor(i / 5), x = col * 1.05 + row * 0.45, z = -0.4 + row * 1.0;
        facing(20 + i, nations[i + 4], x, z, [0, -1], { expr: at(9, 14) ? "relief_open" : "shock" });
        if (i < 5) bubble(i % 6, x, 2.5, z - 0.1, L(9, 6) + i * 0.18, 0.5, 0.25);
      }
      break;
    }
    case 23: { // what was scattered at Babel, God joined together
      for (let i = 0; i < 6; i++) actor(10 + i, nations[i], (i - 2.5) * 0.95, -3.8, { expr: "smile", arms: "open" });
      for (let i = 0; i < 8; i++) actor(20 + i, nations[i + 4], (i - 3.5) * 0.85, -1.4 + (i % 2) * 0.35, { expr: at(9, 25) ? "laugh" : "smile", arms: "open" });
      if (at(9, 23)) for (let i = 0; i < 4; i++) bubble(9, (i - 1.5) * 1.7, 2.5, -1.3, L(9, 23) + i * 0.15, 0.45, 0);
      break;
    }
    case 24: // the lonely builder at the unfinished tower
      actor(0, LEADER, 0, -12, { expr: "pained", arms: "cross" });
      break;
    case 26: break;
  }
  return out;
};
