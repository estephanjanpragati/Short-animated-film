import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img, getInputProps, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";

import { TOTAL, FLASH_AT, SHOTS, layersAt, dofAt, LF } from "./story";
import { WORDS } from "./words";
import { CAPS, CAP_TEXT } from "./captions";

export const PAUL3_FRAMES = TOTAL;

/** A/B switches for test stills only (Remotion inputProps `{ post: { ink: false, ... } }`); everything is on by default. */
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** Bloom for emissive sources only (depth.md 6.4). Its MIP chain always starts at 540x960 (half of 1080x1920),
 *  whatever the output size, so the glow keeps the same size relative to the frame (e-fold ~30 px at 1080p,
 *  ~1.5 % of the frame height) at 540, 1080 and 1440 widths. ADD blend: HDR-safe (SCREEN darkens values > 1). */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }), // film grain, OFF by default (inputProps post.grain): the reference measures no grain and it quadruples the file size
  }), [camera, scene]);
  useEffect(() => () => { const d = (fx.ink as unknown as { dispose?: () => void }).dispose; if (typeof d === "function") d.call(fx.ink); }, [fx]); // guarded: unmounting a crossfade layer threw "dispose is not a function"
  const dNow = dofAt(f);
  // no blur this frame: SKIP both lens effects (the passes stay mounted in order; SKIP drops them from the shader,
  // saving ~3.7 s/frame in software GL). Re-mounting them instead scrambled the pass order (whole frame blurred).
  const lensOn = on.lens && dNow.cInf > 0.01;
  for (const e of [fx.lens.pre, fx.lens.main]) { const bf = lensOn ? BlendFunction.NORMAL : BlendFunction.SKIP; if (e.blendMode.blendFunction !== bf) e.blendMode.blendFunction = bf; }
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {[
        on.ink && fx.ink, on.lens && on.pre && fx.lens.pre, on.lens && fx.lens.main,
        on.bloom && fx.bloom, fx.tone, on.grade && fx.grade, on.grain && fx.grain,
      ].filter(effect => effect !== false).map((effect, index) => <primitive key={index} object={effect} dispose={null} />)}
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  // thin-lens focus: distance along the view axis to the shot's focus point (default: the camera's look target)
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  fx.grain.seed = f; // deterministic per frame
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

/** test stills only: inputProps `{ post: { dpr: 0.5 } }` forces the WebGL buffer size (R3F clamps dpr to >= 1 by default) */
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

// ---------------- text overlays (Hindi) ----------------
const TXT = { q: "पहले भगवान बनाया, फिर पत्थर मारे!", badge: "बाइबल: शुरू से अंत तक · प्रेरितों के काम 14", part: "पौलुस की यात्राएँ · भाग 3/9",
  next: "अगली रील: आधी रात के गीत", name: "Bible Stories For You", v: ["प्रेरितों 14:10", "प्रेरितों 14:15", "प्रेरितों 14:19", "प्रेरितों 14:22"] };
const FONT = '"Noto Sans Devanagari", "Nirmala UI", "Arial Black", "Segoe UI Black", "Noto Sans", sans-serif';
const pop = (f: number, a: number, b: number) => interpolate(f, [a, a + 8, b - 8, b], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const Big: React.FC<{ children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties }> = ({ children, size, color = "#ffd23f", style }) => (
  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.25, color, textAlign: "center", WebkitTextStroke: `${size * 0.09}px #1b1530`,
    paintOrder: "stroke fill", textShadow: `0 ${size * 0.08}px 0 #1b1530`, ...style }}>{children}</div>
);
const Pill: React.FC<{ children: React.ReactNode; size: number; style?: React.CSSProperties }> = ({ children, size, style }) => (
  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, color: "#ffd23f", background: "rgba(27,21,48,0.88)", border: `${size * 0.12}px solid #ffd23f`,
    borderRadius: size * 1.2, padding: `${size * 0.35}px ${size * 0.8}px`, ...style }}>{children}</div>
);
/** word-by-word captions: the current chunk of up to 3 words, the spoken word in yellow, a small pop on each new chunk */
const Captions: React.FC<{ until: number; from: number }> = ({ until, from }) => {
  const f = useCurrentFrame(), t = f / 30;
  if (f < from || f >= until) return null;
  let ci = -1;
  for (let i = 0; i < CAPS.length; i++) { if (WORDS[CAPS[i][0]][1] - 0.05 <= t) ci = i; else break; }
  if (ci < 0) return null;
  const [a, b] = CAPS[ci], end = WORDS[b][2] + 0.25;
  const nextStart = CAPS[ci + 1] ? WORDS[CAPS[ci + 1][0]][1] - 0.05 : Infinity;
  if (t > end && t < nextStart) return null;
  const age = t - (WORDS[a][1] - 0.05), s = 0.86 + 0.14 * Math.min(1, age / 0.12);
  const words = [];
  for (let k = a; k <= b; k++) {
    const on = WORDS[k][1] - 0.03 <= t;
    const txt = CAP_TEXT[k].replace(/[।,:]$/, "");
    words.push(<span key={k} style={{ color: on ? "#ffd23f" : "#ffffff", margin: "0 14px" }}>{txt}</span>);
  }
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 1300 }}>
      <div style={{ transform: `scale(${s})`, fontFamily: FONT, fontWeight: 900, fontSize: 96, lineHeight: 1.2, textAlign: "center", width: 980,
        WebkitTextStroke: "9px #1b1530", paintOrder: "stroke fill", textShadow: "0 7px 0 #1b1530" }}>{words}</div>
    </AbsoluteFill>
  );
};
const Overlays: React.FC = () => {
  const f = useCurrentFrame();
  const hook = pop(f, -10, FLASH_AT + 2);
  const spans: [number, number][] = [[LF(3, 16), LF(4, 0)], [LF(5, 12), LF(6, 0)], [LF(6, 7), LF(6, 13)], [LF(8, 7), LF(9, 0)]];
  const endAt = LF(10, 14);
  const end = pop(f, endAt, TOTAL + 20);
  // a white flash on the healing and on the rising
  const flash = Math.max(0, 1 - Math.abs(f - LF(3, 18)) / 5) * 0.55 + Math.max(0, 1 - Math.abs(f - LF(7, 8)) / 5) * 0.45;
  return (
    <>
      {flash > 0.01 && <AbsoluteFill style={{ background: "#fff8e0", opacity: flash }} />}
      {hook > 0.01 && (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 120, opacity: hook,
          background: "linear-gradient(180deg, rgba(20,16,40,0.78) 0%, rgba(20,16,40,0.55) 26%, rgba(20,16,40,0) 42%)" }}>
          <Pill size={36} style={{ marginBottom: 34 }}>{TXT.badge}</Pill>
          <Big size={100} style={{ width: 1010 }}>{TXT.q}</Big>
        </AbsoluteFill>)}
      {spans.map(([a, b], i) => { const o = pop(f, a, b); return o > 0.01 ? (
        <AbsoluteFill key={i} style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 210, opacity: o }}><Pill size={50}>{TXT.v[i]}</Pill></AbsoluteFill>) : null; })}
      <Captions from={FLASH_AT} until={endAt} />
      {end > 0.01 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: end, background: "rgba(20,16,40,0.62)" }}>
          <Img src={staticFile("cover/logo.png")} style={{ width: 380, height: 380, borderRadius: 190, border: "12px solid #ffd23f", boxShadow: "0 14px 0 #1b1530" }} />
          <Big size={70} color="#ffffff" style={{ marginTop: 36 }}>{TXT.name}</Big>
          <Pill size={44} style={{ marginTop: 30 }}>{TXT.part}</Pill>
          <Big size={84} style={{ marginTop: 30, width: 1000 }}>{TXT.next}</Big>
        </AbsoluteFill>)}
    </>
  );
};

export const Paul3Short: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      <Overlays />
    </AbsoluteFill>
  );
};
