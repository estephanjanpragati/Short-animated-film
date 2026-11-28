# Sound effects + ambience for the Bible shorts, timed to the picture (timeline.json). Own synthesis
# (sfx_gen.py of the bridge short plus a few new generators: sea wash, gulls, sail unfurl, stone whoosh and thud,
# steam hiss, quill scratch, ball kick, referee whistle). Events sit at the user's standard -6 dB; beds are quiet.
import json
import os
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, pan, st, place, fades, colored, smooth_noise, modal, phase, make_ir, convolve_st, dbg
import sfx_gen as G
import instruments as I

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.environ.get("TL", os.path.join(HERE, "timeline.json"))))
FPS = TL["fps"]
DUR = TL["total"] / FPS
N = ns(DUR)
C = TL.get("cues", {})
SH = {s["id"]: (s["a"] / FPS, s["b"] / FPS) for s in TL["shots"]}
SET = {s["id"]: s["set"] for s in TL["shots"]}
R = rng(2)


def rr():
    return rng(int(R.integers(1 << 30)))


# ---------------- new generators ----------------
def sea(dur, r, level=1.0):
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        swell = 0.55 + 0.45 * np.sin(phase(0.12 + 0.03 * r.uniform()) + r.uniform(0, 6)) ** 2
        x = lp(colored(n, r, 0.9), 900, 2) * swell
        x += 0.35 * bp(colored(n, r, 0.3), 1500, 6000, 1) * swell ** 3
        out[ch] = x * level
    return out


def gull(r):
    d = r.uniform(0.35, 0.6)
    t = tt(d)
    f = r.uniform(1400, 1900) * (1 + 0.25 * np.sin(np.pi * t / d)) * (1 - 0.15 * t / d)
    y = np.sin(phase(f)) + 0.5 * np.sin(2 * phase(f)) + 0.25 * np.sin(3 * phase(f))
    y = bp(y * (1 + 0.6 * np.sin(phase(np.full(len(t), 28.0)))), 900, 5000, 1)
    return fades(y * np.sin(np.pi * t / d) ** 0.6 * 0.4, 0.01, 0.05)


def stone_whoosh(r, dur=0.32):
    return G.whoosh(dur, r, peak=0.75, f_lo=500, f_hi=3000, width=0.5, tail=0.1, air=0.25)


def thud(r, big=1.0):
    d = 0.5
    t = tt(d)
    body = np.sin(phase(70 * (1 + 0.6 * np.exp(-t / 0.015)))) * np.exp(-t / 0.09) * 1.2
    knock = modal(d, [(380, 0.6, 0.03), (900, 0.35, 0.015)], r)
    hit = bp(r.standard_normal(len(t)), 300, 4000, 1) * np.exp(-t / 0.006)
    return fades((body + knock + hit * 0.6) * big, 0, 0.1)


def hiss(dur, r):
    n = ns(dur)
    e = np.minimum(1, np.arange(n) / ns(0.05)) * np.exp(-np.arange(n) / ns(dur * 0.6))
    return hp(colored(n, r, -0.3), 2500, 2) * e * 0.5


def scratch(dur, r):
    n = ns(dur)
    strokes = (np.sin(phase(np.full(n, 3.2)) + r.uniform(0, 6)) > -0.2).astype(float)
    g = lp(strokes, 30, 1) * (0.6 + 0.4 * smooth_noise(n, r, 4))
    return bp(r.standard_normal(n), 1800, 7000, 2) * g * 0.35


def kick_ball(r):
    d = 0.25
    t = tt(d)
    return fades(np.sin(phase(140 * (1 + np.exp(-t / 0.01)))) * np.exp(-t / 0.04) + bp(r.standard_normal(len(t)), 600, 3000, 1) * np.exp(-t / 0.01) * 0.5, 0, 0.05)


def ref_whistle(r, dur=0.5):
    t = tt(dur)
    f = 2700 + 60 * np.sin(phase(np.full(len(t), 32.0)))
    y = np.sin(phase(f)) * (0.7 + 0.3 * np.sign(np.sin(phase(np.full(len(t), 32.0)))))
    y += 0.2 * bp(r.standard_normal(len(t)), 2000, 6000, 1)
    return fades(y * 0.35, 0.01, 0.05)


def flap(dur, r):
    n = ns(dur)
    x = bp(r.standard_normal(n), 200, 2500, 1)
    rate = np.linspace(14, 4, n)
    return x * (0.5 + 0.5 * np.sin(phase(rate))) ** 4 * np.linspace(1, 0.2, n)


def footsteps(out, t0, t1, rate, r, gain=0.5, p=0.0, scuff=0.4):
    t = t0
    while t < t1:
        place(out, pan(G.stroll_step(r, scuff) * gain * r.uniform(0.8, 1.0), p), t)
        t += 1.0 / rate


# ---------------- cue sheet ----------------
EV = np.zeros((2, N))     # events
BED = np.zeros((2, N))    # ambience
CUES = []


def ev(t, x, name, g=1.0, p=0.0):
    CUES.append((round(t, 3), name))
    place(EV, pan(x, p) if np.ndim(x) == 1 else x, t, g)


def bed(t0, t1, x, g=1.0, fade=0.25):
    n = min(ns(t1 - t0), x.shape[-1])
    y = st(x)[:, :n].copy()
    k = min(ns(fade), n // 2)
    if k > 0:
        y[:, :k] *= np.linspace(0, 1, k)
        y[:, -k:] *= np.linspace(1, 0, k)
    place(BED, y, t0, g)



# ---------------- more generators (Noah, Cain and Abel) ----------------
def baa(r, base=None):
    d = r.uniform(0.55, 0.8); t = tt(d); f0 = (base or r.uniform(260, 340)) * (1 + 0.04 * np.sin(phase(np.full(len(t), 7.0))))
    y = sum(np.sin(k * phase(f0)) / k ** 1.1 for k in range(1, 14))
    y = bp(y, 300, 3500, 1) * (0.6 + 0.4 * (np.sin(phase(np.full(len(t), 18.0))) > 0))
    return fades(y * np.sin(np.pi * t / d) ** 0.5 * 0.35, 0.02, 0.08)
def trumpet(r):
    d = 1.0; t = tt(d); f = 520 * (1 + 0.5 * np.clip(t / 0.15, 0, 1)) * (1 - 0.15 * t)
    y = sum(np.sin(k * phase(f)) / k for k in range(1, 10)) + 0.3 * bp(r.standard_normal(len(t)), 600, 3000, 1)
    return fades(y * np.minimum(1, t / 0.05) * np.exp(-t / 0.6) * 0.3, 0.005, 0.1)
def thud_heavy(r):
    d = 0.6; t = tt(d)
    return fades((np.sin(phase(55 * (1 + 0.5 * np.exp(-t / 0.02)))) * np.exp(-t / 0.15) * 1.3 + bp(r.standard_normal(len(t)), 150, 1200, 1) * np.exp(-t / 0.04)), 0, 0.1)
def knock(r):
    d = 0.25; t = tt(d)
    return fades(modal(d, [(r.uniform(180, 230), 1.0, 0.03), (r.uniform(420, 520), 0.6, 0.018), (950, 0.3, 0.01)], r) + bp(r.standard_normal(len(t)), 800, 5000, 1) * np.exp(-t / 0.004) * 0.4, 0, 0.05)
def thunder(r, dur=3.0):
    n = ns(dur); t = np.arange(n) / SR
    env = np.exp(-t / 1.1) * (1 + 0.6 * smooth_noise(n, r, 6))
    return st(lp(colored(n, r, 1.6), 400, 2) * env * 1.4 + bp(colored(n, r, 0.6), 200, 2000, 1) * np.exp(-t / 0.15) * 0.6)
def rain_bed(dur, r, heavy=1.0):
    n = ns(dur); out = np.zeros((2, n))
    for ch in range(2):
        x = hp(colored(n, r, 0.2), 900, 2) * 0.35 * heavy
        drops = np.zeros(n); k = 0
        while k < n - 400:
            drops[k:k + 200] += bp(r.standard_normal(200), 2000, 8000, 1) * np.exp(-np.arange(200) / 30) * r.uniform(0.1, 0.5); k += int(r.exponential(SR / (90 * heavy)))
        out[ch] = x + drops * 0.6
    return out
def crackle(dur, r):
    n = ns(dur); y = lp(colored(n, r, 1.0), 300) * 0.25
    k = 0
    while k < n - 300:
        y[k:k + 300] += bp(r.standard_normal(300), 1500, 7000, 1) * np.exp(-np.arange(300) / 25) * r.uniform(0.2, 0.9); k += int(r.exponential(SR / 14))
    return st(y * 0.6)
def growl(r, dur=1.6):
    n = ns(dur); t = np.arange(n) / SR
    f = 70 + 10 * np.sin(phase(np.full(n, 3.0)))
    y = sum(np.sin(k * phase(f)) / k for k in range(1, 20)) * (0.6 + 0.4 * smooth_noise(n, r, 12))
    return fades(bp(y, 60, 900, 2) * np.sin(np.pi * t / dur) * 0.5, 0.05, 0.2)
def chime(r, f=2400):
    return I.triangle(0.35, r, dur=1.4, f=f)

WD, LN = TL["words"], TL["lines"]
def Lt(n, k=0):
    return WD[LN[n - 1] + k][1]
def moo(r):
    d = 1.1; t = tt(d); f0 = 118 * (1 - 0.18 * t / d) * (1 + 0.02 * np.sin(phase(np.full(len(t), 5.0))))
    y = sum(np.sin(k * phase(f0)) / k for k in range(1, 18))
    y = bp(y, 180, 1100, 2) + 0.15 * bp(r.standard_normal(len(t)), 300, 1500, 1)
    return fades(y * np.sin(np.pi * np.minimum(1, t / d)) ** 0.5 * 0.5, 0.05, 0.2)
def rip(r, dur=0.45):
    n = ns(dur); x = bp(r.standard_normal(n), 1400, 7000, 2)
    g = (r.uniform(size=n) > 0.55).astype(float); g = lp(g, 400, 1)
    return fades(x * (0.4 + g) * np.linspace(1, 0.3, n) * 0.6, 0.005, 0.05)
def drag(dur, r):
    n = ns(dur); x = lp(colored(n, r, 0.8), 900, 2) * (0.6 + 0.4 * smooth_noise(n, r, 3))
    return fades(x * 0.7, 0.1, 0.3)
def swish(r):
    return G.whoosh(0.28, r, peak=0.45, f_lo=600, f_hi=4000, width=0.6, tail=0.08, air=0.3)
def moo(r):
    d = 1.1; t = tt(d); f0 = 118 * (1 - 0.18 * t / d) * (1 + 0.02 * np.sin(phase(np.full(len(t), 5.0))))
    y = sum(np.sin(k * phase(f0)) / k for k in range(1, 18))
    y = bp(y, 180, 1100, 2) + 0.15 * bp(r.standard_normal(len(t)), 300, 1500, 1)
    return fades(y * np.sin(np.pi * np.minimum(1, t / d)) ** 0.5 * 0.5, 0.05, 0.2)
def rip(r, dur=0.45):
    n = ns(dur); x = bp(r.standard_normal(n), 1400, 7000, 2)
    g = (r.uniform(size=n) > 0.55).astype(float); g = lp(g, 400, 1)
    return fades(x * (0.4 + g) * np.linspace(1, 0.3, n) * 0.6, 0.005, 0.05)
def drag(dur, r):
    n = ns(dur); x = lp(colored(n, r, 0.8), 900, 2) * (0.6 + 0.4 * smooth_noise(n, r, 3))
    return fades(x * 0.7, 0.1, 0.3)
def swish(r):
    return G.whoosh(0.28, r, peak=0.45, f_lo=600, f_hi=4000, width=0.6, tail=0.08, air=0.3)
# beds: plain air, builders murmuring, kiln fire, high wind in the sky, storm over the empty tower, Pentecost crowd
for i, (a, b) in SH.items():
    d = b - a + 0.5
    air = G.breeze(d, rr(), 0.2 if SET[i] == "babel" else 0.15)
    if i in (4, 5, 7, 9, 10, 15, 22, 23, 25):
        air += st(G.babble(d, rr(), 160, 1.1) * 0.14)
    if i == 6: air += crackle(d, rr()) * 0.5
    if i in (12, 13): air += st(G.breeze(d, rr(), 0.6, gust=0.5, bright=1600))
    if i == 20: air += st(G.breeze(d, rr(), 0.5, gust=0.4, bright=600))
    bed(a, b + 0.25, air)
for i in (2, 3, 5, 9, 12, 15, 19, 21, 24, 26):
    ev(SH[i][0] - 0.12, swish(rr()), "cut swish", 0.16)
# hook: hammers on the tower, then everyone talking past each other
for k in range(5):
    ev(0.3 + k * 0.5, G.hammer_hit(rr(), 0.6), "hammer", 0.16, (-0.5, 0.5)[k % 2])
for k in range(5):
    ev(Lt(1, 7) + k * 0.25, st(G.babble(1.6, rr(), 110 + 25 * k, 0.9 + 0.1 * k)), "confused voices", 0.2, (-0.6 + 0.3 * k))
# walking together; bricks, fire and tar
footsteps(EV, Lt(2), Lt(2, 10), 1.8, rr(), 0.3)
for k in range(4):
    ev(Lt(3, 3) + k * 0.4, thud(rr(), 0.4), "brick mould slap", 0.24, 0.3)
ev(Lt(3, 7), G.whoosh(0.6, rr(), peak=0.3, f_lo=200, f_hi=1500), "fire roar", 0.3)
ev(Lt(3, 15), st(G.bubbles(1.2, rr(), 9, 200, 900)), "tar bubbles", 0.24)
# the tower rises: hammering in time-lapse, the crowd cheers "a name!"
for k in range(14):
    ev(Lt(4, 6) + k * 0.14, G.hammer_hit(rr(), 0.5), "hammers", 0.14, rr().uniform(-0.6, 0.6))
for k in range(6):
    ev(Lt(4, 12) + k * 0.12, st(G.hurrah(rr(), 150 + 10 * k, 1.0)), "cheer", 0.13, (-0.5 + 0.2 * k))
# God came down: a long descending whoosh and a sparkle on the light
ev(Lt(6) - 0.2, G.whoosh(2.2, rr(), peak=0.35, f_lo=180, f_hi=2600, width=0.9, tail=0.5, air=0.3), "descent", 0.34)
ev(Lt(6, 14), chime(rr(), 2600), "light on the tower", 0.24)
ev(Lt(6, 16), st(G.whoa(rr(), 160)), "builders gasp", 0.16)
# confusion: four voices, the brick request, the wrong jug, the angry "?", tools down
for k in range(4):
    ev(Lt(7, 3) + k * 0.3, st(G.babble(0.9, rr(), 120 + 30 * k, 1.0 + 0.1 * k)), "a new language", 0.24, (-0.5 + 0.33 * k))
ev(Lt(7, 9), st(G.whoa(rr(), 150)), "asks for a brick", 0.2, -0.3)
ev(Lt(7, 12), chime(rr(), 1800), "the jug", 0.14, 0.3)
ev(Lt(7, 15), st(G.oof(rr())), "huh?!", 0.22, -0.3)
ev(Lt(7, 17), G.clink(rr(), 900, 0.2), "tool drops", 0.3, 0.2)
ev(Lt(7, 17) + 0.15, thud(rr(), 0.5), "tool lands", 0.24, 0.2)
# scattering; the name Babel; Pentecost wind and fire
footsteps(EV, Lt(8), Lt(8, 6), 1.7, rr(), 0.26, -0.3)
footsteps(EV, Lt(8) + 0.25, Lt(8, 6), 1.6, rr(), 0.22, 0.3)
ev(Lt(8, 12), thud_heavy(rr()), "Babel hit", 0.3)
ev(Lt(9) - 0.3, G.whoosh(1.6, rr(), peak=0.45, f_lo=150, f_hi=2200, width=0.9, tail=0.6, air=0.4), "rushing wind", 0.36)
ev(Lt(9, 3), G.whoosh(0.5, rr(), peak=0.3, f_lo=600, f_hi=4000), "fire", 0.22)
ev(Lt(9, 14), st(G.whoa(rr(), 170)), "they understand", 0.16)
for k in range(4):
    ev(Lt(9, 23) + k * 0.15, chime(rr(), 2200 + 150 * k), "hearts", 0.14, (-0.4 + 0.25 * k))
ev(Lt(11, 11), chime(rr(), 2400), "end", 0.2)

def render():
    ir = make_ir(0.9, 3, hf=0.5)
    wet = convolve_st(EV * 0.15, ir)[:, :N]
    return fades(EV + wet, 0.003, 0.05), fades(BED, 0.003, 0.3)


if __name__ == "__main__":
    from dsp import write_wav
    e, b = render()
    write_wav(os.path.join(os.environ.get("OUTDIR", HERE), "sfx_events.wav"), e / max(1e-9, np.abs(e).max()) * 0.8)
    write_wav(os.path.join(os.environ.get("OUTDIR", HERE), "sfx_beds.wav"), b / max(1e-9, np.abs(b).max()) * 0.5)
    json.dump(CUES, open(os.path.join(os.environ.get("OUTDIR", HERE), "sfx_cues.json"), "w"), indent=0)
    print("sfx", len(CUES), "events")
