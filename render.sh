#!/bin/bash
# Mac / Linux: renders the 3 reels on your graphics card, then makes EN + HI versions of each.
# Needs Node.js 18+ (https://nodejs.org). Run:  bash render.sh
set -e; cd "$(dirname "$0")"
[ -d node_modules ] || npm install
mkdir -p out exports
GL="--gl=angle"; [ "$(uname)" = "Linux" ] && GL="--gl=egl"
for r in MarkShort:paul-barnabas-mark NoahShort:noah-the-door CainShort:cain-and-abel; do
  comp=${r%%:*}; name=${r##*:}
  npx remotion render src/index.ts $comp out/$name.mp4 $GL --codec=h264 --crf=16 --muted --timeout=240000
  for L in EN HI; do
    npx remotion ffmpeg -y -i out/$name.mp4 -i audio/${name}_$L.m4a -map 0:v -map 1:a -c copy -shortest -movflags +faststart exports/${name}_$L.mp4
  done
done
echo "Done. Your 6 videos are in the exports folder."
