// picture timeline -> JSON for the sound: usage tsx export_tl.ts <reel: mark|noah|cain> <out.json> "phrase|phrase|..."
import fs from "node:fs";
const reel = process.argv[2], out = process.argv[3], phrases = (process.argv[4] || "").split("|").filter(Boolean);
const S = await import(`../../src/videos/${reel}/story.ts`);
const Wd = await import(`../../src/videos/${reel}/words.ts`);
const cues: Record<string, number> = {};
for (const p of phrases) cues[p] = S.T(p);
const extra: Record<string, unknown> = {};
for (const k of ["HITS", "DOWN_AT", "KNOCKS"]) if (k in S) extra[k.toLowerCase()] = S[k];
fs.writeFileSync(out, JSON.stringify({ fps: 30, total: S.TOTAL, flash: S.FLASH_AT, xfade: S.XFADE, shots: S.SHOTS.map((s: { id: number; a: number; b: number; set: string; light: string }) => ({ id: s.id, a: s.a, b: s.b, set: s.set, light: s.light })),
  kicks: S.KICKS, cues, words: Wd.WORDS, lines: Wd.LINES ?? null, ...extra }, null, 1));
console.log("ok", reel, S.TOTAL, Object.keys(cues).length);
