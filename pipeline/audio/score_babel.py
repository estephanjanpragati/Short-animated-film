# Tower of Babel: an epic-comic cue in D (Phrygian-dominant colour from A major and Bb): a big hook, a walking
# caravan, a working groove for the bricks, a brass build while the tower rises, a hush for God's command, a playful
# falling glockenspiel for "came down", detuned chaos for the confusion, a dead stop, a sombre "Babel", a bright
# Pentecost and a warm music-box ending.
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
BPM = 100.0
Q = 60.0 / BPM
R = rng(61)


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
CH = {"Dm": [38, 57, 62, 65], "A": [45, 57, 61, 64], "Bb": [46, 58, 62, 65], "Gm7": [43, 58, 62, 65], "G": [43, 55, 59, 62], "C": [48, 55, 60, 64], "D": [50, 57, 62, 66], "Em": [40, 55, 59, 64], "Am": [45, 57, 60, 64],
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
def timp(t, m=38, v=0.7):
    B.add("timp", I.timpani(F(m), v, rr(), dur=2.0), t, 0.0, send=0.25)
def cym(t, v=0.45):
    B.add("cym", I.cymbal(v, rr(), dur=2.2), t, 0.2, send=0.3)
# 1 hook: the sky-high tower, then the confusion sting
padc(0, Lt(1, 7), ["Dm", "Bb"], 0.3, per=2)
stab(0.15, "Dm", 0.55); timp(0.15, 38, 0.85); cym(0.15, 0.4)
for k in range(4):
    timp(0.15 + (k + 1) * Q, 38 if k % 2 else 45, 0.45)
stab(Lt(1, 7), "A", 0.6); timp(Lt(1, 7), 33, 0.8)
for k in range(10):  # detuned chaos plucks
    B.add("lyre", I.pluck(F(62 + int(rr().integers(-6, 7))) * (1 + rr().normal(0, 0.01)), 0.4, rr(), dur=0.5, bright=0.8), Lt(1, 8) + k * 0.2, rr().uniform(-0.6, 0.6))
# 2 after the flood: walking together
arp(Lt(2), Lt(3), ["Dm", "Bb", "C", "Dm"], 0.32, bright=0.5)
drum(Lt(2), Lt(3), 0.3, (1, 0, 0, 0, 0.6, 0, 0, 0))
# 3 bricks: a working groove
arp(Lt(3), Lt(4), ["Dm", "C", "Bb", "A"], 0.36, every=0.5)
drum(Lt(3), Lt(4), 0.38, (1, 0, 0.6, 0, 1, 0.5, 0.6, 0))
melody(Lt(3, 2), Lt(4), "fife", 0.3, transpose=-5)
# 4 "a tower to the heavens": the brass build while it rises, a crown on "a name"
padc(Lt(4), Lt(5), ["Dm", "Bb", "C", "A"], 0.32, per=2)
for k, ch in enumerate(["Dm", "Bb", "C", "D", "Bb", "C", "D"]):
    t = Lt(4, 5) + k * 2 * Q
    if t < Lt(4, 11): stab(t, ch, 0.35 + 0.05 * k); timp(t, 38 + 2 * k, 0.4 + 0.06 * k)
stab(Lt(4, 12), "D", 0.65); cym(Lt(4, 12), 0.55)
drum(Lt(4, 11), Lt(5), 0.42, (1, 0, 0.7, 0.7, 1, 0, 0.7, 0.9))
# 5 God had said: fill the earth (hush)
padc(Lt(5), Lt(6), ["F", "C"], 0.24, per=2)
for i, note in enumerate([69, 74, 77]):
    B.add("glock", I.glock(F(note), 0.22, rr()), Lt(5, 6) + i * 0.2)
# 6 the LORD came down: a falling glockenspiel, then a wry tuba
for i, note in enumerate([93, 89, 86, 84, 81, 77, 74, 72, 69, 65]):
    B.add("glock", I.glock(F(note), 0.26, rr()), Lt(6, 4) + i * 0.09)
padc(Lt(6), Lt(7), ["Dm", "Gm"], 0.2, per=2)
B.add("brass", I.brass(F(41), 0.45, 0.6, rr(), "tuba", fall=-7), Lt(6, 18), -0.1)
B.add("brass", I.brass(F(36), 0.6, 0.6, rr(), "tuba", fall=-9), Lt(6, 19) + 0.1, 0.1)
# 7 confusion: detuned plucks and snare cracks, then the work stops dead
for k in range(int((Lt(7, 17) - Lt(7)) / 0.18)):
    t = Lt(7) + k * 0.18
    B.add("lyre", I.pluck(F(60 + int(rr().integers(-7, 8))) * (1 + rr().normal(0, 0.015)), 0.35, rr(), dur=0.4, bright=0.8), t, rr().uniform(-0.7, 0.7))
    if k % 3 == 0: B.add("drum", I.snare(0.3, rr(), dur=0.2, tune=0.8), t, rr().uniform(-0.3, 0.3))
timp(Lt(7, 17), 33, 0.85)
# 8 scattered; Babel
padc(Lt(8), Lt(9), ["Dm", "Bb", "Gm", "A"], 0.28, per=2)
stab(Lt(8, 12), "Dm", 0.55); timp(Lt(8, 12), 26, 0.95); cym(Lt(8, 12), 0.4)
# 9 Pentecost: bright D major
B.add("cym", I.cymbal(0.3, rr(), dur=1.6, bright=0.7), Lt(9) - 0.5, 0.0, send=0.4)
for i, note in enumerate([62, 66, 69, 74, 78, 81]):
    B.add("glock", I.glock(F(note), 0.26, rr()), Lt(9, 3) + i * 0.1)
arp(Lt(9, 3), Lt(10), ["D", "G", "A", "D"], 0.38, bright=0.7, octave=0)
melody(Lt(9, 6), Lt(10), "fife", 0.32, transpose=-5)
stab(Lt(9, 25), "D", 0.5); cym(Lt(9, 25), 0.35)
# 10 lesson; 11 question + music box
padc(Lt(10), DUR, ["G", "D", "C", "D"], 0.26)
melody(Lt(10), Lt(11), "glock", 0.22, transpose=-5)
melody(Lt(11), WD[-1][1], "musicbox", 0.22, transpose=-5)
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
