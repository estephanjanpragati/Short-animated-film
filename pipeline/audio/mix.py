# Final mix: voice (gain only) + score (ducked 3 dB under every word, "+3 dB music" standard: bed at -10 LU under the
# voice) + SFX events (at -6 dB: -13 LU under the voice) + ambience beds (-21 LU). Master to -14 LUFS integrated
# through a 4x-oversampled look-ahead limiter at -1.2 dBTP, exactly the picture length, 48 kHz / 24-bit stereo.
import json
import os
import sys
import numpy as np
from scipy import signal, ndimage
from dsp import SR, ns, st, dbg, read_wav, write_wav, integrated, true_peak, lra, momentary_max

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.environ.get("TL", os.path.join(HERE, "timeline.json"))))
DUR = TL["total"] / TL["fps"]
N = ns(DUR)
TARGET = -14.0
CEIL = -1.2
MUSIC_LU, EVENTS_LU, BEDS_LU, DUCK_DB = -10.0, -13.0, -21.0, -3.0


def fit(x):
    x = st(x)
    out = np.zeros((2, N))
    out[:, :min(N, x.shape[1])] = x[:, :N]
    return out


def gain_to(x, lufs):
    return x * dbg(lufs - integrated(x))


def limiter(x, ceil_db=CEIL, look=0.005, rel=0.08):
    up = signal.resample_poly(x, 4, 1, axis=1)
    peak = np.abs(up).max(axis=0)
    c = dbg(ceil_db)
    g = np.minimum(1.0, c / np.maximum(peak, 1e-9))
    L = int(look * SR * 4)
    g = ndimage.minimum_filter1d(g, 2 * L + 1)
    a = np.exp(-1.0 / (rel * SR * 4))
    sm = np.empty_like(g)
    prev = 1.0
    for i in range(len(g)):  # instant attack (already look-ahead), smooth release
        prev = g[i] if g[i] < prev else a * prev + (1 - a) * g[i]
        sm[i] = prev
    return signal.resample_poly(up * sm[None, :], 1, 4, axis=1)


if __name__ == "__main__":
    voice = fit(read_wav(os.environ.get("VOICE", os.path.join(HERE, "..", "voice", "voice.wav")))[0])
    SRC = os.environ.get("SRC", HERE)
    music = fit(read_wav(os.path.join(SRC, "music.wav"))[0])
    ev = fit(read_wav(os.path.join(SRC, "sfx_events.wav"))[0])
    beds = fit(read_wav(os.path.join(SRC, "sfx_beds.wav"))[0])
    v_lufs = integrated(voice)
    # duck key from the word timings (not the audio): -3 dB while a word is spoken, 60 ms attack / 250 ms release
    key = np.zeros(N)
    words = TL["words"]
    if os.environ.get("WORDS"):  # e.g. the Hindi version: duck under the Hindi words
        words = [[w["w"], w["s"], w["e"]] for w in json.load(open(os.environ["WORDS"]))]
    for w, s, e in words:
        key[ns(max(0, s - 0.06)):ns(min(DUR, e + 0.05))] = 1
    key = ndimage.uniform_filter1d(ndimage.maximum_filter1d(key, ns(0.12)), ns(0.25))
    duck = dbg(DUCK_DB * key)
    music = gain_to(music, v_lufs + MUSIC_LU - DUCK_DB * 0.5) * duck[None, :]
    ev = gain_to(ev, v_lufs + EVENTS_LU)
    beds = gain_to(beds, v_lufs + BEDS_LU)
    mix = voice + music + ev + beds
    g = dbg(TARGET - integrated(mix))
    out = limiter(mix * g)[:, :N]
    out[:, :ns(0.003)] *= np.linspace(0, 1, ns(0.003))
    OUT = os.environ.get("OUT", HERE); os.makedirs(OUT, exist_ok=True)
    write_wav(os.path.join(OUT, "mix.wav"), out)
    for name, x in [("voice", voice), ("music", music), ("sfx", ev + beds)]:
        write_wav(os.path.join(OUT, f"stem_{name}.wav"), x * g)
    rep = {"integrated_lufs": round(integrated(out), 2), "true_peak_dbtp": round(true_peak(out), 2), "lra": round(lra(out), 2),
           "voice_lufs_in_mix": round(integrated(voice * g), 2), "music_lu_vs_voice": round(integrated(music) - v_lufs, 2),
           "sfx_events_lu_vs_voice": round(integrated(ev) - v_lufs, 2), "seconds": round(out.shape[1] / SR, 3)}
    json.dump(rep, open(os.path.join(OUT, "mix_report.json"), "w"), indent=1)
    print(rep)
