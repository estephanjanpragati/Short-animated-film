// 2D character sheet for quick checks (no WebGL): every cast member in the poses the film uses.
import React, { useEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Pen, bodyFront, bodySide, Outfit, FrontOpts, SideOpts } from "./toon";
import { PAUL, BARNABAS, MARK, MARK_OLD, SILAS, folk, COACH_A, COACH_B, PLAYER, fxStone, fxSteam, fxVein, fxLetter, fxSpark } from "./people";

type Cell = { o: Outfit; f?: FrontOpts; s?: SideOpts };
const CELLS: Cell[] = [
  { o: PAUL, f: { expr: "stern", mode: "stand", arms: "cross", facing: 1 } }, { o: BARNABAS, f: { expr: "grin", mode: "stand", arms: "open", facing: -1 } },
  { o: MARK, f: { expr: "nervous", mode: "stand", facing: 0 } }, { o: SILAS, f: { expr: "smile", mode: "stand", facing: 0 } },
  { o: PAUL, f: { expr: "shock", mode: "stand", arms: "point", facing: 1 } }, { o: BARNABAS, f: { expr: "pained", mode: "stand", arms: "point", facing: 1 } },
  { o: MARK, s: { expr: "neutral", mode: "march", phase: 0.2, stride: 0.8 } }, { o: PAUL, s: { expr: "neutral", mode: "march", phase: 0.6, stride: 0.8 } },
  { o: MARK_OLD, f: { expr: "smile", mode: "sit", arms: "write", facing: 0 } }, { o: PAUL, f: { expr: "smile_closed", mode: "sit", arms: "write", facing: 0 } },
  { o: folk(0), f: { expr: "smile", mode: "stand" } }, { o: folk(1), f: { expr: "grin", mode: "stand" } }, { o: folk(2), f: { expr: "neutral", mode: "stand" } },
  { o: COACH_A, f: { expr: "stern", mode: "stand", arms: "cross" } }, { o: COACH_B, f: { expr: "smile", mode: "stand", arms: "open" } }, { o: PLAYER, s: { expr: "pained", mode: "march", phase: 0.3, stride: 0.6 } },
];
export const CastSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.fillStyle = "#cfe3f2"; g.fillRect(0, 0, 1080, 1920);
    CELLS.forEach((c, i) => {
      g.save(); g.translate((i % 4) * 270, Math.floor(i / 4) * 400 + 10); g.scale(0.45, 0.38);
      const p = new Pen(g);
      if (c.s) bodySide(p, c.o, { light: -2.1, seed: i + 1, ...c.s }); else bodyFront(p, c.o, { light: -2.1, seed: i + 1, ...c.f });
      g.restore();
    });
    const fx: [(p: Pen) => void, number, number][] = [[(p) => fxStone(p, 1), 20, 1620], [(p) => fxSteam(p, 0.5), 260, 1600], [(p) => fxVein(p), 560, 1620], [(p) => fxLetter(p), 760, 1640], [(p) => fxSpark(p), 900, 1780]];
    for (const [d, x, y] of fx) { g.save(); g.translate(x, y); g.scale(0.8, 0.8); d(new Pen(g)); g.restore(); }
  }, []);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1920} /></AbsoluteFill>;
};
