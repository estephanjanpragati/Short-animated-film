// The world of "Only One Handle" (Noah): one three.js scene holding every set at its own origin (story.ts),
// posed per frame. Sky, camera-relative frozen sun, two-tone materials, painted HD textures, river/sea shader and the
// cast machinery come from the bridge short; the sets are new: a Mediterranean harbour with a sailing boat, flat-roofed
// whitewashed towns, the road into the Taurus mountains at Perga, a football pitch, a prison cell and a scribe's room.
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, boxGeo, V, lam, quad, tri, prop, setSight, blocked, Ray } from "./build";
import { rep, ctex, rng, stoneHD, cobbleHD, grassHD, waterNear, waterFar, cloudHD, facadeHD, beamHD, planksHD } from "./paint";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, camAt, V3, ARK, HILL, FEAST, COT, JDOOR, ROOM, DOOR_X, DOOR_Z, DOOR_Y, DOOR_W, DOOR_H, doorShut, waterY, arkLift, T } from "./story";

type Mats = Record<string, THREE.Material>;
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

// ---------------- painted textures for this story ----------------
const U = (r: () => number, a: number, b: number) => a + (b - a) * r();
const hash = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const blot = (g: CanvasRenderingContext2D, x: number, y: number, rad: number, col: string, a: number) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
};
/** dusty packed earth with pebbles and dry tufts */
const dustHD = () => ctex("dustHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#d9bf8c"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) blot(g, U(r, 0, 1024), U(r, 0, 1024), U(r, 40, 160), r() > 0.5 ? "255,240,210" : "150,110,70", U(r, 0.06, 0.12));
  for (let i = 0; i < 260; i++) { g.fillStyle = r() > 0.5 ? "rgba(120,95,70,0.45)" : "rgba(250,240,220,0.5)"; g.beginPath(); g.ellipse(U(r, 0, 1024), U(r, 0, 1024), U(r, 2, 6), U(r, 1.5, 4), r() * 3, 0, 7); g.fill(); }
});
/** mountain rock: sage scrub over warm stone, horizontal strata */
const rockHD = () => ctex("rockHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#a88a6a"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 24) { g.fillStyle = `rgba(${r() > 0.5 ? "120,95,80" : "235,220,195"},${U(r, 0.06, 0.16)})`; g.fillRect(0, y + U(r, -6, 6), 1024, U(r, 6, 16)); }
  for (let i = 0; i < 160; i++) blot(g, U(r, 0, 1024), U(r, 0, 1024), U(r, 20, 70), "92,128,64", U(r, 0.45, 0.75));
});
/** football pitch: mown stripes + white lines (36 x 24 m image) */
const pitchHD = () => ctex("pitchHD", 1536, 1024, (g, r) => {
  for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? "#5f9a48" : "#548e40"; g.fillRect(i * 128, 0, 128, 1024); }
  for (let i = 0; i < 90; i++) blot(g, U(r, 0, 1536), U(r, 0, 1024), U(r, 20, 80), r() > 0.5 ? "255,255,220" : "40,80,30", 0.06);
  g.strokeStyle = "#f4f1ea"; g.lineWidth = 9;
  g.strokeRect(60, 60, 1416, 904); g.beginPath(); g.moveTo(768, 60); g.lineTo(768, 964); g.stroke();
  g.beginPath(); g.arc(768, 512, 120, 0, 7); g.stroke();
  g.strokeRect(60, 300, 200, 424); g.strokeRect(1276, 300, 200, 424);
});
/** a sea chart for the planning table */
const mapTex = () => ctex("seaMap", 1024, 640, (g, r) => {
  g.fillStyle = "#efe0bd"; g.fillRect(0, 0, 1024, 640);
  for (let i = 0; i < 30; i++) blot(g, U(r, 0, 1024), U(r, 0, 640), U(r, 40, 120), "160,120,70", 0.08);
  g.fillStyle = "#a9c3c9"; g.fillRect(40, 300, 940, 300);
  g.fillStyle = "#d8c08a"; g.strokeStyle = "#5a3b2a"; g.lineWidth = 6;
  const blob = (pts: number[][]) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.stroke(); };
  blob([[40, 40], [980, 40], [980, 330], [820, 300], [700, 360], [560, 310], [430, 340], [260, 300], [120, 350], [40, 320]]); // Asia Minor coast
  blob([[300, 440], [420, 410], [520, 430], [470, 470], [360, 480]]); // Cyprus
  g.setLineDash([16, 12]); g.strokeStyle = "#c8323a"; g.lineWidth = 7;
  g.beginPath(); g.moveTo(860, 420); g.quadraticCurveTo(640, 470, 470, 440); g.quadraticCurveTo(420, 380, 380, 320); g.stroke();
  g.setLineDash([]); g.fillStyle = "#c8323a"; g.beginPath(); g.arc(860, 420, 12, 0, 7); g.fill();
});
/** a high barred window, lit sky beyond (unlit card) */
const skyWinTex = (key: string, golden: boolean) => ctex(key, 256, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, golden ? "#ffd08a" : "#9cc4f0"); gr.addColorStop(1, golden ? "#ffe7c2" : "#d9ebff");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const strawTex = () => ctex("straw", 512, 512, (g, r) => {
  g.fillStyle = "#c9a35e"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.strokeStyle = r() > 0.5 ? "rgba(240,210,140,0.7)" : "rgba(130,95,50,0.5)"; g.lineWidth = U(r, 1.5, 3); const x = U(r, 0, 512), y = U(r, 0, 512), a = U(r, 0, 3.14); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26 * Math.cos(a), y + 26 * Math.sin(a)); g.stroke(); }
});
const sailTex = () => ctex("sail", 512, 512, (g, r) => {
  g.fillStyle = "#f1e6cc"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "rgba(150,120,90,0.18)"; g.fillRect(x, 0, 4, 512); }
  for (let i = 0; i < 20; i++) blot(g, U(r, 0, 512), U(r, 0, 512), U(r, 30, 90), "190,150,110", 0.1);
  g.fillStyle = "#c8573a"; g.fillRect(0, 210, 512, 60);
});
const scrollsTex = () => ctex("scrollShelf", 512, 256, (g, r) => {
  g.fillStyle = "#6a4630"; g.fillRect(0, 0, 512, 256);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 11; i++) {
    const x = 26 + i * 44 + U(r, -4, 4), y = 64 + row * 120;
    g.fillStyle = ["#efe0bd", "#e6d2a6", "#f4ead2"][i % 3]; g.strokeStyle = "#3a2618"; g.lineWidth = 4;
    g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke();
  }
});

/** ancient whitewashed facade: lime wash with blotches, a darker plinth band, small deep window openings with timber
 *  lintels (some with plank shutters), an arched door with a plank door on the front */
const ancientFacade = (key: string, wm: number, hm: number, o: { wall: string; shutter: string; door?: boolean }) => {
  const PX = Math.min(64, 2048 / Math.max(wm, hm)), W = Math.round(wm * PX), H = Math.round(hm * PX), m = (v: number) => v * PX;
  return ctex("anc" + key, W, H, (g, r) => {
    g.fillStyle = o.wall; g.fillRect(0, 0, W, H);
    for (let i = 0; i < Math.round((wm * hm) / 2) + 8; i++) blot(g, U(r, 0, W), U(r, 0, H), m(U(r, 0.4, 1.6)), r() > 0.5 ? "255,255,255" : "130,100,70", r() > 0.5 ? 0.1 : 0.07);
    const gr = g.createLinearGradient(0, H - m(1.2), 0, H); gr.addColorStop(0, "rgba(150,115,80,0)"); gr.addColorStop(1, "rgba(150,115,80,0.35)");
    g.fillStyle = gr; g.fillRect(0, H - m(1.2), W, m(1.2));
    for (let i = 0; i < 5; i++) { // flaking patches showing stone
      const x = U(r, 0, W), y = U(r, H * 0.3, H * 0.9), w = m(U(r, 0.3, 0.8)), h = m(U(r, 0.15, 0.35));
      g.fillStyle = "rgba(190,160,120,0.45)"; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill();
      g.strokeStyle = "rgba(150,120,90,0.5)"; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - w * 0.7, y - h * 0.3 + k * h * 0.35); g.lineTo(x + w * 0.7, y - h * 0.3 + k * h * 0.35); g.stroke(); }
    }
    const floors = Math.max(1, Math.floor(hm / 3)), nWin = Math.max(1, Math.floor(wm / 3));
    const ink = "#3a2a24";
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < nWin; i++) {
      const cx = ((i + 0.5) / nWin) * W, door = !!o.door && fl === 0 && i === Math.floor(nWin / 2);
      if (door) {
        const dw = m(1.3), dh = m(2.3), x0 = cx - dw / 2, y1 = H - m(0.05);
        g.fillStyle = "#5a3a28"; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y1 - dh + dw / 2); g.arc(cx, y1 - dh + dw / 2, dw / 2, Math.PI, 0); g.lineTo(x0 + dw, y1); g.closePath(); g.fill();
        g.strokeStyle = ink; g.lineWidth = m(0.06); g.stroke();
        g.strokeStyle = "rgba(40,25,18,0.6)"; g.lineWidth = m(0.03); for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x0 + (dw * k) / 5, y1); g.lineTo(x0 + (dw * k) / 5, y1 - dh + dw / 2 - m(0.1)); g.stroke(); }
        g.fillStyle = "#c9b08a"; g.beginPath(); g.arc(cx, y1 - dh + dw / 2, dw / 2 + m(0.12), Math.PI, 0); g.arc(cx, y1 - dh + dw / 2, dw / 2, 0, Math.PI, true); g.fill();
        continue;
      }
      const ww = m(0.7), wh = m(0.8), wx = cx - ww / 2, wy = H - (fl * 3 + 1.4) * PX - wh;
      g.fillStyle = "#2a1e1c"; g.fillRect(wx, wy, ww, wh);
      g.fillStyle = "rgba(255,230,190,0.08)"; g.fillRect(wx, wy + wh * 0.6, ww, wh * 0.4);
      g.strokeStyle = ink; g.lineWidth = m(0.05); g.strokeRect(wx, wy, ww, wh);
      g.fillStyle = "#7a5236"; g.fillRect(wx - m(0.15), wy - m(0.16), ww + m(0.3), m(0.14)); g.strokeRect(wx - m(0.15), wy - m(0.16), ww + m(0.3), m(0.14));
      if (r() < 0.45) { // one plank shutter swung open
        const sx = r() < 0.5 ? wx - ww * 0.55 : wx + ww + m(0.04);
        g.fillStyle = o.shutter; g.fillRect(sx, wy, ww * 0.5, wh); g.strokeRect(sx, wy, ww * 0.5, wh);
        g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = m(0.02); for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(sx + (ww * 0.5 * k) / 3, wy); g.lineTo(sx + (ww * 0.5 * k) / 3, wy + wh); g.stroke(); }
      }
    }
  });
};

const awningTex = (k: number) => ctex("awning" + k, 256, 128, (g) => {
  const c = [["#c8323a", "#f4ead2"], ["#2f6aa8", "#f4ead2"], ["#e0a030", "#8a3b2a"]][k];
  for (let i = 0; i < 8; i++) { g.fillStyle = c[i % 2]; g.fillRect(i * 32, 0, 32, 128); }
});
// ---------------- geometry helpers ----------------
const flatQuad = (x0: number, x1: number, z0: number, z1: number, y: number, tile: number) =>
  quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), (x1 - x0) / tile, (z1 - z0) / tile);
const UB = new THREE.BoxGeometry(1, 1, 1);
const box = (b: Batch, mat: THREE.Material, c: V3, s: V3, yaw = 0) =>
  b.add(UB, mat, new THREE.Matrix4().compose(V(...c), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(...s)));
const cyl = (b: Batch, mat: THREE.Material, c: V3, r0: number, r1: number, h: number, seg = 12) =>
  b.add(new THREE.CylinderGeometry(r1, r0, h, seg).translate(0, h / 2, 0), mat, new THREE.Matrix4().makeTranslation(...c));

const WALLS = [
  { wall: "#efe6d4", shutter: "#3f6fb5" }, { wall: "#e6cfa4", shutter: "#2f6a5a" }, { wall: "#d9b07c", shutter: "#8c3b4a" },
  { wall: "#f2ece0", shutter: "#3a7fa0" }, { wall: "#e2bfa0", shutter: "#5a7a3a" },
];
/** whitewashed flat-roofed house: painted facades, parapet with coping, projecting roof beams; front faces local +z */
const flatHouse = (b: Batch, x: number, z: number, yaw: number, w: number, d: number, h: number, si: number) => {
  const across = Math.abs(Math.sin(yaw)) > 0.5, hx = (across ? d : w) / 2 + 0.4, hz = (across ? w : d) / 2 + 0.4;
  if (blocked(x - hx, x + hx, 0, h + 0.8, z - hz, z + hz)) return;
  const st = WALLS[si % WALLS.length], m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
  const front = lam(`mf${si}_${w}_${h}`, () => ({ map: ancientFacade(`mf${si}_${w}_${h}`, w, h, { ...st, door: true }) }));
  const side = lam(`ms${si}_${d}_${h}`, () => ({ map: ancientFacade(`ms${si}_${d}_${h}`, d, h, st) }));
  const plain = lam("mw" + st.wall, () => ({ color: st.wall }));
  const hw = w / 2, hd = d / 2;
  b.add(quad(V(-hw, 0, hd), V(hw, 0, hd), V(hw, h, hd), V(-hw, h, hd)), front, m);
  b.add(quad(V(hw, 0, -hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(hw, h, -hd)), side, m);
  b.add(quad(V(-hw, 0, -hd), V(-hw, 0, hd), V(-hw, h, hd), V(-hw, h, -hd)), side, m);
  b.add(quad(V(hw, 0, hd), V(hw, 0, -hd), V(hw, h, -hd), V(hw, h, hd)), side, m);
  b.add(boxGeo(V(-hw, h - 0.01, -hd), V(hw, h + 0.05, hd)), plain, m);
  const cope = lam("cope", () => ({ color: "#f4efe4" }));
  for (const [x0, x1, z0, z1] of [[-hw - 0.08, hw + 0.08, hd - 0.25, hd + 0.08], [-hw - 0.08, hw + 0.08, -hd - 0.08, -hd + 0.25], [-hw - 0.08, -hw + 0.25, -hd, hd], [hw - 0.25, hw + 0.08, -hd, hd]])
    b.add(boxGeo(V(x0, h, z0), V(x1, h + 0.5, z1)), cope, m);
  const wood = lam("beamWood", () => ({ map: rep(beamHD(), 1, 1) }));
  for (let i = 0; i < Math.floor(w / 1.1); i++) { const bx = -hw + 0.55 + i * 1.1; b.add(boxGeo(V(bx - 0.08, h - 0.45, hd), V(bx + 0.08, h - 0.3, hd + 0.35)), wood, m); }
  if (si % 2 === 0) { // striped cloth awning over the door, and a potted plant beside it
    const aw = lam("awning" + (si % 3), () => ({ map: awningTex(si % 3), side: THREE.DoubleSide }));
    b.add(quad(V(-1.2, 2.55, hd), V(1.2, 2.55, hd), V(1.2, 2.25, hd + 1.0), V(-1.2, 2.25, hd + 1.0)), aw, m);
    for (const sx of [-1.15, 1.15]) b.add(boxGeo(V(sx - 0.03, 0, hd + 0.95), V(sx + 0.03, 2.27, hd + 1.0)), lam("awPole", () => ({ color: "#6a4630" })), m);
  }
  if (si % 3 !== 1) { const px = si % 2 ? -hw + 0.8 : hw - 0.8; b.add(new THREE.CylinderGeometry(0.3, 0.22, 0.55, 12).translate(px, 0.275, hd + 0.45), lam("terracotta", () => ({ color: "#c8704a" })), m); b.add(new THREE.SphereGeometry(0.45, 12, 8).translate(px, 0.9, hd + 0.45), lam("potPlant", () => ({ color: "#4f9a3c" })), m); }
  b.add(boxGeo(V(-hw - 0.05, 0, -hd - 0.05), V(hw + 0.05, 0.35, hd + 0.05)), lam("plinthM", () => ({ map: stoneHD("plinthM", ["#c9b89c", "#bfae92", "#d3c3a8", "#b8a78b"], "#8f7f66") })), m);
};
/** palm: curved trunk of rings and a crown of drooping fronds */
const palm = (b: Batch, x: number, z: number, h: number, seed: number) => {
  if (blocked(x - 2.5, x + 2.5, 0, h + 1.5, z - 2.5, z + 2.5, true)) return;
  const r = rng(seed), lean = U(r, -0.12, 0.12), lz = U(r, -0.12, 0.12), bark = lam("palmBark", () => ({ color: "#9a7652" })), leaf = lam("palmLeaf", () => ({ color: "#5a9a3e", side: THREE.DoubleSide }));
  const n = 10;
  for (let i = 0; i < n; i++) {
    const u = i / n, y = u * h, off = (u * u) * h;
    b.add(new THREE.CylinderGeometry(0.17 - 0.05 * u, 0.2 - 0.05 * u, h / n + 0.02, 8), bark, new THREE.Matrix4().makeTranslation(x + lean * off, y + h / n / 2, z + lz * off));
  }
  const top = V(x + lean * h, h, z + lz * h);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + U(r, -0.2, 0.2), L = U(r, 2.2, 3.0);
    const g = new THREE.PlaneGeometry(L, 0.55, 6, 1);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) { const px = pos.getX(i) + L / 2, py = pos.getY(i) * (1 - 0.8 * (px / L)); pos.setXYZ(i, px, py * 0.4 - 0.55 * (px / L) ** 2 * L * 0.5, py); }
    g.computeVertexNormals();
    b.add(g, leaf, new THREE.Matrix4().compose(top, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0.25)), V(1, 1, 1)));
  }
};
/** craggy mountain: a noisy cone */
const mountain = (b: Batch, mat: THREE.Material, x: number, z: number, h: number, r: number, seed: number) => {
  // smooth lathe profile (rounded summit, concave flanks) with gentle low-frequency lobes: the ink pass draws the
  // silhouette and a few big folds instead of a crease on every facet
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, y = h * u; prof.push(new THREE.Vector2(Math.max(0.001, r * Math.max(0, 1 - u ** 1.7) ** 0.75 * (1 - 0.25 * u)), y)); }
  prof.push(new THREE.Vector2(0.001, h));
  const g = new THREE.LatheGeometry(prof, 64), p = g.attributes.position as THREE.BufferAttribute, rr = rng(seed);
  const ph = [U(rr, 0, 6), U(rr, 0, 6)];
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), a = Math.atan2(vz, vx), k = 1 + 0.1 * Math.sin(a * 2 + ph[0]) + 0.05 * Math.sin(a * 3 + ph[1]);
    p.setXYZ(i, vx * k, vy, vz * k);
  }
  g.deleteAttribute("normal"); const gm = mergeVertices(g); gm.computeVertexNormals(); const g2 = gm;
  const uv = g2.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r / 10, uv.getY(i) * h / 25);
  b.add(g2, mat, new THREE.Matrix4().makeTranslation(x, -2, z));
};

/** every lens position of the film: houses and trees that would block one are left out */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 6; f < s.b + 6; f += 3) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length() + 2;
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.7], [0, -0.5], [-0.6, 0.6], [0.6, 0.6]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden" | "storm" | "night", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private ark = new THREE.Group(); private arkDoor = new THREE.Group(); private flood!: THREE.Mesh; private glows: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  /** one group per set: only the set in shot is drawn (shadow, ink and colour passes all skip the rest) */
  private groups: Record<string, THREE.Group> = {};
  private grp(n: string) { let g = this.groups[n]; if (!g) { g = new THREE.Group(); g.name = n; this.groups[n] = g; this.root.add(g); } return g; }
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root, M: Mats = {};
    // ---- sky + light (bridge short) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)),
      storm: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.storm.cloud)), night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)) };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3, d = 640 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 110 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    setSight(sightLines());

    // ---- ground (dry Mediterranean grass) + sea ----
    const b = new Batch();
    M.grass = lam("dryGrass", () => ({ map: rep(grassHD(), 1, 1), color: "#c4b27a" }));
    M.green = lam("greenGrass", () => ({ map: rep(grassHD(), 1, 1), color: "#b8c890" }));
    M.dust = lam("dustHD", () => ({ map: rep(dustHD(), 1, 1) }));
    M.cobble = lam("cobbleM", () => ({ map: rep(cobbleHD(), 1, 1), color: "#fff2dc" }));
    M.paving = lam("paveHD", () => ({ map: rep(stoneHD("paveHD", ["#e6d6b8", "#dccaa8", "#eadcc0", "#d4c09c"], "#a8946f"), 1, 1) }));
    M.quay = lam("quayHD", () => ({ map: rep(stoneHD("quayHD", ["#cdbb9c", "#c3b090", "#d6c6a8", "#bba786"], "#8f7c5f"), 1, 1) }));
    M.wood = lam("deckWood", () => ({ map: rep(planksHD(), 1, 1) }));
    M.hull = lam("hullWood", () => ({ map: rep(beamHD(), 1, 1), color: "#c98a5a" }));
    M.terra = lam("terracotta", () => ({ color: "#c8704a" }));
    M.white = lam("whitePaint", () => ({ color: "#f4f1ea" }));
    M.rock = lam("rockHD", () => ({ map: rep(rockHD(), 1, 1), color: "#b8a48c" }));
    M.dark = lam("darkWood", () => ({ color: "#6a4630" }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 60 }), 0.15);
    b.add(flatQuad(-900, 900, -900, 900, 0, 8), M.grass);
    // sea floor seen through nothing: the sea is an opaque shader plane (below)

    b.build(R); // ground: always drawn
    const wood = lam("arkWood", () => ({ map: rep(beamHD(), 1, 1), color: "#c08a58" }));
    const darkWood = lam("arkDark", () => ({ map: rep(beamHD(), 1, 1), color: "#8a5a3a" }));
    const pitch = lam("arkPitch", () => ({ map: rep(planksHD(), 1, 1), color: "#a8724a" }));
    // ======== THE ARK (dry land, scaffolding, one door) ========
    {
      const ab = new Batch();
      const L = 30, Wd = 6, H0 = 0.6, H1 = 9.4;
      // hull: a long hexagon in plan (pointed bow and stern), walls lean out toward the deck, planked; a flat deck with
      // a long cabin on top under a pitched roof (the classic ark silhouette)
      const B = 7;
      const ring = (y: number, k: number) => [V(-L, y, 0), V(-L + B, y, -Wd * k), V(L - B, y, -Wd * k), V(L, y, 0), V(L - B, y, Wd * k), V(-L + B, y, Wd * k)];
      const lo = ring(H0, 0.8), hi = ring(H1, 1);
      for (let i = 0; i < 6; i++) { const a = lo[i], c = lo[(i + 1) % 6], d = hi[(i + 1) % 6], e = hi[i]; ab.add(quad(c, a, e, d, a.distanceTo(c) / 3, 3), pitch); }
      const deckShape = new THREE.Shape(hi.map((p) => new THREE.Vector2(p.x, p.z)));
      const deck = new THREE.ShapeGeometry(deckShape); deck.rotateX(Math.PI / 2); deck.translate(0, H1, 0);
      const duv = deck.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < duv.count; i++) duv.setXY(i, duv.getX(i) / 3, duv.getY(i) / 3);
      ab.add(deck, darkWood);
      ab.add(boxGeo(V(-L + B - 1, H1 - 0.02, -Wd - 0.15), V(L - B + 1, H1 + 0.35, -Wd + 0.1)), wood); // rails
      ab.add(boxGeo(V(-L + B - 1, H1 - 0.02, Wd - 0.1), V(L - B + 1, H1 + 0.35, Wd + 0.15)), wood);
      const cx0 = -L + B + 2, cx1 = L - B - 2, cw = Wd * 0.62, ch = 3.0;
      ab.add(boxGeo(V(cx0, H1, -cw), V(cx1, H1 + ch, cw)), pitch);
      for (let i = 0; i < 14; i++) ab.add(boxGeo(V(cx0 + 1.2 + i * 2.6, H1 + 1.6, cw), V(cx0 + 2.0 + i * 2.6, H1 + 2.3, cw + 0.06)), lam("arkWin", () => ({ color: "#2a1e18" })));
      const ry = H1 + ch, rt = ry + 2.4;
      ab.add(quad(V(cx0 - 0.4, ry - 0.1, cw + 0.6), V(cx1 + 0.4, ry - 0.1, cw + 0.6), V(cx1 + 0.4, rt, 0), V(cx0 - 0.4, rt, 0), 20, 2), darkWood);
      ab.add(quad(V(cx1 + 0.4, ry - 0.1, -cw - 0.6), V(cx0 - 0.4, ry - 0.1, -cw - 0.6), V(cx0 - 0.4, rt, 0), V(cx1 + 0.4, rt, 0), 20, 2), darkWood);
      ab.add(tri(V(cx0, ry, -cw), V(cx0, ry, cw), V(cx0, rt, 0)), pitch); ab.add(tri(V(cx1, ry, cw), V(cx1, ry, -cw), V(cx1, rt, 0)), pitch);
      for (let i = 0; i < 9; i++) { const rx = -L + B + 1 + i * 5.6; if (Math.abs(rx - DOOR_X) < 2.6) continue; ab.add(boxGeo(V(rx - 0.25, H0 + 0.2, Wd * 0.8 - 0.05), V(rx + 0.25, H1, Wd + 0.12)), wood); } // ribs on the door side
      // door frame (dark opening) and a ramp to the ground
      ab.add(boxGeo(V(DOOR_X - DOOR_W / 2 - 0.25, DOOR_Y - 0.2, DOOR_Z - 0.2), V(DOOR_X + DOOR_W / 2 + 0.25, DOOR_Y + DOOR_H + 0.25, DOOR_Z + 0.08)), darkWood);
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DOOR_H), new THREE.MeshBasicMaterial({ color: "#1a120e" }));
      hole.position.set(DOOR_X, DOOR_Y + DOOR_H / 2, DOOR_Z + 0.1); hole.layers.set(NOINK); this.ark.add(hole);
      const rampL = Math.hypot(7, DOOR_Y), ramp = new THREE.BoxGeometry(DOOR_W, 0.25, rampL); ramp.rotateX(Math.atan2(DOOR_Y, 7)); ramp.translate(DOOR_X, DOOR_Y / 2, DOOR_Z + 3.5 + 0.1);
      ab.add(ramp, wood);
      for (const sx of [-1, 1]) ab.add(boxGeo(V(DOOR_X + sx * 1.5 - 0.06, 0, DOOR_Z + 6.9), V(DOOR_X + sx * 1.5 + 0.06, 1.1, DOOR_Z + 7.0)), darkWood);
      // blocks under the hull
      for (let i = 0; i < 7; i++) ab.add(boxGeo(V(-L + 4 + i * 8.5, 0, -2), V(-L + 5.5 + i * 8.5, H0 + 0.05, 2)), darkWood);
      ab.build(this.ark);
      // the door itself: hinged at its bottom edge, swings up to shut (it is the ramp-side hatch)
      const db = new Batch();
      db.add(boxGeo(V(-DOOR_W / 2, 0, -0.12), V(DOOR_W / 2, DOOR_H, 0.12)), wood);
      for (const yy of [0.6, 2.0, 3.4]) db.add(boxGeo(V(-DOOR_W / 2, yy, 0.12), V(DOOR_W / 2, yy + 0.25, 0.22)), darkWood);
      db.build(this.arkDoor);
      this.arkDoor.position.set(DOOR_X, DOOR_Y, DOOR_Z + 0.15);
      this.ark.add(this.arkDoor);
      // scaffolding where Noah hammers (shot 2)
      const sc = new THREE.Group(), sb = new Batch();
      for (const x of [-12.5, -7.5]) for (const z of [6.6, 8.6]) sb.add(boxGeo(V(x - 0.08, 0, z - 0.08), V(x + 0.08, 4.4, z + 0.08)), wood);
      sb.add(boxGeo(V(-12.6, 3.4, 6.5), V(-7.4, 3.55, 8.7)), wood);
      sb.build(sc); sc.name = "scaffold"; this.ark.add(sc);
      this.ark.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      this.ark.position.set(...ARK);
      this.grp("ark").add(this.ark);
      // dry land around: dusty ground, olive trees, rocks, a far ridge
      b.add(flatQuad(-60, 60, -30, 60, 0.008, 6), M.dust);
      for (let i = 0; i < 16; i++) { const a = i * 0.7, r = 48 + (i % 4) * 9; prop(b, {}, i % 3 ? "tree_fat" : "tree_cone", Math.cos(a) * r, 0, Math.sin(a) * r - 6, i % 3 ? 4.5 : 7); }
      for (let i = 0; i < 6; i++) mountain(b, M.rock, -200 + i * 80, -220 - (i % 2) * 40, 50 + (i % 3) * 20, 70, 90 + i);
      // the neighbours' hill
      const hill = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2); hill.scale(11, 2.6, 9);
      b.add(hill, M.grass, new THREE.Matrix4().makeTranslation(HILL[0], 0, HILL[2]));
      prop(b, {}, "tree_fat", HILL[0] - 6, 1.2, HILL[2] - 3, 5);
      b.build(this.grp("ark"));
    }
    // ======== FEAST (the neighbours' village) ========
    {
      const [fx, , fz] = FEAST;
      b.add(flatQuad(fx - 14, fx + 14, fz - 12, fz + 12, 0.012, 4), M.paving);
      flatHouse(b, fx - 9, fz - 7, 0, 7, 6, 6, 0); flatHouse(b, fx, fz - 9, 0, 8, 6, 7, 2); flatHouse(b, fx + 9, fz - 7, 0, 7, 6, 5.6, 4);
      box(b, M.dark, [fx, 0.8, fz - 0.6], [5.0, 0.1, 1.3]); // long table
      for (const sx of [-2.2, 0, 2.2]) for (const sz of [-1.1, -0.1]) box(b, M.dark, [fx + sx, 0.4, fz - 0.6 + sz * 0.6 + 0.3], [0.12, 0.8, 0.12]);
      for (let i = 0; i < 6; i++) cyl(b, M.terra, [fx - 2.2 + i * 0.9, 0.85, fz - 0.6], 0.09, 0.12, 0.35, 10);
      // wedding canopy: four poles and a striped cloth
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(b, M.dark, [fx + 5 + sx * 1.3, 1.4, fz + 2 + sz * 1.1], [0.1, 2.8, 0.1]);
      b.add(quad(V(fx + 3.6, 2.8, fz + 3.2), V(fx + 6.4, 2.8, fz + 3.2), V(fx + 6.4, 2.8, fz + 0.8), V(fx + 3.6, 2.8, fz + 0.8)), lam("awning0", () => ({ color: "#e9cf8f", side: THREE.DoubleSide })));
      palm(b, fx - 12, fz + 2, 7, 41); palm(b, fx + 12, fz - 1, 8, 42);
      b.build(this.grp("feast"));
    }
    // ======== COTTAGE (night rain) + JDOOR (overgrown door) + ROOM (inside) ========
    const cottageWall = lam("cotWall", () => ({ map: rep(stoneHD("cotHD", ["#c9b8a0", "#bfae96", "#d3c4ac", "#b5a48c"], "#8a7a64"), 1, 1) }));
    const doorMat = lam("doorPlanks", () => ({ map: rep(beamHD(), 1, 1), color: "#9a6a44" }));
    const cottage = (o: V3, key: string, handle: boolean) => {
      const [x, , z] = o, cb = new Batch();
      cb.add(boxGeo(V(x - 5, 0, z - 4), V(x + 5, 3.2, z)), cottageWall);
      cb.add(quad(V(x - 5.6, 3.0, z + 0.6), V(x + 5.6, 3.0, z + 0.6), V(x + 5.6, 5.4, z - 2), V(x - 5.6, 5.4, z - 2), 6, 2), roofMatN());
      cb.add(boxGeo(V(x - 0.65, 0, z), V(x + 0.65, 2.25, z + 0.08)), doorMat);
      cb.add(boxGeo(V(x - 0.8, 2.25, z), V(x + 0.8, 2.4, z + 0.2)), M.dark);
      if (handle) cb.add(new THREE.SphereGeometry(0.06, 10, 8), M.iron, new THREE.Matrix4().makeTranslation(x + 0.45, 1.05, z + 0.12));
      // windows with warm light (emissive, bloom)
      for (const sx of [-3, 3]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.25, 0.6) }));
        w.position.set(x + sx, 1.6, z + 0.02); w.layers.set(NOINK); this.grp(key).add(w);
        cb.add(boxGeo(V(x + sx - 0.6, 1.1, z), V(x + sx + 0.6, 1.18, z + 0.18)), M.dark);
      }
      cb.add(flatQuad(x - 12, x + 12, z - 6, z + 10, 0.012, 3), M.cobble);
      cb.build(this.grp(key));
    };
    const roofMatN = () => lam("cotRoof", () => ({ map: rep(planksHD(), 1, 1), color: "#6a4a3a", side: THREE.DoubleSide }));
    cottage(COT, "cottage", true);
    cottage(JDOOR, "jdoor", false);
    { // ivy and weeds around the handle-less door: clusters of small dark leaves climbing the door and the wall
      const [x, , z] = JDOOR, ib = new Batch();
      const ivy = [lam("ivyA", () => ({ color: "#2f6a34" })), lam("ivyB", () => ({ color: "#3f7f3a" })), lam("ivyC", () => ({ color: "#265a30" }))];
      const leaf = new THREE.SphereGeometry(0.09, 8, 6); leaf.scale(1, 0.75, 0.35);
      for (let i = 0; i < 150; i++) {
        const u = hash(i, 1), v = hash(i, 2), px = x - 1.4 + u * 2.8, py = 0.05 + v * v * 2.6 * (1 - Math.abs(u - 0.5) * 0.6);
        ib.add(leaf, ivy[i % 3], new THREE.Matrix4().compose(V(px, py, z + 0.1 + hash(i, 3) * 0.05), new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), hash(i, 4) * 6), V(1, 1, 1)));
      }
      for (let i = 0; i < 18; i++) ib.add(new THREE.ConeGeometry(0.06, 0.45 + hash(i, 6) * 0.3, 5).translate(0, 0.25, 0), ivy[i % 3], new THREE.Matrix4().makeTranslation(x - 1.5 + hash(i, 5) * 3, 0, z + 0.25 + hash(i, 7) * 0.3));
      ib.build(this.grp("jdoor"));
    }
    { // ROOM: inside the house, the door with its handle on this side, a bench, a lamp
      const [x, , z] = ROOM, rb = new Batch();
      const wall = lam("roomWall", () => ({ map: rep(stoneHD("roomHD", ["#e6d4b0", "#dccaa6", "#eadcc0", "#d6c29c"], "#b39f7c"), 1, 1) }));
      rb.add(flatQuad(x - 3, x + 3, z - 3, z + 3, 0.015, 2), lam("roomFloor", () => ({ map: rep(planksHD(), 1, 1), color: "#d9b48a" })));
      rb.add(boxGeo(V(x - 3.3, 0, z - 3.3), V(x + 3.3, 3.4, z - 3)), wall);
      rb.add(boxGeo(V(x - 3.3, 0, z - 3), V(x - 3, 3.4, z + 3.3)), wall);
      rb.add(boxGeo(V(x + 3, 0, z - 3), V(x + 3.3, 3.4, z + 3.3)), wall);
      rb.add(boxGeo(V(x - 3.3, 0, z + 3), V(x + 3.3, 3.4, z + 3.3)), wall);
      rb.add(boxGeo(V(x - 0.6, 0, z - 3.02), V(x + 0.6, 2.2, z - 2.94)), doorMat);
      rb.add(boxGeo(V(x - 0.75, 2.2, z - 3.0), V(x + 0.75, 2.32, z - 2.88)), M.dark);
      rb.add(new THREE.SphereGeometry(0.07, 12, 10), lam("brass", () => ({ color: "#e0b040" })), new THREE.Matrix4().makeTranslation(x + 0.38, 1.05, z - 2.86));
      rb.add(boxGeo(V(x + 0.2, 1.03, z - 2.84), V(x + 0.4, 1.07, z - 2.8)), lam("brass", () => ({ color: "#e0b040" })));
      box(rb, M.dark, [x - 1.9, 0.45, z - 1.2], [1.6, 0.12, 0.7]); for (const sx of [-0.7, 0.7]) box(rb, M.dark, [x - 1.9 + sx, 0.22, z - 1.2], [0.1, 0.44, 0.6]);
      rb.build(this.grp("room"));
      const under = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.2, 1.0) }));
      under.position.set(x, 0.03, z - 2.93); under.layers.set(NOINK); this.grp("room").add(under);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8).scale(1, 1.6, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.2, 1.2) }));
      lamp.position.set(x + 2.2, 1.1, z - 2.4); lamp.layers.set(NOINK); this.grp("room").add(lamp);
      cyl(rb, M.terra, [x + 2.2, 0, z - 2.4], 0.25, 0.2, 0.95, 12); rb.build(this.grp("room"));
    }
    // flood water: one big plane, raised per shot (sea shader)
    void ARK;

    // ---- sea: the river shader of the bridge short, opaque, everything beyond the quay ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "sea1";
    this.flood = new THREE.Mesh(quad(V(-900, 0, 900), V(900, 0, 900), V(900, 0, -900), V(-900, 0, -900)), waterM);
    this.flood.receiveShadow = true; this.flood.visible = false; R.add(this.flood);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, s.set === "room" || s.set === "cottage" || s.set === "jdoor" ? 10 : 26, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 34);
    if (id === 2 || id === 9) Rr = 80;
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = s.light === "day" ? 900 : L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden" && (id === 7 || id === 11);
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    const Wu = this.WU, wc = SEA[s.light === "storm" ? "storm" : s.light === "night" ? "night" : s.light];
    untone(wc.near, Wu.wNearC.value); untone(wc.mid, Wu.wMidC.value); untone(wc.far, Wu.wFarC.value);
    untone(wc.crest, Wu.wCrest.value); untone(wc.trough, Wu.wTrough.value); untone(wc.glint, Wu.wGlint.value);
    Wu.wShade.value.set(...wc.shade); Wu.wTime.value = t;
    // ---- props that move or appear per shot ----
    const SETG: Record<string, string> = { ark: "ark", hill: "ark", feast: "feast", flood: "ark", cottage: "cottage", jdoor: "jdoor", room: "room" };
    for (const [n, g] of Object.entries(this.groups)) g.visible = n === SETG[s.set];
    const scf = this.ark.getObjectByName("scaffold"); if (scf) scf.visible = id <= 4;
    this.arkDoor.rotation.x = -(1 - doorShut(id, t)) * 1.48;   // open = swung down onto the ramp, shut = upright
    const wl = waterY(id, t);
    this.flood.visible = s.set === "flood"; this.flood.position.y = wl;
    this.ark.position.y = s.set === "flood" ? arkLift(id, t) + 0.05 * Math.sin(t * 1.2) : 0;
    this.ark.rotation.z = s.set === "flood" ? 0.012 * Math.sin(t * 0.9) : 0;
    if (s.set === "flood") { this.fog.near = 10; this.fog.far = 160; }
    if (s.set === "cottage" || s.set === "jdoor" || s.set === "room") { this.fog.near = 30; this.fog.far = 200; }
    void T;
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}

/** open-sea colours (the bridge's river palette is too turquoise for the Mediterranean) */
const SEA: Record<"day" | "golden" | "storm" | "night", { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: [number, number, number] }> = {
  storm: { near: "#4a6e78", mid: "#3e5e6e", far: "#6a7a8a", crest: "#d4dde2", trough: "#26404a", glint: "#e6eef4", shade: [0.6, 0.64, 0.75] },
  night: { near: "#1a2a50", mid: "#152446", far: "#22305a", crest: "#4a6aa0", trough: "#0c1630", glint: "#a8c0ff", shade: [0.5, 0.55, 0.8] },
  day: { near: "#2a86b8", mid: "#1f6aa8", far: "#3a73a8", crest: "#8fd0e8", trough: "#164f86", glint: "#ffffff", shade: [0.55, 0.6, 0.75] as [number, number, number] },
  golden: { near: "#2a4f86", mid: "#3d6a9a", far: "#e0a888", crest: "#e8b090", trough: "#1c335e", glint: "#ffe2b0", shade: [0.45, 0.5, 0.72] as [number, number, number] },
};
const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.12 * wTime, 0.2 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 6.0), texture2D(wFarTex, wp / 90.0 + 0.37), smoothstep(25.0, 90.0, wd)) * mix(0.45, 0.18, smoothstep(15.0, 60.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;
export { Pen };
