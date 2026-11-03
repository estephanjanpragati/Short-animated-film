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
