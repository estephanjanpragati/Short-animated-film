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
