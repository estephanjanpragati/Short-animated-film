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
C = TL.get("cues", {})
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


# Hindi word cues
WD, LN = TL["words"], TL["lines"]
def Lt(n, k=0):
    return WD[LN[n - 1] + k][1]
# A rising three-note call passes from the prayer gathering to the harbour.
padc(0, Lt(3,6), ["C","Am","F","G"], 0.24)
for i, note in enumerate([67,72,76]):
    B.add("glock", I.glock(F(note), 0.26, rr()), Lt(2,10)+i*0.16)
arp(Lt(3,6), Lt(4), ["C","F","G"], 0.42, bright=0.7)
melody(Lt(3,9), Lt(4), "fife", 0.32)
# Elymas breaks the phrase. The blindness lands in the space after a short stab.
padc(Lt(4), Lt(5,20), ["Em","Bm","Am"], 0.25)
drum(Lt(4,11), Lt(5,20), 0.29, (1,0,0,0,0.6,0,0,0))
stab(Lt(5,20), "Gm", 0.42)
padc(Lt(6), Lt(7), ["C","G"], 0.26)
melody(Lt(6,4), Lt(7), "glock", 0.25)
# The road rhythm grows into the city, drops away for the opposition, then resumes.
arp(Lt(7), Lt(8), ["G","C","D","G"], 0.32)
drum(Lt(7), Lt(8), 0.33, (1,0,0.5,0,1,0,0.5,0.4))
stab(Lt(8,2), "Em", 0.35)
padc(Lt(8), Lt(8,13), ["Em","Am"], 0.22)
melody(Lt(8,13), Lt(9), "fife", 0.34)
arp(Lt(8,13), Lt(9), ["F","G","C"], 0.36)
padc(Lt(9), DUR, ["F","C","G","C"], 0.26)
melody(Lt(10), WD[-1][1], "musicbox", 0.24)
B.add("triangle", I.triangle(0.26, rr(), dur=1.1), WD[-1][1])

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
