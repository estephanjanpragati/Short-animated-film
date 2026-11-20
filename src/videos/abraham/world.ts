// The world of "The First Offering" (Cain and Abel): one three.js scene holding every set at its own origin (story.ts),
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
import { FPS, SHOTS, ShotDef, camAt, V3, ALT, FARM, PAST, TAB, KIT, HUT, HILLX, CAIN_ALT, ABEL_ALT, beamOn, T, W } from "./story";

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
  private beam!: THREE.Mesh;
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
    const stone = lam("altarStone", () => ({ map: rep(stoneHD("altarHD", ["#b8aa94", "#ad9f88", "#c2b49e", "#a39580"], "#7a6c58"), 1, 1) }));
    // ======== ALTARS (and the dusk field beyond them) ========
    {
      const ab = new Batch();
      for (const [x, z] of [[ABEL_ALT[0], ABEL_ALT[2]]]) { // Two Mountains: one altar on Moriah
        box(ab, stone, [x, 0.3, z], [1.5, 0.6, 1.3]); box(ab, stone, [x, 0.8, z], [1.25, 0.42, 1.1]);
        box(ab, lam("altarWood", () => ({ map: rep(beamHD(), 1, 1), color: "#8a5a3a" })), [x, 1.06, z], [1.0, 0.12, 0.8]);
      }
      ab.add(flatQuad(-12, 12, -26, -10, 0.01, 4), M.dust);
      for (let i = 0; i < 10; i++) prop(ab, {}, i % 2 ? "tree_fat" : "tree_oak", -24 + i * 5.3, 0, -34 - (i % 3) * 4, 5 + (i % 3));
      for (let i = 0; i < 6; i++) mountain(ab, M.rock, -160 + i * 64, -180 - (i % 2) * 30, 40 + (i % 3) * 14, 60, 120 + i);
      // the open field toward the camera side (dusk scenes 15-18), a few rocks
      for (let i = 0; i < 6; i++) box(ab, stone, [(i - 2.5) * 6 + 1, 0.2, 18 + (i % 3) * 5], [0.9, 0.4, 0.7], i);
      ab.build(this.grp("altars"));
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.7, 8).rotateZ(Math.PI / 2 - 0.2), lam("staffWood", () => ({ color: "#8a5a34" })));
      staff.position.set(ALT[0] + 0.35, 0.06, ALT[2] + 13.3); staff.rotation.y = 0.6; staff.castShadow = true; staff.name = "staff";
      this.grp("altars").add(staff);
      // the light that accepts Abel's offering: an additive cone from the sky
      this.beam = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.85, 40, 32, 1, true).translate(0, 20, 0),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.35, 0.85), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      this.beam.position.set(ABEL_ALT[0], 1.1, ABEL_ALT[2]); this.beam.layers.set(NOINK); this.grp("altars").add(this.beam);
    }
    // ======== FIELDS: Cain's wheat, Abel's pasture ========
    {
      const fb = new Batch(), wheat = lam("wheat", () => ({ color: "#e8c25a" })), wheatD = lam("wheatD", () => ({ color: "#c9a040" }));
      fb.add(flatQuad(FARM[0] - 9, FARM[0] + 6, FARM[2] - 12, FARM[2] + 3, 0.01, 4), lam("tilled", () => ({ map: rep(dustHD(), 1, 1), color: "#c9a070" })));
      for (let r = 0; r < 9; r++) for (let c = 0; c < 12; c++) {
        const x = FARM[0] - 8.5 + c * 1.2 + (r % 2) * 0.5, z = FARM[2] - 11 + r * 1.2;
        if (Math.abs(x - FARM[0]) < 1.6 && z > FARM[2] - 2.5) continue; // Cain's spot
        fb.add(new THREE.ConeGeometry(0.28, 1.0 + ((r * 7 + c) % 3) * 0.12, 7).translate(0, 0.5, 0), (r + c) % 2 ? wheat : wheatD, new THREE.Matrix4().makeTranslation(x, 0, z));
      }
      // the pasture: a low stone wall and a shepherd's lean-to
      for (let i = 0; i < 8; i++) box(fb, lam("altarStone", () => ({})), [PAST[0] - 6 + i * 1.6, 0.3, PAST[2] - 8], [1.5, 0.6, 0.5], (i % 3) * 0.05);
      prop(fb, {}, "tree_oak", PAST[0] + 6, 0, PAST[2] - 6, 6); prop(fb, {}, "tree_fat", FARM[0] - 7, 0, FARM[2] - 14, 5);
      for (let i = 0; i < 5; i++) mountain(fb, M.rock, -120 + i * 60, -140 - (i % 2) * 30, 34 + (i % 3) * 12, 50, 140 + i);
      fb.build(this.grp("fields"));
    }
    // ======== TABERNACLE COURT ("later": grain offerings in the law) ========
    {
      const [x, , z] = TAB, tb = new Batch(), linen = lam("linen", () => ({ color: "#f4f1ea", side: THREE.DoubleSide })), bronze = twoTone(new THREE.MeshPhongMaterial({ color: "#b8834a", specular: "#e0b070", shininess: 40 }), 0.15);
      tb.add(flatQuad(x - 14, x + 14, z - 12, z + 8, 0.01, 4), M.dust);
      for (const [x0, x1, z0, z1] of [[-12, 12, -10, -9.9], [-12, -11.9, -10, 6], [11.9, 12, -10, 6]] as const) tb.add(boxGeo(V(x + x0, 0, z + z0), V(x + x1, 2.3, z + z1)), linen);
      for (let i = 0; i < 9; i++) cyl(tb, lam("postWood", () => ({ color: "#d9b07a" })), [x - 12 + i * 3, 0, z - 10], 0.08, 0.08, 2.4, 8);
      box(tb, bronze, [x, 0.75, z - 1.2], [2.2, 1.5, 2.2]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(tb, bronze, [x + sx * 0.95, 1.6, z - 1.2 + sz * 0.95], [0.25, 0.3, 0.25]);
      box(tb, lam("tentCloth", () => ({ color: "#a07a62" })), [x, 2.0, z - 11], [7, 4, 4.5]);
      tb.build(this.grp("tab"));
    }
    // ======== KITCHEN (the analogy) ========
    {
      const [x, , z] = KIT, kb = new Batch(), wall = lam("kitWall", () => ({ color: "#f2e6cc" }));
      kb.add(flatQuad(x - 3, x + 3, z - 3, z + 3, 0.015, 2), lam("kitFloor", () => ({ map: rep(planksHD(), 1, 1), color: "#e0c090" })));
      kb.add(boxGeo(V(x - 3.3, 0, z - 3.3), V(x + 3.3, 3.2, z - 3)), wall);
      kb.add(boxGeo(V(x - 3.3, 0, z - 3), V(x - 3, 3.2, z + 3.3)), wall); kb.add(boxGeo(V(x + 3, 0, z - 3), V(x + 3.3, 3.2, z + 3.3)), wall);
      box(kb, lam("kitTable", () => ({ color: "#c98a5a" })), [x, 0.74, z - 0.3], [2.4, 0.08, 1.1]);
      for (const sx of [-1.05, 1.05]) for (const sz of [-0.45, 0.45]) box(kb, M.dark, [x + sx, 0.37, z - 0.3 + sz], [0.08, 0.74, 0.08]);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshBasicMaterial({ map: skyWinTex("kitWin", false), color: new THREE.Color(1.1, 1.1, 1.1) }));
      win.position.set(x - 1.2, 1.9, z - 2.99); win.layers.set(NOINK); this.grp("kitchen").add(win);
      box(kb, lam("kitShelf", () => ({ color: "#8a5a3a" })), [x + 1.6, 1.5, z - 2.85], [1.6, 0.06, 0.3]);
      for (let i = 0; i < 4; i++) cyl(kb, i % 2 ? M.terra : lam("jarBlue", () => ({ color: "#5a8fc2" })), [x + 1.0 + i * 0.4, 1.53, z - 2.85], 0.09, 0.1, 0.3, 10);
      kb.build(this.grp("kitchen"));
    }
    // ======== HUT (Cain's door at night) ========
    {
      const [x, , z] = HUT, hb = new Batch(), wall = lam("hutWall", () => ({ map: rep(stoneHD("hutHD", ["#a89880", "#9e8e76", "#b2a28a", "#94846c"], "#6a5c48"), 1, 1) }));
      hb.add(boxGeo(V(x - 4, 0, z - 3), V(x - 0.75, 3.0, z)), wall); hb.add(boxGeo(V(x + 0.75, 0, z - 3), V(x + 4, 3.0, z)), wall);
      hb.add(boxGeo(V(x - 0.75, 2.3, z - 3), V(x + 0.75, 3.0, z)), wall);
      const dark = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.3), new THREE.MeshBasicMaterial({ color: "#0c0a10" })); dark.position.set(x, 1.15, z - 0.4); dark.layers.set(NOINK); this.grp("hut").add(dark);
      hb.add(quad(V(x - 4.5, 2.9, z + 0.8), V(x + 4.5, 2.9, z + 0.8), V(x + 4.5, 3.6, z - 3), V(x - 4.5, 3.6, z - 3), 4, 2), lam("hutRoof", () => ({ map: rep(planksHD(), 1, 1), color: "#6a5040", side: THREE.DoubleSide })));
      hb.add(flatQuad(x - 10, x + 10, z, z + 10, 0.012, 4), M.dust);
      prop(hb, {}, "plant_bush", x - 2.4, 0, z + 0.6, 0.8); prop(hb, {}, "tree_fat", x + 6, 0, z - 4, 4.5);
      hb.build(this.grp("hut"));
    }
    // ======== CROSS HILL (sunrise) ========
    {
      const [x, , z] = HILLX, cb = new Batch();
      const hill = new THREE.SphereGeometry(1, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2); hill.scale(26, 6, 18);
      cb.add(hill, M.grass, new THREE.Matrix4().makeTranslation(x, 0, z - 16));
      const wood = lam("crossWood", () => ({ map: rep(beamHD(), 1, 1), color: "#7a5236" }));
      box(cb, wood, [x, 9.0, z - 16], [0.45, 7.0, 0.45]); box(cb, wood, [x, 10.6, z - 16], [3.4, 0.4, 0.42]);
      cb.add(flatQuad(x - 8, x + 8, z + 2, z + 14, 0.01, 4), M.green);
      for (let i = 0; i < 8; i++) prop(cb, {}, i % 2 ? "tree_oak" : "tree_fat", x - 34 + i * 9.5, 0, z - 30 - (i % 3) * 3, 5 + (i % 3));
      cb.build(this.grp("cross"));
    }
    // flood water: one big plane, raised per shot (sea shader)
    void ALT;

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
    void waterM;
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
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, s.set === "kitchen" || s.set === "hut" ? 10 : 26, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 34);
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
    const showSun = false;
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
    const SETG: Record<string, string> = { altars: "altars", fields: "fields", tab: "tab", kitchen: "kitchen", hut: "hut", dusk: "altars", cross: "cross" };
    // shot 11 cuts to Abel at his altar on "the bible says" (camera S11c): show the altars set from that frame on
    const setNow = s.set; void W;
    for (const [n, g] of Object.entries(this.groups)) g.visible = n === SETG[setNow];
    const staff = this.groups.altars?.getObjectByName("staff"); if (staff) staff.visible = false;
    (this.beam.material as THREE.MeshBasicMaterial).opacity = 0.12 * beamOn(id, t); this.beam.visible = beamOn(id, t) > 0.01;
    if (s.set === "kitchen" || s.set === "hut") { this.fog.near = 30; this.fog.far = 200; }
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
