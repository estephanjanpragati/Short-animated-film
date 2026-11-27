# Worker status

WORKER READY os=Windows 11 Home 10.0.26300 gpu=NVIDIA GeForce RTX 4060 Laptop GPU (+ Intel UHD) gl=--gl=angle still_seconds=6.7

- still test: NoahShort frame 900, `--gl=angle`. Image shows the wooden ark, ramp and four cartoon people at the door. Looks correct.
- first run took 34.4 s (includes Headless Shell download and bundling); warm run 6.7 s.
- node=v24.19.0, npm=11.17.0, git=2.56.0, free_disk_F=172.8 GB
- npm install: ok (283 packages). Note: npm skipped the esbuild postinstall script (allow-scripts); rendering works anyway.
- Repo in use: `estephanjanpragati/Short-animated-film` (not `bible-reels`). Local clone: `F:\short animated film\bible-reels`.
- `user-aa` could not be reached by direct message, so reports go through this file.
- DONE 001 noah-test: 300 frames at 1440x2560 (--scale=1.3333), --gl=angle, h264 crf16. render_min=1.74 (104.1 s wall, bundle cached), ~2.9 frames/second. Output 39.1 MB (out/noah-test.mp4, kept local).
  Estimate for full jobs at this speed: 002 (2465 frames) ~14 min, 003 (2154) ~12.5 min, 004 (2259) ~13 min.
- DONE 002 paul-barnabas-mark: duration=82.17s res=1440x2560 30fps h264+aac, render_min=12.67 (760 s, 2465 frames, ~3.2 fps), sheet=reports/paul-barnabas-mark_sheet.jpg.
  Files kept local: exports/paul-barnabas-mark_EN.mp4 (165.5 MB), exports/paul-barnabas-mark_HI.mp4 (165.5 MB).
  QA from sheet (41 frames, every 2 s): no black frames, no missing or floating characters, blur looks consistent, no sudden jumps seen. Last tile is empty only because 41 frames fill 42 slots. Grey-blue prison-wall shots near the end look like an intentional grade.
  Note: Remotion's bundled ffmpeg has no fps/tile/select filters, so the contact sheet is built with the system ffmpeg (Gyan build) instead. Muxing still uses `npx remotion ffmpeg`.
- DONE 005 (no-audio fix) for paul-barnabas-mark:
  Diagnosis of the ORIGINAL export before re-mux: the file already had an audio track.
  `ffprobe`: stream|index=0|codec_name=h264|codec_type=video|duration=82.133333 ; stream|index=1|codec_name=aac|codec_type=audio|duration=82.166000
  `volumedetect` (EN, original): mean_volume -18.0 dB, max_volume -1.1 dB (same as audio/paul-barnabas-mark_EN.m4a). So the first mux was not silent on disk.
  Re-muxed EN + HI with system ffmpeg (-map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart).
  After: EN mean -18.0 dB / max -1.1 dB; HI mean -16.9 dB / max -1.1 dB. Both aac 48 kHz stereo, 82.17 s, 1440x2560. (EN is -18, not -17, because the source itself is -18.)
  If the user still hears nothing, the likely cause is the player or the file played (out\ is silent by design), not the export.
- DONE 003 noah-the-door: duration=71.80s res=1440x2560 30fps h264+aac, render_min=10.41 (624.5 s, 2154 frames, ~3.45 fps), sheet=reports/noah-the-door_sheet.jpg.
  Muxed with the new step (system ffmpeg, aac 320k 48 kHz). Volume: EN mean -17.7 dB / max -1.2; HI mean -17.0 dB / max -1.1.
  Copies: FINAL VIDEOS\Noah and the Door - ENGLISH.mp4 / - HINDI.mp4.
  QA from sheet (36 frames, every 2 s; the black bottom rows are unused tiles): no black frames, no floating characters seen. Notes, probably intentional but please confirm:
  (a) sheet row 2 col 5 (~t=20 s): two shots overlap as a semi-transparent dissolve (ghosted faces over the sunset row);
  (b) row 3 col 2 (~t=26 s): empty pink/purple sky only, no characters;
  (c) row 5 col 2 (~t=50 s): empty green field under a dark blue sky, no characters;
  (d) row 3 cols 5-6 (~t=32-34 s): door close-up with a bright glow patch at the top that looks slightly blown out.
- DONE 004 cain-and-abel: duration=75.30s res=1440x2560 30fps h264+aac, render_min=13.83 (829.9 s, 2259 frames, ~2.7 fps), sheet=reports/cain-and-abel_sheet.jpg.
  New mux (system ffmpeg, aac 320k 48 kHz). Volume: EN mean -18.1 dB / max -1.0; HI mean -17.0 dB / max -1.1.
  Copies: FINAL VIDEOS\Cain and Abel - ENGLISH.mp4 / - HINDI.mp4.
  QA from sheet (38 frames, every 2 s; empty bottom tiles are unused slots): no black frames, no floating characters seen. Notes, probably intentional:
  (a) row 1 col 3 (~t=4 s): empty orange ground, characters out of frame after walking off;
  (b) rows 3-4 (~t=24-26 s, ~32 s, ~40 s): several ghosted dissolves between shots;
  (c) row 6 col 3 (~t=52 s): ground close-up with an orange ring/glow and a stick, no characters.
- DONE 006 noah-the-door (re-render) WITH A REGRESSION: duration=71.80s res=1440x2560, render_min~10.5, sheet=reports/noah-the-door_sheet.jpg (new), exports/noah-the-door_EN/HI.mp4 re-muxed (EN mean -17.7 dB, HI -17.0 dB).
  FIXED: the shot at ~50 s now shows the door and handle (sheet row 5 col 2), no more empty green field.
  REGRESSION: the last shots (~t=66-71 s, sheet row 6 cols 4-6) are almost black. The door, wall and floor are dark navy; only the gold handle and the light strip at the bottom are visible. In the first render (job 003) the same shots were bright (brown door, white brick wall, handle).
  Before/after at t=60/64/68/71 s: reports/noah_006_end_regression.png (top row = old job-003 render, bottom row = new). t=60 and 64 are the same in both; 68 and 71 are the dark ones.
  Because of this, FINAL VIDEOS\ still holds the OLD Noah files (with the empty-field shot). The new files are in exports\ only. Waiting for the planner to fix the lighting (probably the world.ts change) and queue a new job.
- DONE 007 cain-and-abel (re-render): duration=75.30s res=1440x2560, render_min~13.8, sheet=reports/cain-and-abel_sheet.jpg (new). Mux: EN mean -18.1 dB / max -1.0; HI mean -17.0 dB / max -1.1.
  Compared old (FINAL VIDEOS, job 004) vs new at t=3, 5, 12, 35, 36, 52, 62, 74 s:
  - t=5 s FIXED: camera now pushes onto Cain at his brick altar (was empty ground).
  - t=35-36 s FIXED: Abel's close-up now has the altar/hills set behind him (was the washed-out set). A faint ghost of trees is visible at t=35, which looks like the dissolve in progress.
  - t=3, 12, 52, 62, 74 s identical to the old render. No new regressions, no black frames.
  Replaced "Cain and Abel - ENGLISH/HINDI.mp4" in FINAL VIDEOS\ with the new files.
- DONE 008 noah-the-door (re-render, replaces 006): duration=71.80s res=1440x2560, render_min=11.52 (691 s, 2154 frames), sheet=reports/noah-the-door_sheet.jpg (new). Mux: EN mean -17.7 dB / max -1.2; HI mean -17.0 dB / max -1.1.
  Compared old job-003 render (FINAL VIDEOS) vs new at t=50, 60, 64, 68, 71 s:
  - t=50 s FIXED: the friend in the yellow hat now stands knocking at the door in the rain (was an empty green field under a dark blue sky).
  - t=60, 64, 68, 71 s identical to the old render and bright (brown door, white brick wall, handle). The dark ending from job 006 is gone.
  Sheet: no black frames, no floating characters; the black bottom rows are unused tiles. The earlier ghosted dissolve (~20 s), empty pink sky (~26 s) and blown-out glow (~32-34 s) are unchanged and were left as intentional by the planner.
  Replaced "Noah and the Door - ENGLISH/HINDI.mp4" in FINAL VIDEOS\ with the new files.
- DONE 009 head-covering (EN + HI): duration=71.50s res=1440x2560 30fps, render_min ~13.0 each (HI 780 s; EN about the same), sheets=reports/head-covering_sheet.jpg (EN) and reports/head-covering_sheet_HI.jpg.
  Volume (new AAC mux): EN mean -17.7 dB / max -1.2; HI mean -16.9 dB / max -1.2.
  Copies: FINAL VIDEOS\Head Covering - Day 1 - ENGLISH.mp4 / - HINDI.mp4.
  QA from both sheets (36 frames each): no black frames, no floating characters, text overlays legible, Hindi text renders correctly, end card shows "Bible Stories For You". Note: in the first three tiles (~t=0-4 s) the title text overlaps the top of the characters' heads ("HEAD IN CHURCH?" over the yellow-haired head, "CHURCH?" over the black hair); may be intended.
  Google Drive upload NOT done (about 160 MB per file, too large for the Drive connector); the user drags both files into "Bible Reels - FINAL" by hand.
- DONE 010 head-covering ENGLISH only (hook text fix): duration=71.50s res=1440x2560, render_min=11.39 (683.5 s). The first attempt crashed at frame ~1026/2145 with "Chrome ran out of memory" (concurrency 8, other apps open, probably GPU memory); the one retry used --concurrency=4 after the user's other apps were closed, and passed.
  Volume (new AAC mux): EN mean -17.7 dB / max -1.2. Hook frame at 2 s: reports/head-covering_EN_hook.jpg. The title is now 3 lines above the women's faces on a dark band, no overlap with heads. Contact sheet refreshed: reports/head-covering_sheet.jpg.
  Replaced FINAL VIDEOS\Head Covering - Day 1 - ENGLISH.mp4. Hindi is unchanged.
- DONE 011 two-mountains (ENGLISH only, MountainsShort): duration=77.90s res=1440x2560 30fps h264+aac, render_min=14.00 (839.6 s, 2337 frames, --concurrency=4 because the user was editing video on this PC), sheet=reports/two-mountains_sheet.jpg.
  Volume (new AAC mux): mean -18.5 dB / max -1.1 (a bit quieter than the usual -17 to -18; the source audio is the same level).
  Copy: FINAL VIDEOS\Two Mountains - Day 2 - ENGLISH.mp4. Google Drive upload NOT done (file too big for the connector); the user drags it in by hand.
  QA from the sheet (39 frames, every 2 s; empty last tiles are unused slots): no black frames, no floating characters, hook text clear of faces, end card "Bible Stories For You / Abraham or Aaron? Tell me in the comments" fades in at the end. Notes, probably intentional:
  (a) ~t=36-40 s (sheet row 4 cols 1-3): wide shot with a heavily blurred hill in the foreground and tiny characters;
  (b) ~t=26-28 s (row 3 cols 3-4): bright white-washed flash shot with tree outlines;
  (c) ~t=30 s (row 3 col 5): extreme close-up of a face/neck, head cut off;
  (d) ~t=56 s (row 5 col 6): ghosted dissolve between two shots.
- DONE 012 two-mountains ENGLISH re-render (replaces 011): duration=77.90s res=1440x2560, render_min=14.52 (871.5 s, 2337 frames, --concurrency=4), sheet=reports/two-mountains_sheet.jpg. Volume mean -18.5 dB / max -1.1.
  Compared old (job 011) vs new at t=22, 25, 29, 31, 36, 38 s: all four planner fixes confirmed.
  - ~25 s: Isaac's face is visible, the wood bundle no longer covers it (~22 s bundle is held lower);
  - ~29-31 s: the angel light is a soft glow with the scene readable, no white-out;
  - ~31 s: the ram close-up shows the ram clearly, not blocked by Isaac;
  - ~38 s: the Sinai wide shot has a smaller mountain with the crowd visible.
  Other sheet tiles unchanged, no black frames, no new problems. Replaced FINAL VIDEOS\Two Mountains - Day 2 - ENGLISH.mp4.
- DONE 013 two new reels, EN + HI (4 renders, --concurrency=4, run once, about 52 min total, 12-15 min each; Aaron HI 12.9 min):
  abraham: 81.10 s, 1440x2560, volume EN mean -18.3 dB / max -1.0, HI mean -18.1 dB / max -1.0. Sheet: reports/abraham_sheet.jpg.
  aaron:   74.50 s, 1440x2560, volume EN mean -17.9 dB / max -0.5, HI mean -17.6 dB / max -0.6. Sheet: reports/aaron_sheet.jpg.
  Copies in FINAL VIDEOS\: "Abraham on the Mountain - ENGLISH.mp4" / "- HINDI.mp4", "Aaron and the Golden Calf - ENGLISH.mp4" / "- HINDI.mp4".
  QA from the two English sheets (38 and 36 frames): no black frames, no floating characters, hook titles readable, end cards fade in. Hindi video is the same picture (only on-screen text differs), not separately viewed.
  Note for the planner (probably the same look as the Sinai shot you fixed in Two Mountains): in Aaron, ~6-24 s (sheet rows 1-3), the big mountain is heavily blurred behind tiny characters with a strong tilt-shift look. Everything else looks fine.
- DONE 014 paul1 (Paul's journeys part 1, Saul to Paul, HINDI only, Paul1Short): duration=64.83s res=1440x2560 30fps, render_min=9.19 (551.4 s, 1945 frames, --concurrency=4). Volume mean -17.1 dB / max -1.1. Sheet: reports/paul1_sheet.jpg (33 frames, every 2 s).
  Copy: FINAL VIDEOS\Paul 1 - Saul to Paul - HINDI.mp4. Drive upload not done (user drags it in).
  Checks you asked for: (1) light from heaven (~t=14-24 s, sheet rows 2-3): the beam is pale and hazy but Saul stays readable on the ground, no white-out; the haziest frames are row 2 col 2 and row 3 col 4 (the Ananias beam shot), still readable. (2) night shots 7-8: I could not clearly find dark blue night frames in the 2-second samples; the darkest is row 3 col 3 (dark wood room, navy robe), which is readable. If the night shots fall between samples, I did not see them.
  Other notes: no black frames, hook title (2 lines, Hindi) clear of faces, end card "Bible Stories For You / Paul's journeys 1/9 / next reel: first journey" is readable. A dark foreground shape sits at the bottom-left in two frames (row 1 col 2 ~t=2 s and row 5 col 1 ~t=48 s); probably an intentional foreground object, please confirm.
- DONE 015 paul2 (Paul part 2, HINDI, Paul2Short): duration=64.67s res=1440x2560, render_min=10.91 (654.8 s, 1940 frames, --concurrency=4). Volume mean -16.9 dB / max -1.0. Sheet: reports/paul2_sheet.jpg (32 frames). Copy: FINAL VIDEOS\Paul 2 - First Journey - HINDI.mp4.
  QA: no black frames, no floating characters seen, Hindi hook readable, night/evening scenes readable, end card "Paul's journeys 2/9, next reel: Lystra".
- DONE 016 esau (Esau and the Stew, HINDI, EsauShort): duration=70.67s res=1440x2560, render_min=9.31 (558.5 s, 2120 frames). Volume mean -16.9 dB / max -1.1. Sheet: reports/esau_sheet.jpg (35 frames). Copy: FINAL VIDEOS\Esau and the Stew - HINDI.mp4.
  QA: no black frames, Hindi text readable, end card with emoji renders. The scroll and coins hanging in the air (~t=36-40 s) look like an intended symbol. Two things to glance at, probably intentional: ~t=48-60 s the dusk ground is flat blue and can read like water; ~t=64-68 s the bowl sits in front of the tent with nothing under it and looks slightly hovering.
  Only 2-second samples were checked; video not watched in full and audio not listened to. Drive upload not done.
- Jobs 001-008 are done. FINAL VIDEOS\ holds the current EN + HI versions of all three reels. Waiting for new jobs.
