BIBLE REELS - render on your own computer (uses your graphics card)

1. Install Node.js 18 or newer from https://nodejs.org (if you don't have it).
2. Unzip this folder anywhere.
3. Windows: double-click render.bat
   Mac/Linux: open Terminal in this folder and run:  bash render.sh
4. The first run downloads the parts it needs (a few minutes, needs internet).
5. When it finishes, the "exports" folder has 6 videos:
     paul-barnabas-mark_EN.mp4  paul-barnabas-mark_HI.mp4
     noah-the-door_EN.mp4       noah-the-door_HI.mp4
     cain-and-abel_EN.mp4       cain-and-abel_HI.mp4

Size is 1080x1920 (Reels/Shorts). For a sharper 1440x2560 version, add  --scale=1.3333333333333333
right after --muted in the script.

If the render shows a black or broken picture, change --gl=angle to --gl=vulkan (Windows/Linux)
or remove the --gl=... part entirely, and run again.
Preview / edit in the browser:  npx remotion studio src/index.ts
