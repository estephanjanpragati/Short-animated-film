# expressiveness of a voice take: pitch range (semitone std of voiced F0), loudness movement, duration
# (simple autocorrelation F0 tracker, 40 ms frames)
import sys, subprocess, numpy as np
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32)
for p in sys.argv[1:]:
    x = load(p); sr = 16000; N = 640; f0 = []; rms = []
    for i in range(0, len(x) - N, 320):
        w = x[i:i + N] * np.hanning(N); r = np.sqrt((w ** 2).mean()); rms.append(r)
        if r < 0.01: continue
        ac = np.correlate(w, w, "full")[N - 1:]; lo, hi = sr // 400, sr // 70
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.45 * ac[0]: f0.append(sr / k)
    f0 = np.array(f0); st = 12 * np.log2(f0 / np.median(f0))
    rms = np.array(rms); db = 20 * np.log10(rms[rms > 0.01])
    print(f"{p}: {len(x)/sr:.1f}s  pitch std {st.std():.2f} st, range p5-p95 {np.percentile(st,95)-np.percentile(st,5):.1f} st, loudness std {db.std():.1f} dB, median F0 {np.median(f0):.0f} Hz")
