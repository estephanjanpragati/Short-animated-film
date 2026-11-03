@echo off
REM Windows: renders the 3 reels on your graphics card, then makes EN + HI versions of each.
REM Needs Node.js 18+ (https://nodejs.org). Double-click this file, or run it from a terminal in this folder.
cd /d "%~dp0"
if not exist node_modules call npm install
if not exist out mkdir out
if not exist exports mkdir exports
for %%R in (MarkShort:paul-barnabas-mark NoahShort:noah-the-door CainShort:cain-and-abel) do (
  for /f "tokens=1,2 delims=:" %%a in ("%%R") do (
    call npx remotion render src/index.ts %%a out/%%b.mp4 --gl=angle --codec=h264 --crf=16 --muted --timeout=240000
    call npx remotion ffmpeg -y -i out/%%b.mp4 -i audio/%%b_EN.m4a -map 0:v -map 1:a -c copy -shortest -movflags +faststart exports/%%b_EN.mp4
    call npx remotion ffmpeg -y -i out/%%b.mp4 -i audio/%%b_HI.m4a -map 0:v -map 1:a -c copy -shortest -movflags +faststart exports/%%b_HI.mp4
  )
)
echo Done. Your 6 videos are in the "exports" folder.
pause
