# contact sheet: python sheet.py out.jpg cols w img1 img2 ...  (labels = file stem)
import sys
from PIL import Image, ImageDraw
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); ims = sys.argv[4:]
h = int(w * 16 / 9); rows = (len(ims) + cols - 1) // cols
S = Image.new("RGB", (cols * w, rows * h), "white"); d = ImageDraw.Draw(S)
for i, p in enumerate(ims):
    im = Image.open(p).convert("RGB").resize((w, h)); x, y = (i % cols) * w, (i // cols) * h
    S.paste(im, (x, y)); d.rectangle([x, y, x + 60, y + 16], fill="black"); d.text((x + 3, y + 2), p.split("/")[-1].split(".")[0], fill="white")
S.save(out, quality=90)
