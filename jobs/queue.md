# Render jobs (written by the planner)

Worker: do jobs in order, skip any id already in jobs/done.md.
GL flag: use the one that passed your still test (expected `--gl=angle` on Windows + RTX).
Before job 001, run the still test from WORKER.md (NoahShort frame 900) and put still_seconds + gl in reports/STATUS.md.

## 001 - Noah, speed test
- comp: NoahShort   name: noah-the-door   extra: --frames=0-299 --scale=1.3333333333333333
- output: out/noah-test.mp4 only (no mux, no sheet). Report render_min and frames/second in STATUS.md, then continue.

## 002 - Paul, Barnabas & Mark (full)
- comp: MarkShort   name: paul-barnabas-mark   extra: --scale=1.3333333333333333   (1440x2560, 2465 frames)
- mux EN + HI, contact sheet, report.

## 003 - Noah and the door (full)
- comp: NoahShort   name: noah-the-door   extra: --scale=1.3333333333333333   (1440x2560, 2154 frames)
- mux EN + HI, contact sheet, report.

## 004 - Cain and Abel (full)
- comp: CainShort   name: cain-and-abel   extra: --scale=1.3333333333333333   (1440x2560, 2259 frames)
- mux EN + HI, contact sheet, report.

## 005 - FIX: no audio in exports (do this NOW, before or right after the current render)
The user hears no sound in exports/paul-barnabas-mark_EN.mp4 / _HI.mp4. The audio files in audio/ are fine (mean -17 dB).
1. Diagnose: `ffprobe -v error -show_entries stream=index,codec_type,codec_name,duration -of compact exports/paul-barnabas-mark_EN.mp4`
   and `ffmpeg -hide_banner -i exports/paul-barnabas-mark_EN.mp4 -map 0:a:0 -af volumedetect -f null NUL`. Put both outputs in STATUS.md.
2. Re-mux EN + HI with the new step 3 in WORKER.md (system ffmpeg, -c:a aac re-encode, explicit -map). Check that mean_volume is about -17 dB for both.
3. Use the same new mux for 003 and 004. If either was already muxed the old way, re-mux it.
4. Tell the user to play exports\paul-barnabas-mark_EN.mp4 (NOT the silent picture-only file in out\).

## 006 - Noah re-render (fix: empty field at 49.7-51.4 s)
src/videos/noah/world.ts now shows the room set on "but the handle is on your side" (was an empty green field).
- comp: NoahShort   name: noah-the-door   extra: --scale=1.3333333333333333
- new mux (WORKER.md step 3) + volume check, contact sheet, replace the files in FINAL VIDEOS\ ("Noah and the Door - ENGLISH/HINDI.mp4").
- Do this after 004 finishes.

## 007 - Cain re-render (2 fixes)
- story.ts S1b: on "one of them ended up killing the other" (~4 s) the camera now pushes onto Cain at his altar (was empty ground).
- world.ts: on "the bible says" (~35 s) Abel's close-up now shows the altars set behind him (was the wrong, washed-out set).
- comp: CainShort   name: cain-and-abel   extra: --scale=1.3333333333333333
- new mux + volume check, contact sheet, replace "Cain and Abel - ENGLISH/HINDI.mp4" in FINAL VIDEOS\. Do this after 006.

## 008 - Noah re-render (replaces 006, which darkened the final room shots)
Shot 12 no longer cuts to the room: the friend keeps knocking in the rain through "but the handle is on your side"
(world.ts room-visibility change reverted; story.ts / cast.ts keep shot 12 on the cottage).
- comp: NoahShort   name: noah-the-door   extra: --scale=1.3333333333333333
- Compare t=50, 60, 64, 68, 71 s with the OLD 003 render. Ends must be bright (brown door, white brick); ~50 s must show the friend at the door (not an empty field).
- If OK: new mux + volume check, sheet, replace "Noah and the Door - ENGLISH/HINDI.mp4" in FINAL VIDEOS\.

# QUEUE CLOSED: no open jobs. See jobs/STOP.md. Do not render.

## 009 - NEW REEL: Should women cover their head in church? (Have You Ever Thought? Day 1)
Two renders this time: the picture is the same, but the on-screen text is English in one and Hindi in the other.
- render EN: `npx remotion render src/index.ts CoverShort out/head-covering_EN.mp4 --gl=angle --codec=h264 --crf=16 --muted --timeout=240000 --scale=1.3333333333333333 --props=jobs/props_en.json`
- render HI: same command with `out/head-covering_HI.mp4` and `--props=jobs/props_hi.json`
- mux (system ffmpeg, as in WORKER.md step 3): out/head-covering_EN.mp4 + audio/head-covering_EN.m4a -> exports/head-covering_EN.mp4; same for HI.
- volume check (about -17 dB mean), contact sheet of the EN video -> reports/head-covering_sheet.jpg
- copy to FINAL VIDEOS\ as "Head Covering - Day 1 - ENGLISH.mp4" and "Head Covering - Day 1 - HINDI.mp4"
- Also upload both exports to the Google Drive folder "Bible Reels - FINAL" (the same folder the user used before) if you can do it without logging in to anything new; otherwise tell the user to drag them in.
- 71.5 s, 2145 frames each. Expect about 25 minutes for both renders.
- Run once, no loop. Report DONE 009 when finished.

## 010 - Head covering ENGLISH only: hook text fix
On Windows the English question wrapped to 4 lines and sat on top of the women's faces (it's the thumbnail frame). Cover.tsx now uses a smaller English size and adds a dark band behind the text. Hindi is unchanged.
- render: `npx remotion render src/index.ts CoverShort out/head-covering_EN.mp4 --gl=angle --codec=h264 --crf=16 --muted --timeout=240000 --scale=1.3333333333333333 --props=jobs/props_en.json`
- mux with audio/head-covering_EN.m4a -> exports/head-covering_EN.mp4, check the volume, and save one frame at 2 s to reports/head-covering_EN_hook.jpg
- replace "Head Covering - Day 1 - ENGLISH.mp4" in FINAL VIDEOS\. Run once, no loop. Start only when the user says so.
