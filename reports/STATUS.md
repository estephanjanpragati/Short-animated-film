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
- Next: jobs 003, 004 as listed in jobs/queue.md. 003 and 004 will use the new mux.
