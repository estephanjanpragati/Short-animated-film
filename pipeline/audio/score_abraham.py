# Original score for the Bible shorts (Two Mountains sections below) (own synthesis: instruments.py from the bridge short).
# A light Mediterranean comedy cue in G (lyre plucks, fife, frame drum, warm pad, glockenspiel, brass stabs) that
# follows the picture section by section: playful hook, warm golden voyage, bouncy Cyprus, uneasy Perga drone, stones,
# planning, the argument (stabs + rolls), a dead stop for "Luckily", a sparkle, a sting on "Unluckily", calm "both
# right", a sporty whistle for the coaches, the broad two-teams reprise swelling into "Europe", a warm prison chorale
# and a music-box ending that resolves on the last word.
import json
import os
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, make_ir, convolve_st, lp, hp
import instruments as I

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.environ.get("TL", os.path.join(HERE, "timeline.json"))))
FPS = TL["fps"]
DUR = TL["total"] / FPS
N = ns(DUR)
C = TL["cues"]
SH = {s["id"]: (s["a"] / FPS, s["b"] / FPS) for s in TL["shots"]}
F = I.m2f
BPM = 104.0
Q = 60.0 / BPM
R = rng(47)


def rr():
    return rng(int(R.integers(1 << 30)))


class Band:
    def __init__(self):
        self.tr, self.send = {}, {}

    def add(self, name, x, t, p=0.0, g=1.0, send=0.18):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
            self.send[name] = send
        if t >= DUR:
            return
        place(self.tr[name], pan(x, p) if np.ndim(x) == 1 else x, t, g)


B = Band()

# ---- harmony: G major with a Mixolydian lean (F natural) for the Mediterranean colour ----
CH = {"G": [43, 55, 59, 62], "C": [48, 55, 60, 64], "D": [50, 57, 62, 66], "Em": [40, 55, 59, 64], "Am": [45, 57, 60, 64],
      "F": [41, 57, 60, 65], "Bm": [47, 54, 59, 62], "Dsus": [50, 57, 62, 67], "Gm": [43, 55, 58, 62], "Eb": [39, 55, 58, 63]}
# theme (lyre / fife): (beat, length in beats, midi)
THEME = [(0, 0.5, 74), (0.5, 0.5, 76), (1, 1, 79), (2, 0.5, 78), (2.5, 0.5, 76), (3, 1, 74),
         (4, 0.5, 72), (4.5, 0.5, 74), (5, 1, 76), (6, 1, 71), (7, 1, 74),
         (8, 0.5, 74), (8.5, 0.5, 76), (9, 1, 79), (10, 0.5, 81), (10.5, 0.5, 79), (11, 1, 77),
         (12, 0.5, 76), (12.5, 0.5, 74), (13, 1, 72), (14, 2, 71)]
PROG = ["G", "C", "F", "D"]


def arp(t0, t1, prog, vel=0.45, every=0.5, bright=0.55, p=-0.25, octave=0, name="lyre"):
    """lyre broken chords, one chord per bar"""
    t, k = t0, 0
    pat = [0, 1, 2, 3, 2, 1, 3, 2]
    while t < t1 - 0.02:
        bar = int((t - t0) / (4 * Q))
        ch = CH[prog[bar % len(prog)]]
        m = ch[1:][pat[k % 8] % 3] + 12 * octave if pat[k % 8] else ch[1] + 12 * octave
        B.add(name, I.pluck(F(m), vel * (1.0 if k % 2 == 0 else 0.78), rr(), dur=0.8, bright=bright), t, p)
        if k % 8 == 0:
            B.add("bass", I.pluck(F(ch[0]), vel * 1.1, rr(), dur=1.4, bright=0.2), t, 0.0)
        t += every * Q
        k += 1


def melody(t0, t1, inst="fife", vel=0.55, transpose=0, p=0.15, name="melody"):
    t = t0
    while t < t1 - 0.2:
        for (b, d, m) in THEME:
            ts = t + b * Q
            if ts >= t1 - 0.1:
                return
            dd = min(d * Q, t1 - ts)
            f = F(m + transpose)
            if inst == "fife":
                x = I.fife(f, dd * 0.92, vel, rr())
            elif inst == "glock":
                x = I.glock(f * 2, vel, rr(), dur=1.4)
            elif inst == "musicbox":
                x = I.musicbox(f * 2, vel, rr(), dur=1.6)
            else:
                x = I.pluck(f, vel, rr(), dur=0.9, bright=0.7)
            B.add(name, x, ts, p)
        t += 16 * Q


def drum(t0, t1, vel=0.4, pat=(1, 0, 0.5, 0.6, 1, 0, 0.5, 0)):
    """frame drum (low tuned snare without snares) in eighths"""
    t, k = t0, 0
    while t < t1 - 0.02:
        v = pat[k % len(pat)]
        if v:
            B.add("drum", I.snare(vel * v, rr(), dur=0.3, tune=0.55, snappy=0.05), t, 0.1, send=0.12)
        t += Q / 2
        k += 1


def padc(t0, t1, chords, vel=0.3, per=4):
    t, k = t0, 0
    while t < t1 - 0.05:
        d = min(per * Q, t1 - t)
        B.add("pad", I.pad([F(m) for m in CH[chords[k % len(chords)]][1:]], d, vel, rr(), att=0.4, rel=0.8), t)
        t += per * Q
        k += 1


def stab(t, chord, vel=0.6):
    for i, m in enumerate(CH[chord][1:]):
        B.add("brass", I.brass(F(m), 0.22, vel, rr(), "horn", scoop=-18), t + 0.004 * i, 0.3 - 0.2 * i)
    B.add("brass", I.brass(F(CH[chord][0]), 0.3, vel, rr(), "tuba"), t, -0.1)


def sec(a, b):
    return SH[a][0], SH[b][1] if b else DUR


# ---------------- sections: "Abraham on the mountain" ----------------
# 1 hook: hushed pad, a question pluck
a, b = SH[1]
B.add("pad", I.pad([F(m) for m in [57, 60, 64]], b - a, 0.26, rr(), att=0.4, rel=0.5, warm=1200), a)
for k, m in enumerate([69, 72, 71]):
    B.add("lyre", I.pluck(F(m), 0.45, rr(), dur=0.9, bright=0.55), C["what would you"] + k * 0.2, 0.2)
# 2 the promise and the wait: warm pastoral, sparkle on the birth
a, b = SH[2]
padc(a, b, ["G", "C", "Em", "D"], 0.25)
arp(a, b, ["G", "C", "Em", "D"], 0.32, every=0.75, bright=0.5)
for i, m in enumerate([79, 83, 86, 91]):
    B.add("mbox", I.musicbox(F(m), 0.42, rr(), dur=1.4), C["at a hundred"] + 0.6 + i * 0.12, 0.3)
B.add("cym", I.cymbal(0.3, rr(), dur=2.0, bright=0.7), C["at a hundred"] + 0.5, 0.0)
# 3 the night call
a, b = SH[3]
B.add("pad", I.pad([F(m) for m in [45, 52, 57, 60]], b - a, 0.28, rr(), att=0.8, rel=0.8, warm=900), a)
B.add("mbox", I.musicbox(F(84), 0.35, rr(), dur=1.6), C["only son isaac"], 0.3)
# 4-5 the walk: procession, stops at the mountain; glock on "God will provide"
a, b = SH[4][0], SH[5][1]
padc(a, b, ["Am", "F", "C", "G"], 0.24)
arp(a, C["at the mountain"], ["Am", "F", "C", "G"], 0.32, every=0.75, bright=0.45)
drum(a, C["at the mountain"], 0.25, (1, 0, 0, 0, 0.5, 0, 0, 0))
B.add("timp", I.timpani(F(43), 0.5, rr(), dur=1.6), C["we both of"] - 0.02, 0.0)
B.add("glock", I.glock(F(79), 0.3, rr(), dur=1.6), C["god will provide the"] + 0.2, 0.3)
# 6 the knife: tension, timpani on "stop", radiant chord, sparkle on the ram
a, b = SH[6]
B.add("pad", I.pad([F(38), F(45), F(46)], C["and an angel"] - a, 0.32, rr(), att=0.5, rel=0.3, warm=500), a)
B.add("timp", I.timpani(F(38), 0.85, rr(), dur=2.0), C["stop"] - 0.02, 0.0)
B.add("pad", I.pad([F(m) for m in [60, 64, 67, 72]], b - C["stop"], 0.32, rr(), att=0.2, rel=0.6, warm=2200), C["stop"])
for i, m in enumerate([79, 83, 86, 91]):
    B.add("mbox", I.musicbox(F(m), 0.4, rr(), dur=1.4), C["a ram is"] + i * 0.12, 0.3)
# 7-8 The Lord Will Provide, faith: broad warm swell
a, b = SH[7][0], SH[8][1]
padc(a, b, ["C", "G", "F", "C"], 0.3, 2)
B.add("cym", I.cymbal(0.3, rr(), dur=2.6, bright=0.6), a, 0.0)
melody(a + 0.2, b, "glock", 0.28, 0, 0.3, "glockmel")
# 9-10 the cross: sunrise swell, resolve on the last word
a, b = SH[9][0], SH[10][1]
padc(a, b, ["F", "C", "Am", "G", "C"], 0.32, 3)
B.add("cym", I.cymbal(0.4, rr(), dur=3.0, bright=0.7), C["he gave his"], 0.0)
B.add("timp", I.timpani(F(36), 0.55, rr(), dur=2.4), C["he gave his"], 0.0)
last = TL["words"][-1][1]
for i, m in enumerate([48, 55, 60, 64, 67, 72]):
    B.add("lyre", I.pluck(F(m), 0.5, rr(), dur=2.6, bright=0.5), last - 0.02 + 0.03 * i, -0.3 + 0.12 * i)
B.add("pad", I.pad([F(m) for m in [60, 64, 67, 72]], max(0.3, DUR - last), 0.3, rr(), att=0.05, rel=0.4), last - 0.02)
B.add("triangle", I.triangle(0.4, rr(), dur=2.0), last - 0.02, 0.3)

# ---------------- bus: small hall, gentle glue ----------------
LEVEL = {"lyre": 0.9, "lyre2": 0.6, "bass": 0.8, "melody": 0.75, "glockmel": 0.6, "mboxmel": 0.7, "pad": 0.55, "drum": 0.7, "brush": 0.45,
         "timp": 0.8, "brass": 0.65, "snare": 0.5, "cym": 0.35, "glock": 0.6, "mbox": 0.7, "whistle": 0.7, "triangle": 0.5}


def render():
    dry = np.zeros((2, N))
    wet_in = np.zeros((2, N))
    for k, x in B.tr.items():
        g = LEVEL.get(k, 0.7)
        dry += x * g
        wet_in += x * g * B.send[k]
    ir = make_ir(1.6, 7, hf=0.6)
    wet = convolve_st(wet_in, ir)[:, :N]
    out = hp(dry + wet * 0.9, 35)
    return fades(out, 0.005, 0.05)


if __name__ == "__main__":
    from dsp import write_wav
    x = render()
    write_wav(os.path.join(os.environ.get("OUTDIR", HERE), "music.wav"), x / max(1e-9, np.abs(x).max()) * 0.8)
    print("music", x.shape, round(DUR, 3))
