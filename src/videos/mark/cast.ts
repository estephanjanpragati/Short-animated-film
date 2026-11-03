// Our cast as lit flat cards in the 3D world (machinery from the bridge short: canvas pool, lit billboards, contact
// blobs, blinks), staged per shot for "The Quitter Who Wrote a Gospel". Everyone has a facing direction in the world;
// the camera decides front (with a 3/4 turn) or side view, exactly like the bridge's marching column.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxBurst, fxStars, fxContact, fxShadow, fxPuff } from "./toon";
import { PAUL, BARNABAS, MARK, MARK_OLD, SILAS, folk, COACH_A, COACH_B, PLAYER, TEAMMATE, fxStone, fxSteam, fxVein, fxLetter, fxSpark } from "./people";
import {
  FPS, SHOTS, V3, T, W, viewCam, SPOT, COURT, HARB, VILL, PERGA, FIELD, PRISON, STUDY, clamp01, smooth, markRun, markLeave, HITS, DOWN_AT,
  pergaWalk, playerAt, boatPos, coastX,
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
export let LNAME: "day" | "golden" = "day";
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
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
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
  look?: number; mirror?: boolean; roll?: number; swaps?: number[]; scale?: number; front?: number; headTilt?: number; noBlob?: boolean; tilt?: number };
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
  const C = (o: V3, p: V3) => add(o, p);
  switch (s.set) {
    case "court": court(id, t, cam, out); break;
    case "harbour": harbour(id, t, cam, out); break;
    case "village": {
      const pr = C(VILL, SPOT.preach);
      who(out, cam, t, 0, PAUL, pr, toCam(cam, pr), { expr: "grin", arms: "open", front: 0.3, swaps: [T("preaching town")] });
      who(out, cam, t, 1, BARNABAS, C(VILL, SPOT.villBarn), toCam(cam, C(VILL, SPOT.villBarn), 1, [-2, 0]), { expr: "smile" });
      const mk = C(VILL, SPOT.villMark);
      who(out, cam, t, 2, MARK, mk, toCam(cam, mk, 1, [3, 0]), { expr: cue(t, "neutral", [["preaching town", "nervous"]]), look: -1 });
      for (let i = 0; i < 12; i++) {
        const a = -1.1 + (i % 6) * 0.44, r = 3.2 + (i >> 1 & 1) * 1.1 + (i > 5 ? 1.2 : 0);
        const p = C(VILL, [Math.sin(a) * r + (hh(i) - 0.5) * 0.4, 0, -6 + Math.cos(a) * r]);
        who(out, cam, t, 10 + i, folk(i), p, dirTo(p, pr), { expr: (["smile", "neutral", "smile_closed", "shock"] as Expr[])[i % 4], front: 0.75, look: 0 });
      }
      break;
    }
    case "perga": {
      const cuesP: [string, Expr][] = [["big mountain", "shock"], ["goes home", "shock"]];
      if (id === 5) {
        const leave = markLeave(t), turned = on(t, "and mark packs");
        const mk = leave > 0 ? C(PERGA, [SPOT.pergaMark[0] + leave * 1.25, 0, SPOT.pergaMark[2]]) : C(PERGA, SPOT.pergaMark);
        const watching = on(t, "goes home");
        who(out, cam, t, 0, PAUL, C(PERGA, SPOT.pergaPaul), watching ? dirTo(C(PERGA, SPOT.pergaPaul), mk) : [-1, 0.05], { expr: cue(t, "neutral", [["big mountain", "neutral"], ["goes home", "stern"]]), swaps: swapsOf(cuesP) });
        who(out, cam, t, 1, BARNABAS, C(PERGA, SPOT.pergaBarn), watching ? toCam(cam, C(PERGA, SPOT.pergaBarn), 1, [3, 0]) : [-1, 0.05], { expr: cue(t, "smile", [["goes home", "shock"]]) });
        if (leave > 0) who(out, cam, t, 2, MARK, mk, [1, 0.05], { expr: "nervous", mode: "march", phase: (leave / 1.25 * 1.25 / 1.28) % 1, stride: 0.8 });
        else who(out, cam, t, 2, MARK, mk, turned ? toCam(cam, mk) : [-1, 0.05], { expr: cue(t, "neutral", [["big mountain", "shock"], ["and mark packs", "nervous"]]), swaps: swapsOf(cuesP), look: turned ? 1 : 0 });
      } else {
        const x = pergaWalk(t), ph = ((T("paul and barnabas keep") - t) * 1.1 / 1.28) % 1;
        who(out, cam, t, 0, PAUL, C(PERGA, [x, 0, 0]), [-1, 0], { expr: "stern", mode: "march", phase: ((ph % 1) + 1) % 1, stride: 0.8 });
        who(out, cam, t, 1, BARNABAS, C(PERGA, [x + 1.1, 0, 0.35]), [-1, 0], { expr: "nervous", mode: "march", phase: ((ph + 0.3) % 1 + 1) % 1, stride: 0.8 });
      }
      break;
    }
    case "lystra": {
      const pp = C(VILL, SPOT.lystPaul), down = t >= DOWN_AT;
      const hitN = HITS.filter((h) => t >= h).length;
      if (!down) who(out, cam, t, 0, PAUL, pp, toCam(cam, pp), { expr: hitN === 0 ? (t < HITS[0] - 0.6 ? "nervous" : "shock") : "pained", headTilt: hitN ? (hitN % 2 ? 8 : -8) : 0, tilt: hitN * 3, swaps: HITS });
      else {
        // left for dead: the card lies on its side on the paving, head to screen right; stars circle the head
        who(out, cam, t, 0, PAUL, [pp[0] - 0.9, 0.06, pp[2] + 0.4], toCam(cam, pp), { expr: "dazed", roll: -Math.PI / 2, noBlob: true });
        const u = q((t * 0.9) % 1, 30);
        fxAt(out, `stars${u}`, 420, 210, (p) => fxStars(p, u), [pp[0] + 0.95, 0.75, pp[2] + 0.45], 0.7, 0.35);
      }
      who(out, cam, t, 1, BARNABAS, C(VILL, SPOT.lystBarn), down ? dirTo(C(VILL, SPOT.lystBarn), pp) : toCam(cam, C(VILL, SPOT.lystBarn), 1, [-1, 0]), { expr: hitN ? "shock" : "nervous", front: 0.3 });
      for (let i = 0; i < 6; i++) { // the angry crowd at the edges of frame
        const sd = i % 2 ? 1 : -1, p = C(VILL, [sd * (2.2 + (i >> 1) * 0.9), 0, -1.2 + (i >> 1) * 0.9]);
        who(out, cam, t, 20 + i, folk(i + 3), p, dirTo(p, pp), { expr: i % 3 ? "stern" : "pained", arms: i % 3 === 0 ? "point" : undefined, mirror: sd > 0 });
      }
      HITS.forEach((h, k) => { // stones arc in from behind the lens to the head, then bounce off
        const u = (t - (h - 0.32)) / 0.32;
        const from: V3 = C(VILL, [0.9 - 0.9 * k, 2.4, 5.5]), to: V3 = add(pp, [0.02, 1.95, 0.05]);
        if (u >= 0 && u < 1) {
          const p: V3 = [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u + 0.8 * Math.sin(Math.PI * u), from[2] + (to[2] - from[2]) * u];
          fxAt(out, `stone${k}`, 200, 160, (pn) => fxStone(pn, k), p, 0.22, 0.18, u * 6);
        } else if (u >= 1 && u < 3.2) {
          const v = (u - 1) * 0.32;
          fxAt(out, `stone${k}`, 200, 160, (pn) => fxStone(pn, k), [to[0] + (k - 1 || 1) * 1.4 * v, Math.max(0.08, to[1] + 2.2 * v - 4.9 * v * v * 3), to[2] + 0.4 * v], 0.2, 0.16, 2 + v * 9);
          if (u < 1.45) { const b = q((u - 1) / 0.45, 15); fxAt(out, `burst${b}`, 500, 500, (pn) => fxBurst(pn, b), add(to, [0, 0.05, 0.08]), 0.9, 0.9); }
        }
      });
      break;
    }
    case "field": field(id, t, cam, out); break;
    case "coast": {
      const x = coastX(t), ph = (((t - T("paul takes silas")) * 1.15) / 1.28) % 1;
      who(out, cam, t, 0, PAUL, C(HARB, [x, 0, 4.4]), [1, 0], { expr: "smile", mode: "march", phase: ph, stride: 0.8, front: 0.85 });
      who(out, cam, t, 1, SILAS, C(HARB, [x - 1.05, 0, 4.0]), [1, 0], { expr: "grin", mode: "march", phase: (ph + 0.35) % 1, stride: 0.8, front: 0.85 });
      break;
    }
    case "prison": {
      const pp = C(PRISON, SPOT.cellPaul);
      who(out, cam, t, 0, PAUL, pp, toCam(cam, pp), { expr: cue(t, "neutral", [["asks for mark", "smile_closed"], ["useful to me", "smile"]]), mode: "sit", arms: "write" });
      const u = (t - T("by name")) / 1.6;
      if (u > 0 && u < 1) fxAt(out, "letter", 240, 160, fxLetter, add(pp, [0.25 + 0.5 * u, 0.95 + 1.6 * smooth(u), -0.2 - 0.6 * u]), 0.42, 0.28, -0.3 + 0.6 * u);
      break;
    }
    case "study": {
      const mp = C(STUDY, SPOT.deskMark);
      who(out, cam, t, 0, MARK_OLD, mp, toCam(cam, mp), { expr: cue(t, "neutral", [["tradition says", "smile"], ["gospel of mark", "smile_closed"]]), mode: "sit", arms: "write",
        look: on(t, "tradition says") ? 0 : -1, swaps: [T("tradition says"), T("gospel of mark")], noBlob: true });
      break;
    }
  }
  return out;
};

const court = (id: number, t: number, cam: CamInfo, out: Stage) => {
  const C = (p: V3) => add(COURT, p);
  if (id === 1 || id === 14) { // back to back, arms crossed
    const P = C(SPOT.hookPaul), B = C(SPOT.hookBarn), M = C(SPOT.hookMark);
    const e1: [string, Expr][] = [["broke up", "stern"]];
    who(out, cam, t, 0, PAUL, P, [-1, 0.25], { expr: id === 1 ? cue(t, "neutral", e1) : "stern", front: 0.8, swaps: swapsOf(e1) });
    who(out, cam, t, 1, BARNABAS, B, [1, 0.25], { expr: id === 1 ? cue(t, "neutral", e1) : "stern", front: 0.8, swaps: swapsOf(e1) });
    if (id === 1) who(out, cam, t, 2, MARK, M, toCam(cam, M), { expr: cue(t, "smile", [["broke up", "nervous"], ["one guy", "nervous"]]), look: t > T("one guy") ? 0 : LOOKAWAY(t, 2) });
    return;
  }
  if (id === 8) {
    const P = C([-0.6, 0, -2.0]), B = C([0.62, 0, -2.05]);
    who(out, cam, t, 0, PAUL, P, toCam(cam, P), { expr: cue(t, "neutral", [["plan trip", "smile"]]), look: 1 });
    who(out, cam, t, 1, BARNABAS, B, toCam(cam, B), { expr: cue(t, "smile", [["plan trip", "grin"]]), look: -1, arms: "open" });
    return;
  }
  const P = C(SPOT.argPaul), B = C(SPOT.argBarn);
  const toB = dirTo(P, B), toP = dirTo(B, P);
  // argue: cards turn 3/4 toward the lens when they are the subject of the shot
  const pDir: [number, number] = id === 10 || id === 11 ? [toB[0] + 0.9, toB[1] + 1.4] : toB;
  const bDir: [number, number] = id === 9 || id === 11 || id === 12 || id === 13 ? [toP[0] - 0.9, toP[1] + 1.4] : toP;
  let pe: Expr = "neutral", be: Expr = "grin", pArms: FrontOpts["arms"] = undefined, bArms: FrontOpts["arms"] = undefined;
  if (id === 9) { pe = "neutral"; be = "grin"; bArms = "open"; }
  if (id === 10) { pe = cue(t, "stern", [["the guy who deserted", "shock"], ["absolutely not", "stern"]]); be = "smile"; pArms = on(t, "absolutely not") ? "cross" : undefined; }
  if (id === 11) { pe = cue(t, "stern", [["sharp disagreement", "pained"], ["paroxysmos", "shock"], ["paroxysm", "pained"]]); be = cue(t, "stern", [["sharp disagreement", "pained"], ["where english", "shock"]]); pArms = "point"; bArms = "point"; }
  if (id === 12) { pe = "stern"; be = "relief"; }
  if (id === 13) { pe = "stern"; be = "pained"; bArms = "point"; }
  const sw = [...pendingSwaps, T("sharp disagreement"), T("paroxysmos"), T("absolutely not")];
  who(out, cam, t, 0, PAUL, P, pDir, { expr: pe, arms: pArms, front: id === 10 || id === 11 ? 0.3 : 0.55, swaps: sw, headTilt: id === 11 ? 6 : 0 });
  who(out, cam, t, 1, BARNABAS, B, bDir, { expr: be, arms: bArms, front: id === 9 || id >= 11 ? 0.3 : 0.55, swaps: sw, mirror: bArms === "point" });
  if (id === 9) { // Mark waits in the background, waving on "take Mark"
    const M = C(SPOT.argMark), waving = on(t, "lets take mark");
    who(out, cam, t, 2, MARK, M, toCam(cam, M), { expr: waving ? "grin" : "smile", wave: waving ? q(Math.sin(t * 10), 20) : undefined, swaps: [W("lets take mark") / FPS] });
  }
  if (id === 11 || id === 13) {
    steam(out, t, add(B, [0, 1.95, 0]), 1);
    if (id === 11) steam(out, t, add(P, [0, 1.9, 0]), 2);
    const vu = id === 11 ? P : B;
    fxAt(out, "vein", 200, 200, fxVein, add(vu, [0.2, 2.05, 0.15]), 0.2, 0.2);
  }
  if (id === 12) sparkles(out, t, add(B, [0, 1.75, 0.1]));
};

const harbour = (id: number, t: number, cam: CamInfo, out: Stage) => {
  const C = (p: V3) => add(HARB, p);
  if (id === 2 || id === 3) {
    const deckP = C(SPOT.deckPaul), deckB = C(SPOT.deckBarn);
    const waving = id === 2 && on(t, "setting sail");
    who(out, cam, t, 0, PAUL, deckP, toCam(cam, deckP), { expr: id === 2 ? cue(t, "smile", [["setting sail", "grin"]]) : "smile", wave: waving ? q(Math.sin(t * 9), 20) : undefined });
    if (id === 2) who(out, cam, t, 1, BARNABAS, deckB, toCam(cam, deckB), { expr: cue(t, "grin", [["setting sail", "laugh"]]), arms: "open" });
    else {
      const qb = C(SPOT.quayBarn), arrived = markRun(t) >= 1;
      who(out, cam, t, 1, BARNABAS, qb, arrived ? toCam(cam, qb, 1, [-3, 0]) : [-1, 0.3], { expr: arrived ? "grin" : "smile", arms: "open", front: 0.3 });
      const x = SPOT.quayMark0[0] + (SPOT.quayMark1[0] - SPOT.quayMark0[0]) * markRun(t), mk = C([x, 0, SPOT.quayMark1[2]]);
      if (!arrived) who(out, cam, t, 2, MARK, mk, [1, 0], { expr: "grin", mode: "march", phase: ((x - SPOT.quayMark0[0]) / 2.6) % 1, stride: 1.4 });
      else who(out, cam, t, 2, MARK, mk, toCam(cam, mk, 1, [2, 0]), { expr: cue(t, "grin", [["john mark", "laugh"]]), look: 1 });
    }
    for (let i = 0; i < 4; i++) { // well-wishers on the quay
      const p = C([3.2 + i * 1.3, 0, 2.6 + (i % 2) * 0.8]);
      who(out, cam, t, 30 + i, folk(i + 6), p, toCam(cam, p, 1, [-2, -6]), { expr: (["smile", "grin"] as Expr[])[i % 2], wave: id === 2 && i % 2 === 0 ? q(Math.sin(t * 8 + i), 20) : undefined });
    }
    return;
  }
  // 18-19: Barnabas and Mark sail for Cyprus; 18 also shows Paul and Silas setting off along the coast road
  const b = boatPos(t), deckB: V3 = C([b[0] - 1.9, b[1] + 1.25, b[2] + 0.1]), deckM: V3 = C([b[0] - 0.7, b[1] + 1.25, b[2] - 0.15]);
  who(out, cam, t, 1, BARNABAS, deckB, toCam(cam, deckB), { expr: "grin", arms: id === 19 ? "open" : undefined, noBlob: true });
  who(out, cam, t, 2, MARK, deckM, toCam(cam, deckM), { expr: id === 19 ? cue(t, "grin", [["back to cyprus", "laugh"]]) : "grin", wave: q(Math.sin(t * 9), 20), noBlob: true });
  if (id === 18) {
    const x = 14 + 1.15 * Math.max(0, t - T("so instead")), ph = (((t - T("so instead")) * 1.15) / 1.28) % 1;
    who(out, cam, t, 0, PAUL, C([x, 0, 4.4]), [1, 0], { expr: "smile", mode: "march", phase: ph, stride: 0.8 });
    who(out, cam, t, 3, SILAS, C([x - 1.05, 0, 4.0]), [1, 0], { expr: "grin", mode: "march", phase: (ph + 0.35) % 1, stride: 0.8 });
  }
};

const field = (id: number, t: number, cam: CamInfo, out: Stage) => {
  const C = (p: V3) => add(FIELD, p);
  const A = C(SPOT.coachA), B = C(SPOT.coachB);
  who(out, cam, t, 0, COACH_A, A, id === 16 ? toCam(cam, A) : [1, 0.3], { expr: cue(t, "neutral", [["walked off", "stern"], ["cant carry", "stern"]]), arms: "cross", front: 0.3 });
  who(out, cam, t, 1, COACH_B, B, id === 17 ? toCam(cam, B) : [1, -0.2], { expr: cue(t, "neutral", [["walked off", "nervous"], ["the other says", "smile"], ["second chance", "relief"]]), arms: id === 17 ? "open" : undefined, front: 0.3 });
  const x = playerAt(t), walking = t > T("walked off") - LEAD && t < T("walked off") + 2.2;
  const pp = C([x, 0, SPOT.player0[2] + (x - SPOT.player0[0]) * -0.04]);
  if (walking) who(out, cam, t, 2, PLAYER, pp, [-1, 0.04], { expr: "pained", mode: "march", phase: ((x - SPOT.player0[0]) / -1.0) % 1, stride: 0.6, scale: 0.75 });
  else who(out, cam, t, 2, PLAYER, pp, id === 17 ? toCam(cam, pp) : [1, -0.4], { expr: cue(t, "neutral", [["walked off", "pained"], ["never comes back", "nervous"]]), scale: 0.75, look: id === 17 ? -1 : 0 });
  for (let i = 0; i < 6; i++) { // teammates still playing
    const p = C([-1 + (i % 3) * 2.6 + Math.sin(t * 1.5 + i) * 0.5, 0, 5 + (i >> 1) * 2.4 + Math.cos(t * 1.2 + i) * 0.4]);
    const hop = Math.max(0, Math.sin(t * 6 + i * 1.7)) * 0.08;
    who(out, cam, t, 10 + i, TEAMMATE(i), [p[0], hop, p[2]], [Math.sin(i * 2.1), Math.cos(i * 1.3)], { expr: (["grin", "smile", "shock"] as Expr[])[i % 3], scale: 0.75, mode: "march", phase: (t * 1.6 + i * 0.3) % 1, stride: 0.5 });
  }
  const bu = (t * 0.7) % 1; // the ball
  fxAt(out, "ball", 200, 200, (p) => { p.ell(100, 100, 80, 80, "#ffffff", 9); p.poly([[100, 70], [128, 90], [118, 124], [82, 124], [72, 90]], "#241726", 0); }, C([1.5 + 2.5 * Math.sin(bu * 6.28), 0.12 + 0.6 * Math.abs(Math.sin(bu * 9.4)), 7.5]), 0.24, 0.24, bu * 12);
};
export { FPS, clamp01, fxPuff, fxContact, fxShadow, MARK };
