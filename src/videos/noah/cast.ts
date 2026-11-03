// Our cast as lit flat cards in the 3D world (machinery from the bridge short: canvas pool, lit billboards, contact
// blobs, blinks), staged per shot for "The Quitter Who Wrote a Gospel". Everyone has a facing direction in the world;
// the camera decides front (with a 3/4 turn) or side view, exactly like the bridge's marching column.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxBurst, fxStars, fxContact, fxShadow, fxPuff } from "./toon";
import { folk, fxSpark, NOAH, NOAH_WIFE, SON, JESUS, FRIEND, SITTER, drawBeast, Beast, fxLantern, fxRain, fxKnock, fxGlow, fxFeast } from "./people";
import {
  FPS, SHOTS, V3, T, W, viewCam, ARK, HILL, FEAST, COT, JDOOR, ROOM, DOOR_X, DOOR_Z, DOOR_Y, DOOR_W, DOOR_H, doorShut, waterY, animalWalk, familyWalk, KNOCKS, hillY, clamp01, smooth,
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
/** an animal card (lit like the cast), walking along (dx, dz) in world space */
const beast = (out: Stage, cam: CamInfo, i: number, kind: Beast, p: V3, dx: number, phase: number, scale: number) => {
  const d = cam.pos.distanceTo(tmp.set(p[0], p[1] + 1, p[2])) / scale, [w, h, k] = tier(d), ph = q(phase % 1, 12);
  const mirror = dx * (VIEW ?? cam).right.x < 0;
  out.places.push({ key: `beast|${kind}|${ph}|${i % 2}`, draw: (pn) => drawBeast(pn, kind, ph), x: p[0], y: p[1], z: p[2], scale, mirror, size: [w, h, k] });
  blob(out, p[0], p[1], p[2], scale * 1.4);
};
const rain = (out: Stage, cam: CamInfo, t: number, n = 46, heavy = 1) => {
  const r = cam.right, fw = new THREE.Vector3(r.z, 0, -r.x); // camera forward on the ground plane
  for (let i = 0; i < n; i++) {
    const dist = 2 + hh(i, 1) * 9, side = (hh(i, 2) - 0.5) * dist * 1.1, fall = (t * 9 * heavy + hh(i, 3) * 6) % 6;
    const x = cam.pos.x + fw.x * dist + r.x * side, z = cam.pos.z + fw.z * dist + r.z * side, y = cam.pos.y + 3 - fall;
    out.fx.push({ key: "rain", cw: 40, ch: 300, draw: fxRain, x, y, z, w: 0.03 * (1 + dist * 0.08), h: 0.55 + dist * 0.04, soft: true, rot: 0.12 });
  }
};
const knocks = (out: Stage, t: number, at: V3) => KNOCKS.forEach((k, n) => {
  const u = (t - k) / 0.35;
  if (u >= 0 && u < 1) { const v = q(u, 12); out.fx.push({ key: `knock${v}`, cw: 300, ch: 300, draw: (p) => fxKnock(p, v), x: at[0] + (n % 2 ? 0.1 : -0.05), y: at[1], z: at[2], w: 0.5, h: 0.5 }); }
});
const glow = (out: Stage, p: V3, w: number, h: number, col?: string) => out.fx.push({ key: `glow${col ?? ""}`, cw: 300, ch: 300, draw: (pn) => fxGlow(pn, col), x: p[0], y: p[1], z: p[2], w, h, soft: true });
const BEASTS: [Beast, number][] = [["elephant", 1.5], ["giraffe", 1.9], ["zebra", 1.05], ["lion", 0.9], ["camel", 1.45], ["sheep", 0.6]];
const NEIGH = [0, 1, 2, 3, 4, 5, 6].map((v) => folk(v + 2));
const hillSpot = (i: number): V3 => { const x = HILL[0] + 1.2 - (i % 4) * 1.1 + (hh(i, 4) - 0.5) * 0.4, z = HILL[2] - 1.2 + (i >> 2) * 1.2 + (hh(i, 5) - 0.5) * 0.3; return [x, hillY(x, z), z]; };

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
  const A = (p: V3) => add(ARK, p);
  const door: V3 = A([DOOR_X, DOOR_Y + 0.1, DOOR_Z + 0.4]);
  switch (id) {
    case 1: {
      const p = A([DOOR_X + 2.4, 0, 14]);
      who(out, cam, t, 0, NOAH, p, toCam(cam, p), { expr: cue(t, "smile", [["closed it", "smile_closed"]]), wave: q(Math.sin(t * 7), 20) });
      break;
    }
    case 2: {
      const p = A([-10, 3.55, 7.7]), k = q(Math.abs(Math.sin(t * 5.5)), 12);
      who(out, cam, t, 0, NOAH, p, toCam(cam, p, 1, [-2, 0]), { expr: cue(t, "stern", [["longer than", "grin"]]), prop: ["hammer", k] });
      break;
    }
    case 3: case 4: case 10: {
      if (id === 4 && !on(t, "they keep laughing")) {
        const p = A([4.4, 0, 12.5]);
        who(out, cam, t, 0, NOAH, p, toCam(cam, p), { expr: "stern", arms: "open" });
        for (let i = 0; i < 3; i++) { const h = hillSpot(i); who(out, cam, t, 10 + i, NEIGH[i], h, dirTo(h, p), { expr: "laugh" }); }
        break;
      }
      const wet = id === 10;
      for (let i = 0; i < 7; i++) {
        const h = hillSpot(i), target = id === 3 ? A([-10, 3, 7]) : cam.pos.toArray() as V3;
        const ex: Expr = wet ? (["shock", "nervous", "pained"] as Expr[])[i % 3] : (["laugh", "grin", "laugh", "smile"] as Expr[])[i % 4];
        who(out, cam, t, 10 + i, NEIGH[i], h, id === 3 ? dirTo(h, target) : toCam(cam, h, 1, [(i - 3) * 0.6, 0]), { expr: ex, arms: !wet && i % 3 === 0 ? "point" : undefined, mirror: !wet && i % 3 === 0 && h[0] > HILL[0] });
      }
      if (wet) rain(out, cam, t, 50, 1.2);
      break;
    }
    case 5: {
      if (on(t, "on their own")) { for (let i = 0; i < 6; i++) { const h = hillSpot(i); who(out, cam, t, 10 + i, NEIGH[i], h, toCam(cam, h, 1, [(i - 3) * 0.6, 0]), { expr: "shock" }); } break; }
      const s0 = animalWalk(t);
      BEASTS.forEach(([kind, sc], k) => {
        const sk = s0 - k * 3.4;
        for (const side of [-0.85, 0.85]) {
          let p: V3, dx = -1;
          if (sk < 14.5) p = A([22 - Math.max(-12, sk), 0, 13.6 + side]);
          else { const u = clamp01((sk - 14.5) / 7); p = A([DOOR_X + side * 0.45, DOOR_Y * u, 13.2 - 7 * u]); dx = 0.2; }
          if (sk > 21.5) continue;
          beast(out, cam, k * 2 + (side > 0 ? 1 : 0), kind, p, dx, sk / 2.4 + (side > 0 ? 0.5 : 0), sc);
        }
      });
      break;
    }
    case 6: {
      const F = (p: V3) => add(FEAST, p);
      for (let i = 0; i < 6; i++) {
        const p = F([-2.4 + i * 0.95, 0, 0.4 + (i % 2) * 0.25]);
        who(out, cam, t, 20 + i, NEIGH[i % 7], p, toCam(cam, p, 1, [(i - 2.5) * 0.5, 0]), { expr: (["laugh", "grin", "smile_closed", "laugh", "grin", "smile"] as Expr[])[i], wave: i % 3 === 1 ? q(Math.sin(t * 8 + i), 20) : undefined });
      }
      out.fx.push({ key: "feast", cw: 400, ch: 200, draw: fxFeast, x: FEAST[0], y: 0.95, z: FEAST[2] - 0.6, w: 1.6, h: 0.8 });
      const bride = { ...folk(5), dress: "#f4f1ea", jacket: "#f4f1ea", hat: "wrap", cap: "#f4f1ea" } as Outfit, groom = folk(1);
      const hop = Math.max(0, Math.sin(t * 7)) * 0.08;
      who(out, cam, t, 30, bride, F([4.6, hop, 2.0]), toCam(cam, F([4.6, 0, 2]), 1, [1, 0]), { expr: "relief_open" });
      who(out, cam, t, 31, groom, F([5.5, Math.max(0, Math.sin(t * 7 + 1.5)) * 0.08, 2.0]), toCam(cam, F([5.5, 0, 2]), 1, [-1, 0]), { expr: "laugh" });
      break;
    }
    case 7: case 11: {
      const shut = doorShut(id, t), fam = [NOAH, NOAH_WIFE, SON(0), SON(1), SON(2)];
      if (id === 7) fam.forEach((o, n) => {
        const u = clamp01(familyWalk(t) * 1.6 - n * 0.15);
        if (u >= 1) return;
        const p = A([DOOR_X + (n % 2 ? 0.45 : -0.45), DOOR_Y * u, 13.0 - 6.6 * u]);
        who(out, cam, t, n, o, p, [0.05, -1], { expr: n === 0 ? "smile" : "neutral", mode: "march", phase: (u * 6 + n * 0.3) % 1, stride: 0.6, scale: n > 1 ? 0.95 : 1 });
      });
      if (id === 7 && shut > 0.05 && shut < 1) glow(out, add(door, [0, 1.4, 0.3]), 3.5 * shut, 4.5 * shut);
      if (id === 7 && on(t, "the lord shut")) { const u = (t - T("the lord shut") - 0.9) / 0.6; if (u > 0 && u < 1) glow(out, add(door, [0, 1.8, 0.5]), 5 * (1 - u), 6 * (1 - u)); }
      if (id === 11) {
        glow(out, add(door, [0, 1.8, 0.05]), 3.2, 4.4);
        const p = A([DOOR_X, DOOR_Y, DOOR_Z + 0.9]);
        who(out, cam, t, 0, NOAH, p, toCam(cam, p), { expr: "smile", arms: "open", noBlob: true });
        const x = 22 - (t - T("you see for years")) * 1.3, np = A([x, 0, 15]);
        who(out, cam, t, 40, NEIGH[2], np, [-1, 0], { expr: "smile", mode: "march", phase: (x / 1.28) % 1, stride: 0.8 });
      }
      break;
    }
    case 8: {
      const u = clamp01((t - SHOTS[7].a / FPS) / 0.6);
      for (const [dx, dy, w, h] of [[-DOOR_W / 2 - 0.2, DOOR_H / 2, 0.9, DOOR_H + 0.8], [DOOR_W / 2 + 0.2, DOOR_H / 2, 0.9, DOOR_H + 0.8], [0, DOOR_H + 0.25, DOOR_W + 1, 0.9]] as const)
        glow(out, A([DOOR_X + dx, DOOR_Y + dy, DOOR_Z + 0.35]), w * u, h);
      break;
    }
    case 9: rain(out, cam, t, 60, 1.4); break;
    case 12: {
      if (!on(t, "but the handle")) {
        const p = add(COT, [0.35, 0, 0.95]);
        who(out, cam, t, 0, FRIEND, p, [-1, -0.25], { expr: "smile", front: 0.9 });
        knocks(out, t, add(COT, [0.05, 1.45, 0.25]));
        rain(out, cam, t, 50, 1);
      } else {
        const p = add(ROOM, [-1.9, 0.5, -1.2]);
        who(out, cam, t, 1, SITTER, p, toCam(cam, p, 1, [2, -2]), { expr: "neutral", mode: "sit", noBlob: true, look: 1 });
        knocks(out, t, add(ROOM, [0, 1.5, -2.85]));
      }
      break;
    }
    case 13: case 15: {
      const p = add(JDOOR, [0.75, 0, 1.0]);
      const knocking = id === 13 && !on(t, "if anyone hears");
      who(out, cam, t, 0, JESUS, p, knocking ? [-1, 0.6] : toCam(cam, p, 1, [-0.6, 0]), { expr: id === 15 ? cue(t, "smile", [["on purpose", "smile_closed"]]) : knocking ? "neutral" : "smile", arms: knocking ? "point" : undefined, mirror: knocking, front: 0.2 });
      out.fx.push({ key: "lantern", cw: 300, ch: 300, draw: fxLantern, x: p[0] + 0.42, y: 0.95, z: p[2] + 0.12, w: 0.75, h: 0.75, soft: true });
      if (id === 13) knocks(out, t, add(JDOOR, [-0.05, 1.45, 0.25]));
      break;
    }
    case 14: {
      out.fx.push({ key: "lantern", cw: 300, ch: 300, draw: fxLantern, x: JDOOR[0] + 1.17, y: 0.95, z: JDOOR[2] + 1.12, w: 0.75, h: 0.75, soft: true });
      break;
    }
    case 16: {
      const p = add(ROOM, [-1.9, 0.5, -1.2]);
      who(out, cam, t, 1, SITTER, p, toCam(cam, p, 1, [3, -2]), { expr: cue(t, "neutral", [["this one", "smile"]]), mode: "sit", noBlob: true, look: 1 });
      glow(out, add(ROOM, [0, 0.12, -2.88]), 1.6, 0.35);
      break;
    }
  }
  return out;
};
export { FPS, clamp01, smooth };
