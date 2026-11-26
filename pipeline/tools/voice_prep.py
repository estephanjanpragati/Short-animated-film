# Expressive-take edit: gaps between words longer than MAXGAP (sentence ends keep a bit more air) are shortened by
# cutting in the middle of the silence, then a gentle speed-up (<= MAXTEMPO, pitch kept) toward TARGET seconds.
# Emotion-tag tokens from the transcript ("[warmly]") and bare punctuation are dropped from the word list.
# usage: voice_prep.py raw_words.json take.mp3 outdir [target_s] [maxtempo]
import json, sys, subprocess, os, re
raw, take, out = sys.argv[1], sys.argv[2], sys.argv[3]
TARGET = float(sys.argv[4]) if len(sys.argv) > 4 else 72.0
MAXT = float(sys.argv[5]) if len(sys.argv) > 5 else 1.1
os.makedirs(out, exist_ok=True)
d = json.load(open(raw)); d = d["words"] if isinstance(d, dict) else d
W = [(w["text"], w["start"], w["end"]) for w in d if w.get("type", "word") == "word" and not w["text"].startswith("[") and re.search(r"\w", w["text"])]
LEAD, MAXGAP, ENDGAP = 0.12, 0.22, 0.38
keep, s0 = [], 0.0
for i in range(len(W) - 1):
    e, n = W[i][2], W[i + 1][1]
    mg = ENDGAP if W[i][0].rstrip('"\'')[-1:] in ".?!" else MAXGAP
    if n - e > mg:
        keep.append((s0, e + mg / 2)); s0 = n - mg / 2
keep.append((s0, W[-1][2] + 0.35))
edited = sum(b - a for a, b in keep)
tempo = min(MAXT, max(1.0, edited / TARGET))
def mapt(t):
    acc = 0.0
    for a, b in keep:
        if t <= b: return (acc + max(0.0, t - a)) / tempo + LEAD
        acc += b - a
    return acc / tempo + LEAD
words = [{"w": w, "s": round(mapt(s), 3), "e": round(mapt(e), 3)} for w, s, e in W]
json.dump({"keep": keep, "tempo": tempo, "lead": LEAD, "edited": edited}, open(f"{out}/edit_plan.json", "w"), indent=0)
json.dump(words, open(f"{out}/words.json", "w"), indent=0)
parts = "".join(f"[0:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,afade=t=in:d=0.006,afade=t=out:st={max(0, b - a - 0.008):.4f}:d=0.008[s{i}];" for i, (a, b) in enumerate(keep))
cat = "".join(f"[s{i}]" for i in range(len(keep))) + f"concat=n={len(keep)}:v=0:a=1[c];[c]atempo={tempo:.5f},adelay={int(LEAD*1000)}|{int(LEAD*1000)},aresample=48000[o]"
subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", take, "-filter_complex", parts + cat, "-map", "[o]", "-ac", "2", "-c:a", "pcm_s24le", f"{out}/voice.wav"], check=True)
print(f"{out}: {len(W)} words, segments {len(keep)}, edited {edited:.2f}s, tempo {tempo:.4f}, last word end {words[-1]['e']:.2f}s")
