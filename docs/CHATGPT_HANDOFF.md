# Handoff: two new reels for "Bible Stories For You" (Hindi only)

Repo: https://github.com/estephanjanpragati/short-animated-film (branch `main`)

You are making **two animated vertical reels**, both **Hindi only**:

| Folder to create | Composition id | Story | Series |
|---|---|---|---|
| `src/videos/paul2/` | `Paul2Short` | पौलुस की यात्राएँ भाग 2: पहली यात्रा (Acts 13) | बाइबल: शुरू से अंत तक |
| `src/videos/esau/` | `EsauShort` | एसाव और एक कटोरी दाल (Genesis 25:19–34) | बाइबल: शुरू से अंत तक |

You do **not** render the final video. You build everything, push it, and add one render job (`015`) to `jobs/queue.md`. The owner's PC renders it.

---

## 1. House rules (do not break these)

1. **Hindi only.** Narration, on-screen text, captions. No English version.
2. **Voice:** ElevenLabs voice **"Harish - Storytelling & Narration"**, voice_id `iF4EGhdPrfeyzQw30TZJ`, model `eleven_v4`, with emotion tags like `[serious]`, `[excited]`, `[softly]`. **Not** the owner's cloned "Estephan Simon" voice.
3. **Every Bible claim must have a verse.** Use the scripts below exactly; they are already checked. If you change a line, add its verse to the table.
4. **No "AI generated" label** anywhere in the video or captions.
5. **Don't touch other reels' folders** (`paul1`, `abraham`, `aaron`, `mark`, …). Copy them; never edit them.
6. **Length:** 60–75 s. Vertical 1080×1920 at 30 fps (the PC renders it at 1440×2560).
7. **Don't post anything** to Instagram or YouTube. Don't render with `--loop`. Don't edit `jobs/STOP.md`.

---

## 2. How a reel is built (the pipeline)

Look at the finished Paul Part 1 reel first, it is the template:
- picture: `src/videos/paul1/` (`Paul1.tsx`, `story.ts`, `cast.ts`, `world.ts`, `people.ts`, `words.ts`)
- voice data: `pipeline/reels/paul1/` (`lines_hi.txt`, `voice_hi/words.json`, `timeline.json`)
- sound: `pipeline/audio/score_paul1.py`, `pipeline/audio/fx_paul1.py`, `pipeline/audio/mix.py`
- finished soundtrack: `audio/paul1_HI.m4a`

Stack: Remotion 4 + three.js (flat 2D cartoon cards in a 3D world), Node 22, Python 3 with numpy, scipy, Pillow, plus ffmpeg.

### Step A: voice
1. Write the script lines, one per line, to `pipeline/reels/<reel>/lines_hi.txt` (exact text from section 3 or 4, without the emotion tags).
2. Generate the voice with the ElevenLabs API (`POST /v1/text-to-speech/iF4EGhdPrfeyzQw30TZJ`, `model_id: eleven_v4`). The prompt is the same lines **with** the emotion tags, blank line between lines. Save it as `pipeline/reels/<reel>/raw/hi_A.mp3`. Make **one** take (it costs credits).
3. Get word timings with ElevenLabs Speech-to-Text (`POST /v1/speech-to-text`, `model_id: scribe_v1`, word timestamps). Save the JSON as `raw/hi_words_raw.json`.
4. Tighten pauses and write the voice files:
   `python3 pipeline/tools/voice_prep.py raw/hi_words_raw.json raw/hi_A.mp3 voice_hi 66 1.04`
   (run inside `pipeline/reels/<reel>/`). Then remove any leftover tag tokens ending in `]` from `voice_hi/words.json`.
5. Make the picture's word table:
   `python3 pipeline/tools/words_ts_hi.py pipeline/reels/<reel>/voice_hi/words.json pipeline/reels/<reel>/lines_hi.txt src/videos/<reel>/words.ts`
   It must print one start time per line. If it fails with a word-count mismatch, the transcript split a word differently. Fix `words.json`, never the script.

### Step B: picture
1. Copy a template folder:
   - Paul 2: copy `src/videos/paul1/` to `src/videos/paul2/`. Its world already has every set you need.
   - Esau: copy `src/videos/abraham/` to `src/videos/esau/`. Abraham's world has fields, a hut, dusk light and tents. Use `paul1/story.ts` as the model for the Hindi word anchors (`L(line, word)`, `LF(line, word)`).
2. Rename the main file and exports (`Paul2.tsx` / `PAUL2_FRAMES` / `Paul2Short`, `Esau.tsx` / `ESAU_FRAMES` / `EsauShort`). Register both in `src/Root.tsx` exactly like `Paul1Short` (1080×1920, 30 fps).
3. `story.ts`: one entry per shot `[set, light, LF(line, word)]`, plus camera keys. Anchor every cut and expression change to a Hindi word with `LF(n, k)`: n is the script line (1-based), k is the word index in that line (0-based).
4. `cast.ts`: who stands where in each shot, and their expressions. The available expressions are listed in `toon.ts`: `neutral, stern, grin, laugh, nervous, shock, relief, relief_open, dazed, pained, smile, smile_closed`. Use `shut: true` for closed eyes. Use `roll` to lay someone down.
5. `<Reel>.tsx` overlays (copy from `Paul1.tsx`): a badge, a big hook text, verse pills timed to lines, and the end card (logo, "Bible Stories For You", part line, next-reel line).
6. Lens blur (`dofAt`): use it **only** on close-ups, never on wide shots. A big blurry mountain behind tiny characters looked bad in an older reel.

### Step C: sound
1. Timeline for the sound:
   `npx tsx pipeline/tools/export_tl.mts <reel> pipeline/reels/<reel>/timeline.json ""`
2. Copy `score_paul1.py` and `fx_paul1.py` to `score_<reel>.py` and `fx_<reel>.py`, and rewrite only the section blocks to match your shots (use `Lt(line, word)` for timing). Run:
   `cd pipeline/audio && TL=../reels/<reel>/timeline.json OUTDIR=../reels/<reel>/out python3 score_<reel>.py && TL=... OUTDIR=... python3 fx_<reel>.py`
3. Mix:
   `TL=../reels/<reel>/timeline.json SRC=../reels/<reel>/out VOICE=../reels/<reel>/voice_hi/voice.wav OUT=../reels/<reel>/out WORDS=../reels/<reel>/voice_hi/words.json python3 mix.py`
   The target is about -14 LUFS with the true peak at or below -1 dBTP; the script prints both.
4. Encode: `ffmpeg -i pipeline/reels/<reel>/out/mix.wav -c:a aac -b:a 256k audio/<reel>_HI.m4a`
   Don't commit large `.wav` files.

### Step D: check
Render test stills of one frame per shot (low scale is fine) and look at them:
`npx remotion still src/index.ts <Composition> out.jpg --frame=N --scale=0.3`
Check that faces are in frame, nobody floats, the Hindi text is readable and not over a face, and there are no white-outs. Fix the cameras in `story.ts` until every shot reads.

### Step E: job for the PC + push
Append this to `jobs/queue.md`:
```
## 015 - PAUL PART 2 + ESAU (Hindi only, 2 renders)
- Paul2Short: render out/paul2_HI.mp4, mux with audio/paul2_HI.m4a, copy to FINAL VIDEOS as "Paul 2 - First Journey - HINDI.mp4"
- EsauShort: render out/esau_HI.mp4, mux with audio/esau_HI.m4a, copy to FINAL VIDEOS as "Esau and the Stew - HINDI.mp4"
- render flags as always: --gl=angle --codec=h264 --crf=16 --muted --timeout=240000 --scale=1.3333333333333333 (--concurrency=4 is fine)
- contact sheets -> reports/paul2_sheet.jpg and reports/esau_sheet.jpg
- Run once, no loop. Report DONE 015.
```
Add both reels to `docs/posts.json` (fields: name, lang "HI", drive_name, at null, title, caption). The captions are in sections 3 and 4.
Commit and push to `main` (run `git pull --rebase` first; the PC also pushes).

---

## 3. Reel: पौलुस की यात्राएँ भाग 2 — पहली यात्रा (Acts 13)

**Hook text:** एक प्रार्थना सभा, और इतिहास बदल गया
**Badge:** बाइबल: शुरू से अंत तक · प्रेरितों के काम 13
**End card:** पौलुस की यात्राएँ · भाग 2/9 — अगली रील: लुस्त्रा
**Cast** (already in `paul1/people.ts`): `PAUL`, `BARNABAS`, `MARK`, and `folk(n)` for crowds. Make new outfits for **इलीमास** (the sorcerer: dark purple robe, black head cloth, beard) and **सिरगियुस पौलुस** (Roman proconsul: white toga, red sash, short hair, no beard).
**Sets** (in the paul world): `court` = Antioch church praying, `harbour` = sailing to Cyprus, `village` = Paphos and the Pisidian Antioch synagogue street, `perga` = the mountain road.

Narration (with tags for the voice; strip the tags for `lines_hi.txt`):
1. [intrigued] एक प्रार्थना सभा, और इतिहास बदल गया। [pause] कैसे?
2. [warm] अन्ताकिया की कलीसिया उपवास और प्रार्थना कर रही थी। तब पवित्र आत्मा ने कहा: बरनबास और शाऊल को मेरे काम के लिए अलग करो।
3. [hopeful] उन्होंने हाथ रखे और विदा किया। साथ में जवान मरकुस। पहला पड़ाव: साइप्रस का टापू।
4. [tense] पाफुस में हाकिम सिरगियुस पौलुस सुसमाचार सुनना चाहता था। पर एक जादूगर, इलीमास, बीच में आ गया।
5. [stern] पौलुस ने उसकी आँखों में देखा: तू प्रभु के सीधे रास्ते टेढ़े करता है। [dramatic] और जादूगर कुछ समय के लिए अंधा हो गया।
6. [amazed] ये देखकर हाकिम ने विश्वास किया। यहीं से बाइबल शाऊल को पौलुस कहने लगती है।
7. [excited] फिर पहाड़ पार करके पिसिदिया का अन्ताकिया। आराधनालय में पौलुस ने यीशु का सुसमाचार सुनाया। अगले सब्त लगभग पूरा शहर सुनने आ गया।
8. [serious] कुछ लोग जल उठे और विरोध किया। तब पौलुस और बरनबास ने कहा: अब हम ग़ैर-यहूदियों की ओर जाते हैं। [joyful] और ग़ैर-यहूदी आनंद से भर गए।
9. [sincere] सीख ये है: जब परमेश्वर भेजता है, विरोध आता है, पर काम रुकता नहीं। विरोध दरवाज़ा बंद नहीं करता, नया खोल देता है।
10. [warm] आपको परमेश्वर कहाँ भेज रहा है? कमेंट में बताइए। [upbeat] अगली रील में: लुस्त्रा।

| Claim | Source |
|---|---|
| Church fasting and praying; "Set apart Barnabas and Saul" | Acts 13:2 |
| Hands laid on them, sent off; John Mark with them; Cyprus | Acts 13:3–5 |
| Proconsul Sergius Paulus wanted to hear; Elymas the sorcerer opposed | Acts 13:7–8 |
| "Saul, who was also called Paul"; "making crooked the straight paths of the Lord"; blind for a time | Acts 13:9–11 |
| The proconsul believed | Acts 13:12 |
| Pisidian Antioch synagogue; next Sabbath almost the whole city gathered | Acts 13:14, 44 |
| Jealousy; "we turn to the Gentiles"; Gentiles rejoiced | Acts 13:45–48 |
| Expelled, yet the disciples were filled with joy and the Holy Spirit | Acts 13:50–52 |

Verse pills: प्रेरितों 13:2 · प्रेरितों 13:9–12 · प्रेरितों 13:46–48

Suggested shots: (1) hook, Paul and Barnabas kneeling in the court, a light glow; (2) the church praying, glow on the two; (3) the harbour at golden hour, boat, Mark with a bag; (4) the Paphos street, the proconsul seated, Elymas stepping in, stern; (5) Paul pointing, then Elymas `shut: true` with a dark puff and "dazed"; (6) the proconsul `relief_open`, sparkles; (7) the perga road walk, then the synagogue street with a big crowd; (8) angry crowd members point, Paul and Barnabas walk away, smiling Gentile crowd; (9) the lesson, Paul close-up, golden; (10) Paul and Barnabas on the road toward the mountains, then the end card.

**Instagram caption:**
```
बाइबल: शुरू से अंत तक · पौलुस की यात्राएँ, भाग 2/9 · प्रेरितों के काम 13

एक प्रार्थना सभा में पवित्र आत्मा ने कहा: "बरनबास और शाऊल को मेरे काम के लिए अलग करो" (प्रेरितों 13:2)। और शुरू हुई पहली यात्रा।

जादूगर ने रोकना चाहा, शहर ने निकाल दिया, फिर भी चेले आनंद से भरते गए (प्रेरितों 13:52)। विरोध दरवाज़ा बंद नहीं करता, नया खोल देता है। 🚪

💬 आपको परमेश्वर कहाँ भेज रहा है?
हर सोम, बुध और शुक्र नई रील के लिए फ़ॉलो करें।

#biblekahani #paulus #pehliyatra #yeshu #hindibible #christianreels #biblestoriesinhindi #faith
```
**YouTube title:** पहली यात्रा: एक प्रार्थना सभा और बदल गया इतिहास 🔥 पौलुस की यात्राएँ भाग 2 #shorts #bible

---

## 4. Reel: एसाव और एक कटोरी दाल (Genesis 25)
The next story after Abraham in "The Bible, Start to Finish" (Abraham's reel was Genesis 22).

**Hook text:** एक कटोरी दाल के बदले पूरा भविष्य?
**Badge:** बाइबल: शुरू से अंत तक · उत्पत्ति 25
**End card:** कमेंट में बताइए 👇 (no part number)
**Cast:** `ISAAC` (now a grown man; in `abraham/people.ts`, give him a short beard), **रिबका** (new: woman with a blue veil), **एसाव** (new: big build, red-brown hair and beard, rough tan tunic, a bow on his back), **याकूब** (new: slimmer, neat dark hair, green robe), two babies for line 3 (small scale, around 0.4).
**Sets** (in the abraham world): `fields` (Esau hunting, open land), `hut` / tents (Jacob cooking at a fire), `dusk` / golden for the lesson. Use the fire effect (`fxFire`) under a pot. A red stew pot can be drawn as a small fx card (a brown pot with a red top).

Narration:
1. [intrigued] एक कटोरी दाल के बदले, उसने अपना पूरा भविष्य बेच दिया। [pause] कौन था वो?
2. [warm] अब्राहम का बेटा इसहाक बड़ा हुआ और रिबका से शादी की। बीस साल तक कोई औलाद नहीं हुई। इसहाक ने प्रार्थना की, और जुड़वाँ बेटे हुए।
3. [playful] पहला लाल और रोएँदार निकला: एसाव। दूसरा उसकी एड़ी पकड़े निकला: याकूब।
4. [narrating] एसाव बड़ा होकर शिकारी बना, मैदानों का आदमी। याकूब शांत था, तंबुओं में रहने वाला।
5. [tired] एक दिन एसाव शिकार से थका-हारा लौटा। याकूब लाल दाल पका रहा था। [desperate] एसाव बोला: जल्दी, मुझे वो लाल-लाल खाने दे, मैं थक कर मर रहा हूँ!
6. [sly] याकूब ने कहा: पहले अपना पहलौठे का हक़ मुझे बेच दे।
7. [serious] पहलौठे का हक़ मतलब परिवार की दोहरी विरासत, और अब्राहम से मिले परमेश्वर के वादे की आशीष।
8. [dismissive] और एसाव ने कहा: मैं तो मरने वाला हूँ, इस हक़ से मुझे क्या फ़ायदा? [flat] उसने क़सम खाई, दाल खाई, पानी पिया, और उठकर चला गया।
9. [solemn] बाइबल कहती है: यूँ एसाव ने अपने पहलौठे के हक़ को तुच्छ जाना। और इब्रानियों की पत्री कहती है, उसने एक वक़्त के खाने के लिए उसे बेच दिया।
10. [sincere] सीख ये है: भूख कुछ पल की थी, नुकसान हमेशा का। जो अभी चाहिए, उसके लिए जो हमेशा का है, उसे मत बेचिए।
11. [warm] आप किस "एक कटोरी दाल" के लिए कुछ क़ीमती छोड़ने को तैयार हो जाते हैं? कमेंट में बताइए।

| Claim | Source |
|---|---|
| Isaac married Rebekah; she was barren; Isaac prayed; twins | Genesis 25:20–24 |
| Isaac 40 at marriage, 60 at the birth (about 20 years) | Genesis 25:20, 26 |
| First red and hairy, Esau; second holding Esau's heel, Jacob | Genesis 25:25–26 |
| Esau a skilful hunter, man of the field; Jacob quiet, dwelling in tents | Genesis 25:27 |
| Esau exhausted; "let me eat that red stew"; "sell me your birthright first" | Genesis 25:29–31 |
| "I am about to die; what use is a birthright?"; swore, ate, drank, went | Genesis 25:32–34 |
| The stew was lentils; "Esau despised his birthright" | Genesis 25:34 |
| Firstborn's double portion | Deuteronomy 21:17 |
| The covenant blessing passed down from Abraham | Genesis 26:3–4; 28:4 |
| "sold his birthright for a single meal" | Hebrews 12:16–17 |

Verse pills: उत्पत्ति 25:26 · उत्पत्ति 25:30–31 · उत्पत्ति 25:34 · इब्रानियों 12:16

Suggested shots: (1) hook, a close-up of the stew pot steaming, then Esau grabbing at it (grin); (2) Isaac and Rebekah at the tent, sad, then Isaac praying with a glow, then a happy couple; (3) the two babies, comic, one smaller holding on; (4) a split feel: grown Esau with a bow in the field, Jacob by the tent fire; (5) Esau stumbling in, `pained`, then reaching (`shock` to `grin`), steam; (6) Jacob `smile_closed`, one hand up; (7) a golden glow over the tent and a soft fx of two coins / a scroll (inheritance); (8) Esau shrugs (`dazed`), eats, walks off; (9) dusk, Jacob holding the empty bowl; (10) lesson close-up; (11) end card.

**Instagram caption:**
```
बाइबल: शुरू से अंत तक · उत्पत्ति 25

भूखा एसाव शिकार से लौटा और बोला: "मुझे वो लाल दाल खाने दे!" याकूब ने कहा: "पहले अपना पहलौठे का हक़ बेच दे।" और एसाव ने बेच दिया (उत्पत्ति 25:30–33)।

भूख कुछ पल की थी, नुकसान हमेशा का (इब्रानियों 12:16)। 🍲

💬 आप किस "एक कटोरी दाल" के लिए कुछ क़ीमती छोड़ देते हैं?
हर सोम, बुध और शुक्र नई रील के लिए फ़ॉलो करें।

#biblekahani #esau #yakub #utpatti #yeshu #hindibible #christianreels #biblestoriesinhindi
```
**YouTube title:** एक कटोरी दाल के बदले पूरा भविष्य 😳 एसाव और याकूब #shorts #bible

(YouTube description = the same caption with "सब्सक्राइब करें" instead of "फ़ॉलो करें".)

---

## 5. Report back (paste this, filled in, to the owner)

```
REPORT 015
commit: <hash>
paul2: duration <s>, frames <n>, shots <n>, LUFS <x> / peak <y> dBTP, voice take <A/B>
esau:  duration <s>, frames <n>, shots <n>, LUFS <x> / peak <y> dBTP, voice take <A/B>
files added: <list of folders/files>
changed outside the new folders: <Root.tsx, jobs/queue.md, docs/posts.json, anything else?>
test stills checked: <yes/no, which shots>
known problems / not done: <list, or "none">
ElevenLabs credits used: <approx>
```
