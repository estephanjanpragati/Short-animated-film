// Our cast as lit flat cards in the 3D world (machinery from the bridge short: canvas pool, lit billboards, contact
// blobs, blinks), staged per shot for "The Quitter Who Wrote a Gospel". Everyone has a facing direction in the world;
// the camera decides front (with a 3/4 turn) or side view, exactly like the bridge's marching column.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxBurst, fxStars, fxContact, fxShadow, fxPuff } from "./toon";
import { fxSpark, JESUS, drawBeast, fxGlow, CAIN, ABEL, PRIEST, KID_A, KID_B, MOM, fxCrops, fxLamb, fxFire, fxSmoke, fxHeart, fxQuestion, fxCard, fxReceipt, fxSin, fxCry } from "./people";
import {
  FPS, SHOTS, V3, T, W, viewCam, ALT, FARM, PAST, TAB, KIT, HUT, HILLX, CAIN_ALT, ABEL_ALT, climb, beamOn, duskWalk, clamp01, smooth,
} from "./story";
import { NOINK } from "./ink";
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
  look?: number; mirror?: boolean; roll?: number; swaps?: number[]; scale?: number; front?: number; headTilt?: number; noBlob?: boolean; tilt?: number; prop?: FrontOpts["prop"] };
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
  const blink = lidAt(t, i, op.swaps);
  const fs = Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20;
  const facing = (c > 0.93 ? 0 : sideSign > 0 ? 1 : -1) as -1 | 0 | 1;
  const fo: FrontOpts = { expr: op.expr, mode: walking ? "stroll" : op.mode ?? "stand", phase: op.phase ?? 0, arms: op.arms, wave: op.wave, blink, look: op.look ?? 0,
    facing: op.mirror ? (-facing as -1 | 0 | 1) : facing, headTilt: op.headTilt ?? 0, tilt: op.tilt ?? 0, prop: op.prop ?? null };
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
const sparkles = (out: Stage, t: number, c: V3) => {
  for (let n = 0; n < 5; n++) {
    const a = n * 1.26 + t * 0.6, r = 0.55 + 0.08 * Math.sin(t * 3 + n), pop = 0.6 + 0.4 * Math.sin(t * 8 + n * 2);
    fxAt(out, "spark", 200, 200, (p) => fxSpark(p), [c[0] + r * Math.cos(a), c[1] + 0.35 * Math.sin(a) + 0.1, c[2] + 0.05], 0.13 * pop, 0.13 * pop);
  }
};
const LOOKAWAY = (t: number, i: number) => Math.round(Math.sin(t * 0.7 + i * 2.1));

// ---------------- the cast, shot by shot ----------------
const sheep = (out: Stage, cam: CamInfo, i: number, p: V3, dx: number, t: number, walk = 0) => {
  const d = cam.pos.distanceTo(tmp.set(p[0], p[1] + 0.6, p[2])), [w, h, k] = tier(d / 0.6), ph = walk ? q((t * walk + hh(i)) % 1, 12) : 0;
  const mirror = dx * (VIEW ?? cam).right.x < 0, bob = walk ? 0 : 0.015 * Math.sin(t * 2 + i);
  out.places.push({ key: `sheep|${ph}`, draw: (pn) => drawBeast(pn, "sheep", ph), x: p[0], y: p[1] + bob, z: p[2], scale: 0.6, mirror, size: [w, h, k] });
  blob(out, p[0], p[1], p[2], 0.8);
};
const flock = (out: Stage, cam: CamInfo, t: number, c: V3, n = 9) => { for (let i = 0; i < n; i++) sheep(out, cam, i, add(c, [(i % 3) * 1.3 - 1.3 + (hh(i, 3) - 0.5) * 0.6, 0, -(i / 3 | 0) * 1.1 - 0.8 + (hh(i, 4) - 0.5) * 0.5]), hh(i, 5) > 0.5 ? 1 : -1, t); };
const fire = (out: Stage, t: number, at: V3, big = 1) => { const u = q((t * 6) % 1, 12); out.fx.push({ key: `fire${u}|${big}`, cw: 300, ch: 400, draw: (p) => fxFire(p, u * 6, big), x: at[0], y: at[1] + 0.5 * big, z: at[2] + 0.1, w: 0.75 * big, h: 1.0 * big, soft: true }); };
const smoke = (out: Stage, t: number, at: V3, drift: number, dark = false) => { for (let k = 0; k < 4; k++) { const u = q(((t * 0.45 + k * 0.25) % 1), 20); out.fx.push({ key: `smoke${u}|${dark}`, cw: 300, ch: 300, draw: (p) => fxSmoke(p, u, dark), x: at[0] + drift * u * 2.5, y: at[1] + 0.8 + u * (dark ? 1.2 : 3.2), z: at[2], w: 0.9 + u, h: 0.9 + u, soft: true }); } };
const fxOn = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, w: number, h: number, rot = 0, soft = false) => out.fx.push({ key, cw, ch, draw, x: p[0], y: p[1], z: p[2], w, h, rot, soft });

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  pendingSwaps = [];
  {
    const kc = viewCam(id, Math.round(t * FPS)), kp = new THREE.Vector3(...kc.pos), kl = new THREE.Vector3(...kc.look);
    const fw = kl.sub(kp).normalize(), rt = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)).normalize();
    VIEW = { pos: kp, right: rt };
  }
  const C = (p: V3) => add(CAIN_ALT, p), Ab = (p: V3) => add(ABEL_ALT, p);
  const altarTop = (a: V3): V3 => add(a, [0, 1.12, 0]);
  switch (id) {
    case 1: case 10: {
      const cp = C([0.95, 0, 1.2]), ap = Ab([-0.95, 0, 1.2]);
      if (id === 1) {
        who(out, cam, t, 0, CAIN, cp, [-1, 0.6], { expr: cue(t, "neutral", [["killing the other", "stern"]]), front: 0.7 });
        who(out, cam, t, 1, ABEL, ap, [1, 0.6], { expr: cue(t, "smile", [["killing the other", "nervous"]]), front: 0.7 });
        fire(out, t, altarTop(ABEL_ALT)); smoke(out, t, altarTop(CAIN_ALT), 0.6, true);
      } else {
        const cp2 = add(ALT, [-0.9, 0, 1.5]), ap2 = add(ALT, [0.9, 0, 1.5]);
        who(out, cam, t, 0, CAIN, cp2, toCam(cam, cp2), { expr: "stern" }); who(out, cam, t, 1, ABEL, ap2, toCam(cam, ap2), { expr: "smile_closed" });
        const glowU = on(t, "it was the heart") ? 1 : 0;
        fxOn(out, "heartGold", 200, 200, (p) => fxHeart(p, "#f3c234"), add(ap2, [0, 1.25, 0.15]), 0.32 + 0.06 * glowU * Math.sin(t * 6), 0.32 + 0.06 * glowU * Math.sin(t * 6));
        fxOn(out, "heartGrey", 200, 200, (p) => fxHeart(p, "#8a8a92"), add(cp2, [0, 1.25, 0.15]), 0.26, 0.26);
      }
      break;
    }
    case 2: case 11: case 17: {
      // the farmer in his wheat, the shepherd with his flock
      const cp = add(FARM, [0, 0, 0]), ap = add(PAST, [0, 0, 0]);
      const farm = id === 2 ? true : id === 11 && on(t, "cain just brought") && !on(t, "the bible says");
      const past = id === 2 || id === 17 || (id === 11 && !on(t, "cain just brought"));
      if (farm) {
        const k = q(Math.abs(Math.sin(t * 4)), 12);
        who(out, cam, t, 0, CAIN, cp, toCam(cam, cp, 1, [1, 0]), { expr: id === 11 ? "neutral" : "smile", prop: id === 2 ? ["hammer", k] : null, arms: id === 11 ? "open" : undefined });
        if (id === 11) fxOn(out, "crops", 300, 220, fxCrops, add(cp, [0.45, 0.85, 0.2]), 0.4, 0.3);
      }
      if (past) {
        if (id !== 17) who(out, cam, t, 1, ABEL, ap, toCam(cam, ap, 1, [-1, 0]), { expr: "grin", arms: id === 11 ? "open" : undefined });
        flock(out, cam, t, add(PAST, id === 17 ? [0.5, 0, 0.9] : [1.2, 0, -0.4]), id === 17 ? 6 : 9);
        if (id === 11) fxOn(out, "lamb", 260, 220, fxLamb, add(ap, [0, 1.0, 0.2]), 0.55, 0.46);
      }
      if (id === 11 && on(t, "the bible says")) { // Abel at his altar, offered by faith
        const p = Ab([0, 0, 0.9]);
        who(out, cam, t, 1, ABEL, p, toCam(cam, p), { expr: "smile_closed" });
        fire(out, t, altarTop(ABEL_ALT), 1.2); fxOn(out, "glowFaith", 300, 300, (pn) => fxGlow(pn), add(p, [0, 1.4, -0.3]), 2.2, 2.2, 0, true);
      }
      if (id === 17) { const u = (t - T("of sheep")) / 0.8; if (u > 0 && u < 1) fxOn(out, "note", 220, 260, (p) => fxSpark(p, "#ffffff"), add(PAST, [1.0, 1.1 + u * 0.4, -0.5]), 0.2, 0.2); }
      break;
    }
    case 3: {
      const u = climb(t);
      const cp = add(ALT, [-1.5 - 0.4 * u, 0, 9 - 7.4 * u]), ap = add(ALT, [1.5 + 0.4 * u, 0, 9 - 7.4 * u]);
      who(out, cam, t, 0, CAIN, cp, [0.1, -1], { expr: "neutral", mode: u < 1 ? "march" : "stand", phase: (u * 5) % 1, stride: 0.7 });
      who(out, cam, t, 1, ABEL, ap, [-0.1, -1], { expr: "smile", mode: u < 1 ? "march" : "stand", phase: (u * 5 + 0.4) % 1, stride: 0.7 });
      fxOn(out, "crops", 300, 220, fxCrops, add(cp, [0.3, 0.9, 0.1]), 0.36, 0.27);
      fxOn(out, "lamb", 260, 220, fxLamb, add(ap, [-0.3, 1.0, 0.1]), 0.5, 0.42);
      break;
    }
    case 4: case 7: case 8: case 13: {
      const p = C([0.75, 0, 0.6]);
      const ex: Expr = id === 4 ? "neutral" : id === 7 ? cue(t, "neutral", [["and doesnt", "stern"]]) : id === 8 ? "nervous" : cue(t, "pained", [["but god doesnt", "nervous"]]);
      if (id !== 8) who(out, cam, t, 0, CAIN, p, toCam(cam, p, 1, [1, 0]), { expr: ex, arms: id === 4 ? "open" : undefined });
      fxOn(out, "crops", 300, 220, fxCrops, add(altarTop(CAIN_ALT), [0, 0.15, 0.05]), 0.55, 0.4);
      if (id === 7 || id === 13) smoke(out, t, altarTop(CAIN_ALT), 0.9, true);
      if (id === 8) { const u = clamp01((t - T("whats wrong")) / 0.3); fxOn(out, "question", 200, 260, fxQuestion, add(altarTop(CAIN_ALT), [0.25, 0.65, 0.1]), 0.28 * u, 0.36 * u, 0.1 * Math.sin(t * 3)); }
      if (id === 13) {
        if (!on(t, "but god doesnt")) for (let n = 0; n < 2; n++) { const u = q(((t * 1.4 + n * 0.5) % 1), 20); fxOn(out, `steam${u}`, 300, 300, (pn) => fxSmoke(pn, u), add(p, [(n ? 0.25 : -0.25) * (1 + u), 2.05 + 0.4 * u, 0.1]), 0.3 + 0.2 * u, 0.3 + 0.2 * u, 0, true); }
        else fxOn(out, "warm", 300, 300, (pn) => fxGlow(pn), add(p, [0, 2.4, -0.4]), 3.0, 3.0, 0, true);
      }
      break;
    }
    case 5: case 6: {
      const p = Ab([-0.75, 0, 0.6]);
      who(out, cam, t, 1, ABEL, p, toCam(cam, p, 1, [-1, 0]), { expr: id === 6 ? cue(t, "smile", [["and accepts it", "relief"]]) : "smile_closed" });
      if (id === 5 && !on(t, "the best parts")) fxOn(out, "lamb", 260, 220, fxLamb, add(p, [0, 1.0, 0.2]), 0.55, 0.46);
      fire(out, t, altarTop(ABEL_ALT), id === 6 ? 1 + 0.6 * beamOn(id, t) : on(t, "the best parts") ? 1.3 : 0.8);
      if (id === 6) {
        const cp = C([0.55, 0, 0.75]);
        who(out, cam, t, 0, CAIN, cp, toCam(cam, cp, 1, [1, 0]), { expr: "neutral" });
        smoke(out, t, altarTop(CAIN_ALT), 0.9, true);
        if (beamOn(id, t) > 0) for (let k = 0; k < 4; k++) { const a = t * 1.5 + k * 1.57; fxOn(out, "spark", 200, 200, (pn) => fxSpark(pn), add(altarTop(ABEL_ALT), [Math.cos(a) * 0.8, 0.9 + 0.3 * Math.sin(a * 2), Math.sin(a) * 0.3]), 0.12, 0.12); }
      }
      break;
    }
    case 9: {
      const p = add(TAB, [0.9, 0, 1.2]);
      who(out, cam, t, 2, PRIEST, p, toCam(cam, p, 1, [-1.5, 0]), { expr: "smile_closed", arms: "open" });
      fxOn(out, "grainBasket", 300, 220, fxCrops, add(TAB, [-0.2, 1.65, -0.2]), 0.5, 0.36);
      fire(out, t, add(TAB, [0, 1.5, -1.2]), 0.9);
      break;
    }
    case 12: {
      const a = add(KIT, [-0.5, 0, 0.4]), b = add(KIT, [0.5, 0, 0.4]), m = add(KIT, [-1.3, 0, -1.5]);
      who(out, cam, t, 3, KID_A, a, toCam(cam, a, 1, [1, 0]), { expr: "grin", arms: "write", scale: 0.78 });
      who(out, cam, t, 4, KID_B, b, toCam(cam, b, 1, [-1, 0]), { expr: on(t, "the other signs") ? "smile" : "neutral", arms: "write", scale: 0.78 });
      who(out, cam, t, 5, MOM, m, toCam(cam, m, 1, [2, 0]), { expr: on(t, "the other signs") ? "shock" : "smile" });
      fxOn(out, "card", 300, 240, fxCard, add(KIT, [-0.5, 0.86, -0.05]), 0.55, 0.44, -0.08);
      fxOn(out, "receipt", 160, 260, fxReceipt, add(KIT, [0.5, 0.86, -0.05]), 0.2, 0.32, 0.12);
      break;
    }
    case 14: {
      const p = add(HUT, [-1.3, 0, 1.4]);
      who(out, cam, t, 0, CAIN, p, toCam(cam, p, 1, [-1, 0]), { expr: cue(t, "neutral", [["but sin is", "nervous"]]), look: 1 });
      const breathe = 1 + 0.03 * Math.sin(t * 2.5);
      out.places.push({ key: `sin|${q((t * 0.5) % 1, 8)}`, draw: (pn) => fxSin(pn, t), x: HUT[0] + 1.25, y: 0, z: HUT[2] + 0.45, scale: 0.6 * breathe, size: [600, 1000, 1] } as Place);
      break;
    }
    case 15: case 16: case 18: {
      if (id === 15 && !on(t, "and kills him")) {
        const u = duskWalk(t), cp = add(ALT, [-0.5, 0, 22 - u]), ap = add(ALT, [0.6, 0, 22.3 - u]);
        who(out, cam, t, 0, CAIN, cp, [0.05, -1], { expr: "stern", mode: "march", phase: (u / 1.28) % 1, stride: 0.7 });
        who(out, cam, t, 1, ABEL, ap, [0.05, -1], { expr: "smile", mode: "march", phase: (u / 1.28 + 0.4) % 1, stride: 0.7 });
        break;
      }
      if (id !== 18) {
        const p = add(ALT, [-0.5, 0, 13.0]);
        who(out, cam, t, 0, CAIN, p, toCam(cam, p), { expr: id === 15 ? "pained" : cue(t, "nervous", [["cain says", "smile"]]), arms: id === 16 && on(t, "cain says") ? "open" : undefined });
        if (id === 16 && !on(t, "cain says")) fxOn(out, "askGlow", 300, 300, (pn) => fxGlow(pn), add(p, [0, 2.6, -0.2]), 2.2, 2.2, 0, true);
      }
      sheep(out, cam, 3, add(ALT, [1.6, 0, 12.4]), -1, t);
      if (id === 18) { const u = q((t * 0.8) % 1, 20); fxOn(out, `cry${u}`, 400, 400, (pn) => fxCry(pn, u), add(ALT, [0.35, 0.1, 13.3]), 0.9, 0.9); fxOn(out, "ground", 300, 300, (pn) => fxGlow(pn, "255,140,90"), add(ALT, [0.35, 0.08, 13.3]), 0.6, 0.6, 0, true); }
      break;
    }
    case 19: case 20: {
      const p = add(HILLX, [0, 0, 6]);
      const open = id === 20 && on(t, "jesus cries for");
      if (id === 20 && !open) {
        const ap = add(HILLX, [-1.4, 0, 6.6]);
        who(out, cam, t, 1, ABEL, ap, toCam(cam, ap, 1, [1, 0]), { expr: "neutral", front: 0.6 });
      }
      who(out, cam, t, 0, JESUS, p, toCam(cam, p), { expr: open ? "smile_closed" : "smile", arms: open || id === 19 ? "open" : undefined, front: 0.2 });
      fxOn(out, "jesusGlow", 300, 300, (pn) => fxGlow(pn), add(p, [0, 1.4, -0.4]), open ? 3.4 : 2.4, open ? 3.4 : 2.4, 0, true);
      break;
    }
  }
  return out;
};
export { FPS, clamp01, smooth };
