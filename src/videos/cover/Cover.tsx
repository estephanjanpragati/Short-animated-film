// "Should women cover their head in church?" (Have You Ever Thought? Day 1), in the flat-characters-in-a-3D-toon-world style.
// The picture is the same for both languages; only the text overlays follow inputProps { lang: "en" | "hi" }.
// One three.js world (world.ts) posed per frame from the story timeline (story.ts). Post chain (look-match pass):
//   InkPass (world ink lines, own pass) -> lens blur pre + main (thin-lens DOF per shot from dofAt) ->
//   [bloom (emissive only) + NEUTRAL tone mapping + colour grade] (one merged EffectPass), MSAA 4.
// Ink runs before the DOF so lines blur with what they belong to; bloom after the DOF so glows defocus with their
// source; the grade is display-referred, so it comes after tone mapping. Every pixel-sized parameter is specified at
// 1080x1920 and scaled with the output size, so stills at --scale 0.5 and the 1440x2560 final match.
// Place changes crossfade by stacking a second canvas for the fade frames; the hook ends on a 4-frame white flash.
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

import { TOTAL, FLASH_AT, SHOTS, layersAt, dofAt, W } from "./story";

export const COVER_FRAMES = TOTAL;

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
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
      {on.grain ? <primitive object={fx.grain} dispose={null} /> : null}
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

// ---------------- text overlays (language from inputProps.lang) ----------------
type Lang = "en" | "hi";
const lang = (): Lang => ((getInputProps() as { lang?: Lang }).lang === "hi" ? "hi" : "en");
const TXT = {
  en: { q: "SHOULD WOMEN COVER THEIR HEAD IN CHURCH?", badge: "DAY 1 · HAVE YOU EVER THOUGHT?", day: "DAY 1", of: "of our series", series: "Have You Ever Thought?",
    v3: "1 Corinthians 11:5", v6: "1 Corinthians 11:13–15", v9: "1 Samuel 16:7", v10: "Romans 14:5", cta: "Tell me in the comments", name: "Bible Stories For You" },
  hi: { q: "क्या चर्च में सिर ढकना ज़रूरी है?", badge: "“कभी सोचा है?” · पहला दिन", day: "पहला दिन", of: "हमारी सीरीज़", series: "“कभी सोचा है?”",
    v3: "1 कुरिन्थियों 11:5", v6: "1 कुरिन्थियों 11:13–15", v9: "1 शमूएल 16:7", v10: "रोमियों 14:5", cta: "कमेंट में बताइए", name: "Bible Stories For You" },
};
const FONT = '"Arial Black", "Segoe UI Black", "Nirmala UI", "Noto Sans Devanagari", "Noto Sans", sans-serif';
const pop = (f: number, a: number, b: number) => interpolate(f, [a, a + 8, b - 8, b], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const Big: React.FC<{ children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties }> = ({ children, size, color = "#ffd23f", style }) => (
  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.08, color, textAlign: "center", WebkitTextStroke: `${size * 0.09}px #1b1530`,
    paintOrder: "stroke fill", textShadow: `0 ${size * 0.08}px 0 #1b1530`, ...style }}>{children}</div>
);
const Pill: React.FC<{ children: React.ReactNode; size: number; style?: React.CSSProperties }> = ({ children, size, style }) => (
  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, color: "#ffd23f", background: "rgba(27,21,48,0.88)", border: `${size * 0.12}px solid #ffd23f`,
    borderRadius: size * 1.2, padding: `${size * 0.35}px ${size * 0.8}px`, ...style }}>{children}</div>
);
const Overlays: React.FC = () => {
  const f = useCurrentFrame(), L = TXT[lang()], sh = (id: number) => SHOTS[id - 1];
  const hook = pop(f, -10, FLASH_AT + 2), card = pop(f, sh(2).a + 2, sh(3).a);
  const v3 = pop(f, sh(3).a + 12, sh(4).a), v6 = pop(f, W("he even says"), sh(7).a), v9 = pop(f, W("god looks at"), sh(10).a), v10 = pop(f, W("let each one"), sh(11).a);
  const end = pop(f, sh(11).a + 4, TOTAL + 20);
  const verse = (o: number, t: string) => o > 0.01 && (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 300, opacity: o }}><Pill size={56}>{t}</Pill></AbsoluteFill>);
  return (
    <>
      {hook > 0.01 && (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 150, opacity: hook }}>
          <Pill size={40} style={{ marginBottom: 40 }}>{L.badge}</Pill>
          <Big size={98} style={{ width: 960 }}>{L.q}</Big>
        </AbsoluteFill>)}
      {card > 0.01 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: card, transform: `scale(${0.92 + 0.08 * card})` }}>
          <Big size={230} color="#ffffff">{L.day}</Big>
          <Big size={64} color="#ffffff" style={{ marginTop: 20 }}>{L.of}</Big>
          <Big size={108} style={{ marginTop: 16, width: 1000 }}>{L.series}</Big>
        </AbsoluteFill>)}
      {verse(v3, L.v3)}{verse(v6, L.v6)}{verse(v9, L.v9)}{verse(v10, L.v10)}
      {end > 0.01 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: end, background: "rgba(20,16,40,0.62)" }}>
          <Img src={staticFile("cover/logo.png")} style={{ width: 380, height: 380, borderRadius: 190, border: "12px solid #ffd23f", boxShadow: "0 14px 0 #1b1530" }} />
          <Big size={70} color="#ffffff" style={{ marginTop: 36 }}>{L.name}</Big>
          <Big size={84} style={{ marginTop: 26, width: 1000 }}>{L.cta}</Big>
        </AbsoluteFill>)}
    </>
  );
};

export const CoverShort: React.FC = () => {
  const f = useCurrentFrame();
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      <Overlays />
    </AbsoluteFill>
  );
};
