// The world of "The Quitter Who Wrote a Gospel": one three.js scene holding every set at its own origin (story.ts),
// posed per frame. Sky, camera-relative frozen sun, two-tone materials, painted HD textures, river/sea shader and the
// cast machinery come from the bridge short; the sets are new: a Mediterranean harbour with a sailing boat, flat-roofed
// whitewashed towns, the road into the Taurus mountains at Perga, a football pitch, a prison cell and a scribe's room.
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, boxGeo, V, lam, quad, prop, setSight, blocked, Ray } from "./build";
import { rep, ctex, rng, stoneHD, cobbleHD, grassHD, waterNear, waterFar, cloudHD, facadeHD, beamHD, planksHD } from "./paint";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, camAt, V3, COURT, HARB, VILL, PERGA, FIELD, PRISON, STUDY, QUAY_Z, SEA_Y, SPOT, sailOpen, boatPos, T, beamAt, BAB, TOWER_Z, TIER_H, TIER_HALF, towerAt } from "./story";

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
  private beam!: THREE.Mesh;
  private clouds: THREE.Mesh[] = [];
  private boat = new THREE.Group(); private sail: THREE.Mesh; private table = new THREE.Group(); private flame: THREE.Mesh;
  private frustum = new THREE.Frustum();
  private tiers: THREE.Group[] = []; private kilnFire!: THREE.Mesh;
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
    const groundZ0 = QUAY_Z + HARB[2] * 0; // land starts at the quay edge
    for (const [x0, x1, z0, z1] of [[-900, 900, groundZ0, 900]] as const) b.add(flatQuad(x0, x1, z0, z1, 0, 8), M.grass);
    // sea floor seen through nothing: the sea is an opaque shader plane (below)

    b.build(R); // ground: always drawn
    // ======== COURT (Antioch) ========
    {
      const [cx, , cz] = COURT;
      b.add(flatQuad(cx - 20, cx + 20, cz - 20, cz + 20, 0.012, 4), M.paving);
      const H = (x: number, z: number, yaw: number, w: number, d: number, h: number, si: number) => flatHouse(b, cx + x, cz + z, yaw, w, d, h, si);
      H(-7, -16, 0, 8, 6, 6.2, 0); H(2, -16.5, 0, 7, 6, 7.4, 1); H(10, -15.5, 0, 6, 6, 5.6, 2);
      H(-17, -7, Math.PI / 2, 9, 6, 6.8, 3); H(-17, 4, Math.PI / 2, 8, 6, 5.8, 4);
      H(17, -6, -Math.PI / 2, 9, 6, 6.4, 2); H(17, 5, -Math.PI / 2, 8, 6, 7.0, 0);
      H(-8, 17, Math.PI, 8, 6, 6.0, 1); H(6, 17, Math.PI, 9, 6, 6.6, 3);
      prop(b, {}, "tree_fat", cx - 6.5, 0, cz - 9, 5.2); prop(b, {}, "tree_oak", cx + 9, 0, cz - 9.5, 6);
      palm(b, cx - 11, cz + 3, 7.5, 3); palm(b, cx + 12, cz + 9, 8.2, 5);
      // well and pots
      if (!blocked(cx + 4.6, cx + 7.4, 0, 1.2, cz - 8.4, cz - 5.6, true)) {
        cyl(b, lam("wellStone", () => ({ map: rep(stoneHD("wellHD"), 1, 1) })), [cx + 6, 0, cz - 7], 1.1, 1.1, 0.9, 20);
        box(b, M.dark, [cx + 6, 1.9, cz - 7], [2.4, 0.14, 0.14]);
        for (const s of [-1, 1]) box(b, M.dark, [cx + 6 + s * 1.05, 1.0, cz - 7], [0.12, 1.9, 0.12]);
      }
      for (const [x, z, h] of [[-3.5, -9.5, 0.9], [-2.6, -9.8, 0.6], [3.2, -10.2, 1.0], [-9.5, 6, 0.8], [9.8, 5.5, 0.7]] as const)
        if (!blocked(cx + x - 0.4, cx + x + 0.4, 0, h, cz + z - 0.4, cz + z + 0.4, true)) cyl(b, M.terra, [cx + x, 0, cz + z], 0.22, 0.34, h, 14);
      // planning table (shot 8 only): toggled group
      const tb = new Batch(), [tx, , tz] = SPOT.table;
      box(tb, M.dark, [tx, 0.82, tz], [2.0, 0.08, 1.1]);
      for (const sx of [-0.9, 0.9]) for (const sz of [-0.45, 0.45]) box(tb, M.dark, [tx + sx, 0.4, tz + sz], [0.1, 0.8, 0.1]);
      tb.build(this.table);
      const map = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), twoTone(new THREE.MeshLambertMaterial({ map: mapTex() })));
      map.rotation.x = -Math.PI / 2; map.position.set(tx, 0.865, tz); map.receiveShadow = true;
      this.table.add(map); this.table.position.set(cx, 0, cz);
      this.table.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      R.add(this.table);
    }

    b.build(this.grp("court"));
    // ======== HARBOUR + coast road ========
    {
      const [hx, , hz] = HARB;
      b.add(flatQuad(hx - 60, hx + 60, hz, hz + 9, 0.012, 3), M.quay);
      b.add(flatQuad(hx + 60, hx + 900, hz + 2.5, hz + 6.5, 0.012, 4), M.dust); // coast road
      b.add(flatQuad(hx - 60, hx + 60, hz + 9, hz + 12, 0.012, 4), M.dust);
      // quay wall into the sea
      b.add(quad(V(hx - 900, SEA_Y - 3, hz), V(hx + 900, SEA_Y - 3, hz), V(hx + 900, 0, hz), V(hx - 900, 0, hz), 450, 1.5), M.quay);
      b.add(boxGeo(V(hx - 60, -0.05, hz - 0.05), V(hx + 60, 0.18, hz + 0.6)), lam("quayCope", () => ({ color: "#e9dcc4" })));
      for (let i = 0; i < 9; i++) cyl(b, M.dark, [hx - 16 + i * 4.5, 0, hz + 0.9], 0.18, 0.15, 0.55, 10); // bollards
      // stacked cargo: crates and amphorae
      for (const [x, z, s] of [[-6.5, 6.2, 0.8], [-5.6, 6.5, 0.7], [-6.1, 6.3, 0.6], [8.5, 5.8, 0.9], [9.4, 6.1, 0.75]] as const) {
        if (blocked(hx + x - 0.6, hx + x + 0.6, 0, 1.6, hz + z - 0.6, hz + z + 0.6, true)) continue;
        box(b, lam("crate", () => ({ map: rep(beamHD(), 1, 1), color: "#e0b080" })), [hx + x, s / 2, hz + z], [s, s, s], x);
      }
      for (const [x, z] of [[-3.8, 6.8], [-3.3, 7.1], [-2.8, 6.7], [11, 6.6], [11.5, 7.0]] as const) {
        if (blocked(hx + x - 0.4, hx + x + 0.4, 0, 1.2, hz + z - 0.4, hz + z + 0.4, true)) continue;
        const pts = [[0.02, 0], [0.12, 0.08], [0.24, 0.35], [0.26, 0.6], [0.16, 0.85], [0.08, 0.95], [0.1, 1.08]].map(([r, y]) => new THREE.Vector2(r, y));
        b.add(new THREE.LatheGeometry(pts, 14), M.terra, new THREE.Matrix4().makeTranslation(hx + x, 0, hz + z));
      }
      for (let i = 0; i < 7; i++) flatHouse(b, hx - 27 + i * 9, hz + 17, Math.PI, 8 + (i % 2), 6, 6 + ((i * 7) % 3) * 0.9, i);
      for (let i = 0; i < 6; i++) flatHouse(b, hx - 22 + i * 10, hz + 27, Math.PI, 8, 6, 8 + (i % 2) * 1.4, i + 2);
      palm(b, hx - 9, hz + 11, 7, 11); palm(b, hx + 12, hz + 11.5, 8, 12); palm(b, hx + 30, hz + 10, 7.5, 13);
      for (let i = 0; i < 18; i++) { // coast road: cypresses and olives toward the horizon
        const x = hx + 70 + i * 22 + ((i * 37) % 9);
        prop(b, {}, i % 3 ? "tree_cone" : "tree_fat", x, 0, hz + 9 + (i % 2) * 3, i % 3 ? 6 + (i % 4) : 4.5);
      }
      // headland across the bay
      for (let i = 0; i < 5; i++) mountain(b, M.rock, hx + 120 + i * 70, hz - 320 - (i % 2) * 60, 40 + (i % 3) * 18, 70 + (i % 2) * 20, 70 + i);
      // the boat (moves in shots 18-19)
      const boatB = new Batch();
      const hullShape = (y: number, k: number): THREE.Vector3[] => [V(-6 * k, y, 0), V(-4.6 * k, y, -1.7 * k), V(4.2 * k, y, -1.7 * k), V(6.4 * k, y, 0), V(4.2 * k, y, 1.7 * k), V(-4.6 * k, y, 1.7 * k)];
      const rings = [hullShape(-1.3, 0.55), hullShape(0.25, 1)];
      for (let i = 0; i < 6; i++) { const a = rings[0][i], c = rings[0][(i + 1) % 6], d = rings[1][(i + 1) % 6], e = rings[1][i]; boatB.add(quad(a, c, d, e, 4, 1), M.hull); }
      const deck = new THREE.Shape(rings[1].map((p) => new THREE.Vector2(p.x, p.z)));
      const dg = new THREE.ShapeGeometry(deck); dg.rotateX(-Math.PI / 2); dg.translate(0, 0.25, 0);
      const duv = dg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < duv.count; i++) duv.setXY(i, duv.getX(i) / 4, duv.getY(i) / 4);
      boatB.add(dg, M.wood);
      boatB.add(boxGeo(V(-6.1, 0.25, -0.12), V(6.5, 0.6, 0.12)).translate(0, 0, 1.62), M.hull); // gunwales
      boatB.add(boxGeo(V(-6.1, 0.25, -0.12), V(6.5, 0.6, 0.12)).translate(0, 0, -1.62), M.hull);
      cyl(boatB, M.dark, [0.4, 0.25, 0], 0.14, 0.11, 9.5, 10); // mast
      boatB.add(new THREE.CylinderGeometry(0.09, 0.09, 6.4, 8).rotateX(Math.PI / 2), M.dark, new THREE.Matrix4().makeTranslation(0.62, 8.9, 0)); // yard
      boatB.add(new THREE.ConeGeometry(0.22, 0.9, 6).rotateZ(-Math.PI / 2.6), M.hull, new THREE.Matrix4().makeTranslation(6.6, 0.75, 0)); // prow
      boatB.add(boxGeo(V(-6.6, 0.3, -0.3), V(-5.8, 2.0, 0.3)), M.hull); // stern post
      boatB.build(this.boat);
      this.sail = new THREE.Mesh(new THREE.PlaneGeometry(6, 6.4, 8, 8).translate(0, -3.2, 0), twoTone(new THREE.MeshLambertMaterial({ map: sailTex(), side: THREE.DoubleSide })));
      const sp = this.sail.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < sp.count; i++) { const y = sp.getY(i), x = sp.getX(i); sp.setZ(i, 0.9 * Math.sin(Math.PI * (-y / 6.4)) * (1 - (x / 3) ** 2)); }
      this.sail.geometry.computeVertexNormals();
      this.sail.rotation.y = Math.PI / 2; this.sail.position.set(0.75, 8.85, 0);
      this.boat.add(this.sail);
      this.boat.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      R.add(this.boat);
    }

    b.build(this.grp("harbour"));
    // ======== VILLAGE (Cyprus / Lystra) ========
    {
      const [vx, , vz] = VILL;
      b.add(flatQuad(vx - 9, vx + 9, vz - 40, vz + 40, 0.012, 4), M.cobble);
      b.add(flatQuad(vx - 30, vx + 30, vz - 40, vz + 40, 0.006, 6), M.dust);
      const pr = SPOT.preach;
      box(b, lam("stepStone", () => ({ map: rep(stoneHD("stepHD"), 1, 1) })), [vx + pr[0], 0.225, vz + pr[2]], [2.2, 0.45, 1.4]);
      for (let i = 0; i < 6; i++) { flatHouse(b, vx - 13, vz - 30 + i * 10, Math.PI / 2, 9, 7, 6 + (i % 3) * 0.9, i); flatHouse(b, vx + 13, vz - 27 + i * 10, -Math.PI / 2, 9, 7, 6.4 + (i % 2) * 1.1, i + 3); }
      for (let i = 0; i < 4; i++) flatHouse(b, vx - 6 + i * 6, vz - 16, 0, 5.5, 6, 6 + (i % 2), i + 1);
      for (let i = 0; i < 4; i++) flatHouse(b, vx - 6 + i * 6, vz + 22, Math.PI, 5.5, 6, 6.5, i + 2);
      palm(b, vx - 5.5, vz - 9.5, 7.5, 21); palm(b, vx + 6, vz - 10, 8.5, 22); palm(b, vx + 7, vz + 6, 7, 23);
      prop(b, {}, "tree_fat", vx - 7, 0, vz + 4, 4.6);
      for (const [x, z, h] of [[-3, -8.5, 0.8], [3.4, -8.2, 1.0], [-6, 1, 0.7], [6.5, -1.5, 0.9]] as const)
        if (!blocked(vx + x - 0.4, vx + x + 0.4, 0, h, vz + z - 0.4, vz + z + 0.4, true)) cyl(b, M.terra, [vx + x, 0, vz + z], 0.22, 0.34, h, 14);
    }

    b.build(this.grp("village"));
    // ======== PERGA: the road into the mountains ========
    {
      const [px, , pz] = PERGA;
      b.add(flatQuad(px - 400, px + 40, pz - 1.6, pz + 1.6, 0.012, 4), M.dust);
      for (let i = 0; i < 9; i++) mountain(b, M.rock, px - 120 - i * 45 - (i % 2) * 20, pz - 90 - (i % 3) * 50, 70 + (i % 4) * 28, 60 + (i % 3) * 18, 30 + i);
      for (let i = 0; i < 6; i++) mountain(b, M.rock, px - 200 - i * 50, pz - 250, 110 + (i % 2) * 40, 90, 50 + i);
      for (let i = 0; i < 14; i++) {
        const x = px + 20 - i * 9 - ((i * 13) % 5), z = pz + (i % 2 ? -4.5 : -7.5) - (i % 3);
        prop(b, {}, i % 4 === 1 ? "tree_fat" : "tree_cone", x, 0, z, i % 4 === 1 ? 4.2 : 6 + (i % 3));
      }
      for (let i = 0; i < 8; i++) prop(b, {}, "plant_bush", px + 15 - i * 11, 0, pz - 3.2 - (i % 2) * 1.5, 0.8 + (i % 3) * 0.2);
      cyl(b, lam("mileStone", () => ({ map: rep(stoneHD("mileHD"), 1, 1) })), [px - 4, 0, pz - 2.3], 0.24, 0.2, 1.1, 12);
    }

    b.build(this.grp("perga"));
    // ======== FIELD ========
    {
      const [fx, , fz] = FIELD;
      b.add(quad(V(fx - 18, 0.012, fz + 12), V(fx + 18, 0.012, fz + 12), V(fx + 18, 0.012, fz - 12), V(fx - 18, 0.012, fz - 12), 1, 1), lam("pitch", () => ({ map: pitchHD() })));
      b.add(flatQuad(fx - 40, fx + 40, fz - 30, fz + 30, 0.006, 8), M.green);
      for (const gx of [-16.8, 16.8]) { // goals
        for (const s of [-1, 1]) cyl(b, M.white, [fx + gx, 0, fz + s * 3.6], 0.07, 0.07, 2.3, 10);
        b.add(new THREE.CylinderGeometry(0.07, 0.07, 7.3, 10).rotateX(Math.PI / 2), M.white, new THREE.Matrix4().makeTranslation(fx + gx, 2.3, fz));
      }
      box(b, M.dark, [fx - 12.2, 0.45, fz + 1.6], [0.5, 0.08, 3.2]); // bench
      for (const s of [-1, 1]) box(b, M.dark, [fx - 12.2, 0.22, fz + 1.6 + s * 1.3], [0.4, 0.44, 0.08]);
      for (let i = 0; i < 10; i++) prop(b, {}, i % 2 ? "tree_oak" : "tree_default", fx - 30 + i * 6.5, 0, fz - 20 - (i % 3) * 2, 6 + (i % 3));
      for (let i = 0; i < 6; i++) prop(b, {}, "tree_oak", fx - 24 - (i % 2) * 3, 0, fz - 8 + i * 5, 6.5);
    }

    b.build(this.grp("field"));
    // ======== PRISON CELL + STUDY ========
    const room = (o: V3, key: string, wallMat: THREE.Material, floorMat: THREE.Material) => {
      const [x, , z] = o, w = 3, hgt = 3.4;
      b.add(flatQuad(x - w, x + w, z - w, z + w, 0.015, 2), floorMat);
      b.add(boxGeo(V(x - w - 0.3, 0, z - w - 0.3), V(x + w + 0.3, hgt, z - w)), wallMat);      // back
      b.add(boxGeo(V(x - w - 0.3, 0, z - w), V(x - w, hgt, z + w + 0.3)), wallMat);            // left
      b.add(boxGeo(V(x + w, 0, z - w), V(x + w + 0.3, hgt, z + w + 0.3)), wallMat);            // right
      b.add(boxGeo(V(x - w - 0.3, 0, z + w), V(x + w + 0.3, hgt, z + w + 0.3)), wallMat);      // front (behind the lens)
      void key;
    };
    {
      const cellWall = lam("cellHD", () => ({ map: rep(stoneHD("cellHD", ["#9c8f80", "#928575", "#a6998a", "#887b6c"], "#5f544a"), 1, 1) }));
      room(PRISON, "cell", cellWall, lam("straw", () => ({ map: rep(strawTex(), 1, 1) })));
      const [x, , z] = PRISON;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ map: skyWinTex("cellWin", false), color: new THREE.Color(1.15, 1.1, 1.0) }));
      win.position.set(x + 1.3, 2.5, z - 2.99); win.layers.set(NOINK); R.add(win);
      for (let i = 0; i < 4; i++) cyl(b, M.iron, [x + 0.97 + i * 0.22, 2.15, z - 2.95], 0.025, 0.025, 0.7, 6);
      box(b, M.iron, [x + 1.3, 2.17, z - 2.95], [0.95, 0.05, 0.05]); box(b, M.iron, [x + 1.3, 2.83, z - 2.95], [0.95, 0.05, 0.05]);
      // chain ring on the wall, a jug and a bowl
      b.add(new THREE.TorusGeometry(0.12, 0.025, 6, 16), M.iron, new THREE.Matrix4().makeTranslation(x - 1.3, 1.1, z - 2.97));
      cyl(b, M.terra, [x - 1.1, 0, z - 2.2], 0.12, 0.17, 0.42, 12);
      cyl(b, M.terra, [x + 1.5, 0, z - 1.4], 0.18, 0.12, 0.1, 14);
    }
    {
      const studyWall = lam("studyWall", () => ({ map: facadeHD("studyWall", 6, 3.4, { wall: "#ead9b8", shutter: "#8a5a34" }) }));
      room(STUDY, "study", lam("studyPlain", () => ({ map: rep(stoneHD("studyHD", ["#e6d4b0", "#dccaa6", "#eadcc0", "#d6c29c"], "#b39f7c"), 1, 1) })), lam("studyFloor", () => ({ map: rep(planksHD(), 1, 1), color: "#d9b48a" })));
      void studyWall;
      const [x, , z] = STUDY;
      const dz = SPOT.deskMark[2];
      box(b, M.dark, [x, 0.78, z + dz + 0.55], [1.8, 0.07, 0.8]); // desk top (in front of Mark)
      box(b, lam("deskFront", () => ({ map: rep(beamHD(), 1, 1), color: "#a8724a" })), [x, 0.39, z + dz + 0.92], [1.8, 0.78, 0.06]);
      for (const s of [-1, 1]) box(b, M.dark, [x + s * 0.85, 0.39, z + dz + 0.55], [0.08, 0.78, 0.76]);
      // the scroll on the desk, inkpot, oil lamp (flame is an HDR emissive for the bloom)
      b.add(new THREE.PlaneGeometry(0.9, 0.5).rotateX(-Math.PI / 2), lam("scrollPage", () => ({ color: "#f4ead2", side: THREE.DoubleSide })), new THREE.Matrix4().makeTranslation(x - 0.05, 0.818, z + dz + 0.6));
      for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.56, 10).rotateX(Math.PI / 2).rotateY(Math.PI / 2), lam("scrollRod", () => ({ color: "#e6d2a6" })), new THREE.Matrix4().makeTranslation(x - 0.05 + s * 0.47, 0.86, z + dz + 0.6));
      cyl(b, lam("inkpot", () => ({ color: "#2f3448" })), [x + 0.6, 0.815, z + dz + 0.45], 0.06, 0.05, 0.1, 10);
      cyl(b, M.terra, [x - 0.68, 0.815, z + dz + 0.42], 0.09, 0.06, 0.07, 12);
      this.flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8).scale(1, 1.8, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.2, 1.2) }));
      this.flame.position.set(x - 0.66, 0.93, z + dz + 0.42); this.flame.layers.set(NOINK); R.add(this.flame);
      // shelves of scrolls on the back wall, a window with sky
      const shelf = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), twoTone(new THREE.MeshLambertMaterial({ map: scrollsTex() })));
      shelf.position.set(x - 1.2, 1.75, z - 2.97); shelf.receiveShadow = true; R.add(shelf);
      box(b, M.dark, [x - 1.2, 1.18, z - 2.85], [2.3, 0.06, 0.3]); box(b, M.dark, [x - 1.2, 2.32, z - 2.85], [2.3, 0.06, 0.3]);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshBasicMaterial({ map: skyWinTex("studyWin", true), color: new THREE.Color(1.1, 1.05, 1.0) }));
      win.position.set(x + 1.4, 1.9, z - 2.99); win.layers.set(NOINK); R.add(win);
      box(b, M.dark, [x + 1.4, 1.32, z - 2.92], [1.1, 0.08, 0.16]);
    }
    b.build(this.grp("rooms"));
    // ======== BABEL: the plain of Shinar, the brickworks and the tower ========
    {
      const [bx, , bz] = BAB;
      b.add(flatQuad(bx - 260, bx + 260, bz - 260, bz + 260, 0.008, 10), M.dust);
      const mud = lam("mudBrickHD", () => ({ map: rep(stoneHD("mudBrickHD", ["#d9a46a", "#cf9a60", "#e0ad74", "#c89058"], "#9a6a40"), 1, 1) }));
      const tar = lam("tarPot", () => ({ color: "#2a2228" }));
      // settlers' houses round the open ground, palms, far hills
      for (let i = 0; i < 6; i++) flatHouse(b, bx - 26 + i * 10, bz + 18 + (i % 2) * 3, Math.PI, 7, 6, 4.5 + (i % 3) * 0.8, i + 1);
      for (let i = 0; i < 4; i++) flatHouse(b, bx - 30, bz - 4 + i * 8, Math.PI / 2, 7, 6, 4.8 + (i % 2), i + 2);
      for (let i = 0; i < 4; i++) flatHouse(b, bx + 30, bz - 2 + i * 8, -Math.PI / 2, 7, 6, 5 + (i % 2) * 0.7, i + 3);
      for (const [x, z, h] of [[-18, 8, 8], [17, 10, 7.5], [-22, -12, 8.5], [22, -14, 7], [-8, 30, 7], [12, 32, 8]] as const) palm(b, bx + x, bz + z, h, 40 + x);
      for (let i = 0; i < 8; i++) mountain(b, M.rock, bx - 300 + i * 85, bz - 420 - (i % 3) * 60, 40 + (i % 3) * 20, 90, 90 + i);
      // brickworks: stacks of baked bricks, moulds, a domed kiln and a pot of tar
      for (const [x, z, n] of [[9, -2.5, 4], [10.6, -2.8, 3], [7.4, -6.2, 5], [14.5, -4, 4], [3.6, -14.2, 3], [-3.8, -14, 4]] as const)
        for (let k = 0; k < n; k++) box(b, mud, [bx + x, 0.12 + k * 0.24, bz + z], [1.1 - (k % 2) * 0.1, 0.24, 0.7], (k % 2) * 0.1);
      b.add(new THREE.SphereGeometry(1.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mud, new THREE.Matrix4().makeTranslation(bx + 12, 0, bz - 8.6));
      box(b, tar, [bx + 12, 0.45, bz - 7.05], [0.9, 0.9, 0.12]);
      cyl(b, tar, [bx + 5.2, 0, bz - 15.6], 0.45, 0.35, 0.6, 14);
      cyl(b, M.terra, [bx + 9.6, 0, bz - 5.2], 0.4, 0.3, 0.5, 14);
      this.kilnFire = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8).scale(1.3, 1, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.6, 0.9) }));
      this.kilnFire.position.set(bx + 12, 0.42, bz - 6.95); this.kilnFire.layers.set(NOINK); R.add(this.kilnFire);
      // the tower: seven stepped tiers of mud brick with a front stair, each tier its own group so it can grow
      for (let i = 0; i < TIER_HALF.length; i++) {
        const tb = new Batch(), hs = TIER_HALF[i], g = new THREE.Group();
        tb.add(boxGeo(V(-hs, 0, -hs), V(hs, TIER_H, hs), 4), mud);
        tb.add(boxGeo(V(-hs - 0.12, TIER_H - 0.22, -hs - 0.12), V(hs + 0.12, TIER_H, hs + 0.12), 4), lam("tierLip", () => ({ color: "#e2b47a" })));
        for (let k = 0; k < 4; k++) { const x = -hs + (hs * 2) * (k + 0.5) / 4; tb.add(boxGeo(V(x - 0.35, 0.4, hs), V(x + 0.35, TIER_H - 0.5, hs + 0.3), 2), lam("tierRib", () => ({ color: "#c98f58" }))); }
        if (i < TIER_HALF.length - 1) { // stair up the front of this tier onto the next terrace
          const w = 1.6, steps = 12;
          for (let k = 0; k < steps; k++) tb.add(boxGeo(V(-w, 0, hs + 1.8 - (k + 1) * 0.15 - 0.02), V(w, (k + 1) * TIER_H / steps, hs + 1.8 - k * 0.15), 2), mud);
        }
        if (i >= 5) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) // scaffold poles on the unfinished top
          tb.add(new THREE.CylinderGeometry(0.08, 0.08, 5.5, 6).translate(sx * (hs + 0.4), 2.75, sz * (hs + 0.4)), M.dark);
        tb.build(g);
        g.position.set(bx, i * TIER_H, bz + TOWER_Z);
        g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
        this.tiers.push(g); R.add(g);
      }
    }
    b.build(this.grp("babel"));
    // light from heaven (Damascus road, Ananias' call): additive cone, placed and faded per frame (story.ts beamAt)
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 0.9, 60, 32, 1, true).translate(0, 30, 0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 0.95), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.beam.layers.set(NOINK); this.beam.visible = false; R.add(this.beam);

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
    const sea = new THREE.Mesh(quad(V(-1200, SEA_Y, QUAY_Z), V(1200, SEA_Y, QUAY_Z), V(1200, SEA_Y, -1300), V(-1200, SEA_Y, -1300)), waterM);
    sea.receiveShadow = true; R.add(sea);
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
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, s.set === "prison" || s.set === "study" ? 8 : 26, 95);
    if (s.light === "golden" && s.set === "harbour") Rr = Math.max(Rr, 30);
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
    if (s.set === "perga" || s.set === "babel") { this.fog.near = 160; this.fog.far = 1200; }
    if (s.set === "prison" || s.set === "study") { this.fog.near = 200; this.fog.far = 900; }
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden" && s.set === "harbour";
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
    const Wu = this.WU, wc = SEA[s.light];
    untone(wc.near, Wu.wNearC.value); untone(wc.mid, Wu.wMidC.value); untone(wc.far, Wu.wFarC.value);
    untone(wc.crest, Wu.wCrest.value); untone(wc.trough, Wu.wTrough.value); untone(wc.glint, Wu.wGlint.value);
    Wu.wShade.value.set(...wc.shade); Wu.wTime.value = t;
    // ---- props that move or appear per shot ----
    this.table.visible = false;
    const SETG: Record<string, string> = { court: "court", harbour: "harbour", coast: "harbour", village: "village", lystra: "village", perga: "perga", field: "field", prison: "rooms", study: "rooms", babel: "babel" };
    for (const [n, g] of Object.entries(this.groups)) g.visible = n === SETG[s.set];
    this.boat.visible = SETG[s.set] === "harbour";
    { const lv = s.set === "babel" ? towerAt(id, f) : 0;
      this.tiers.forEach((g, i) => { const k = clamp01x(lv - i); g.visible = k > 0.001; g.scale.set(1, Math.max(0.001, k), 1); });
      this.kilnFire.visible = s.set === "babel"; this.kilnFire.scale.set(1, 1 + 0.2 * Math.sin(t * 11), 1); }
    const moving = s.set === "harbour";
    const bp = moving ? boatPos(t) : ([5, SEA_Y, -5] as V3);
    this.boat.position.set(HARB[0] + bp[0], bp[1] + 1.0 + 0.05 * Math.sin(t * 1.6), HARB[2] + bp[2]);
    this.boat.rotation.set(0.02 * Math.sin(t * 1.3), moving ? -0.33 : 0, 0.025 * Math.sin(t * 1.1));
    const so = sailOpen(t);
    this.sail.scale.set(1, 0.08 + 0.92 * so, 1); this.sail.visible = true;
    this.flame.scale.set(1, 1 + 0.15 * Math.sin(t * 13) + 0.1 * Math.sin(t * 29), 1);
    { const bm = beamAt(id, t); this.beam.visible = bm.o > 0.01; this.beam.position.set(...bm.p); (this.beam.material as THREE.MeshBasicMaterial).opacity = bm.o; }
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

const clamp01x = (x: number) => Math.max(0, Math.min(1, x));
/** open-sea colours (the bridge's river palette is too turquoise for the Mediterranean) */
const SEA = {
  day: { near: "#2a86b8", mid: "#1f6aa8", far: "#3a73a8", crest: "#8fd0e8", trough: "#164f86", glint: "#ffffff", shade: [0.55, 0.6, 0.75] as [number, number, number] },
  golden: { near: "#2a4f86", mid: "#3d6a9a", far: "#e0a888", crest: "#e8b090", trough: "#1c335e", glint: "#ffe2b0", shade: [0.45, 0.5, 0.72] as [number, number, number] },
  storm: { near: "#4a6e78", mid: "#3e5e6e", far: "#6a7a8a", crest: "#d4dde2", trough: "#26404a", glint: "#e6eef4", shade: [0.6, 0.64, 0.75] as [number, number, number] },
  night: { near: "#1a2a50", mid: "#152446", far: "#22305a", crest: "#4a6aa0", trough: "#0c1630", glint: "#a8c0ff", shade: [0.5, 0.55, 0.8] as [number, number, number] },
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
