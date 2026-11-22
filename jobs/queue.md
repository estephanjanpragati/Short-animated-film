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

## 011 - NEW REEL: Two Mountains, Abraham and Aaron (Have You Ever Thought? Day 2), ENGLISH only
Hindi follows later (the Hindi voice is waiting on ElevenLabs credits).
- render: `npx remotion render src/index.ts MountainsShort out/two-mountains_EN.mp4 --gl=angle --codec=h264 --crf=16 --muted --timeout=240000 --scale=1.3333333333333333 --props=jobs/props_en.json`
- mux (system ffmpeg, as in WORKER.md step 3): out/two-mountains_EN.mp4 + audio/two-mountains_EN.m4a -> exports/two-mountains_EN.mp4, AAC re-encode, volume check (about -17 dB mean).
- contact sheet -> reports/two-mountains_sheet.jpg (fps=0.5, scale=240:-1, tile=6x7), commit + push reports/ and add 011 to jobs/done.md.
- copy to FINAL VIDEOS\ as "Two Mountains - Day 2 - ENGLISH.mp4" and upload it to the Drive folder "Bible Reels - FINAL" if you can without a new login.
- 77.9 s, 2337 frames. Expect about 15 minutes. Run once, no loop. Report DONE 011.

## 012 - Two Mountains ENGLISH re-render (replaces 011)
Fixed: Sinai wide shot (~36 s) now shows the crowd and a smaller mountain; the angel light (~28-31 s) no longer washes the frame white; the ram close-up (~31 s) is no longer blocked by Isaac; Isaac's wood bundle no longer covers his face (~22-26 s).
- Same commands as 011 (render, mux with audio/two-mountains_EN.m4a, volume check, sheet -> reports/two-mountains_sheet.jpg).
- Replace "Two Mountains - Day 2 - ENGLISH.mp4" in FINAL VIDEOS\. Run once, no loop. Report DONE 012.

## 013 - TWO NEW REELS, English + Hindi (4 renders). Voice: the user's own cloned voice.
Both are "The Bible, Start to Finish". Picture is the same per reel; only the on-screen text changes with --props.
- AbrahamShort (81.1 s, 2433 frames): render `out/abraham_EN.mp4` with `--props=jobs/props_en.json` and `out/abraham_HI.mp4` with `--props=jobs/props_hi.json`
- AaronShort (74.5 s, 2235 frames): render `out/aaron_EN.mp4` and `out/aaron_HI.mp4` the same way
- render flags as always: `--gl=angle --codec=h264 --crf=16 --muted --timeout=240000 --scale=1.3333333333333333` (--concurrency=4 is fine)
- mux each with audio/abraham_EN.m4a, abraham_HI.m4a, aaron_EN.m4a, aaron_HI.m4a -> exports/, AAC re-encode, volume check
- contact sheets of the two EN videos -> reports/abraham_sheet.jpg and reports/aaron_sheet.jpg
- copy to FINAL VIDEOS\ as "Abraham on the Mountain - ENGLISH.mp4", "Abraham on the Mountain - HINDI.mp4", "Aaron and the Golden Calf - ENGLISH.mp4", "Aaron and the Golden Calf - HINDI.mp4"
- Expect about 1 hour for all four. Run once, no loop. Report DONE 013.

## 014 - PAUL'S JOURNEYS, PART 1 (Hindi only, 1 render). Voice: ElevenLabs "Harish".
New series "पौलुस की यात्राएँ" (9 reels, docs/paul-journeys_SERIES.md). From now on every reel is Hindi only, so there is no --props.
- Paul1Short (64.8 s, 1945 frames): render `out/paul1_HI.mp4`
- render flags as always: `--gl=angle --codec=h264 --crf=16 --muted --timeout=240000 --scale=1.3333333333333333` (--concurrency=4 is fine)
- mux with audio/paul1_HI.m4a -> exports/, AAC re-encode, volume check
- contact sheet -> reports/paul1_sheet.jpg (check: the night shots 7-8 are dark blue but readable, the light from heaven in shots 4-5 does not white out Saul)
- copy to FINAL VIDEOS\ as "Paul 1 - Saul to Paul - HINDI.mp4"
- Expect about 15 minutes. Run once, no loop. Report DONE 014.
