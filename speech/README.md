# speech: the app's voice, and assessing a spoken word

Two things live here, both run on our own machine with open-source libraries. No paid speech
service is called, and once the models are downloaded nothing leaves the machine.

| Folder | What it does | Used by the app? |
| --- | --- | --- |
| `tts/` | **Speaks.** A text said in a voice, as MP3: Kokoro's for English and Hindi, Indic-TTS's for Bengali. | Yes: everything the app says aloud. |
| `assess/` | **Listens.** Says what it heard in a recording of one word, as codes with a confidence. | Not yet: a measuring tool. |

## Set up

Python **3.10 to 3.12** (Kokoro does not run on later ones yet). Nothing needs installing on the
system: Kokoro brings its own copy of espeak-ng.

On a machine whose system drive is nearly full, send downloads elsewhere first: `PIP_CACHE_DIR`,
`TEMP` / `TMP`. Kokoro's model goes to `speech/.models` by itself (set `HF_HOME` to put it
elsewhere). This repo ignores `speech/.cache`, `speech/.models` and `speech/.venv`.

```bash
cd speech
python -m venv .venv
.venv/Scripts/activate            # Windows; source .venv/bin/activate elsewhere
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -e ".[dev]"           # add ",assess" inside the brackets for the scorer too
python -m tts.indic_fetch bn      # Bengali's model, 1.5 GB, once (see "Bengali" below)
```

**If Windows refuses to load a library file** ("An Application Control policy has blocked this
file"): Smart App Control does that to some freshly released builds. Leave the policy alone and
install an older release of the package named in the error. On the development laptop these
were needed: `numpy==2.2.6`, `spacy==3.8.7`, `srsly==2.5.1`, `curated-tokenizers==0.0.9`,
`scikit-learn==1.8.0`. Try the import a second time before pinning anything: a file is sometimes
refused once, when the service Windows asks about it cannot be reached, and loads the next time.

## Speaking (`tts/`)

```bash
npm run dev:speech            # from the repo's root; or: python -m tts
python -m tts.samples         # every offered voice says a sentence, into speech/samples/
python -m tts.samples af_heart hf_alpha     # or only some
```

- It listens on `127.0.0.1:8788` (`SPEECH_PORT`) and is called by the Node server only, which
  checks, limits and keeps what it makes. The app never talks to it directly.
- It loads its models **before** it starts answering, which takes a minute or two; the first use
  ever also downloads Kokoro's (about 330 MB) and each of its voices (about 0.5 MB).
- **One sentence is made at a time**, whichever model says it (`Speakers` in `tts/synth.py`): the
  processor is the limit, and two at once only take longer.
- `GET /voices` lists the voices, `POST /speak {text, voice}` answers with MP3, `GET /health`.
- **With the MP3 comes the mouth for it**, in the `X-Speech-Mouth` header (`tts/mouth.py`): for a
  drawn face in the app, which shape the lips have and from which thousandth of a second
  (`0c450m500o575m625r925c`: closed, then nearly closed from 0.45 s, open from 0.5 s, …). It is
  exact, not estimated: Kokoro decides how long every sound of the sentence lasts before it
  makes the speech, and those lengths add up to the speech. Which sound gets which of the five
  shapes is the table at the top of that file; the jaw opens on every vowel and comes up for
  the consonants between. A sound whose lengths do not line up with its sounds is sent without
  a mouth, and the Node server then does not keep it.
- A voice's file is asked of the model hub only the first time it is wanted (`voice_file` in
  `tts/synth.py`). Kokoro would ask again on every start, and on a slow connection that kept
  the first sentence in each voice waiting a minute and a half: longer than the server waits.
- **The voices on offer** are in `tts/voices.py`: American and British English and Hindi, those
  Kokoro's model card grades C or better, best first, and Bengali's two (below). The first of each
  gender in a language is that language's default. One of Kokoro's own voices says what it is in
  its id: `a` American, `b` British, `h` Hindi, then `f` or `m` (`af_heart`). Adding a language
  or a voice is done in that file and nowhere in the app.
- **Each voice names the model that says it** (`model` in `/voices`), and the Node server keeps a
  sound under that name: so a change to one model does not throw away the other's sounds.
- **How fast:** on a 2-core laptop one of Kokoro's sentences takes about as long to make as it
  lasts (1.0 to 1.4 times). With both models loaded the service holds about 1.5 GB of memory
  (Kokoro alone: about 1 GB). The Node server keeps every sound it has made, so a sentence is
  made once.
- **If it does not finish loading:** Kokoro asks the model hub each time it starts, and on a
  poor connection that can hang for many minutes. With every file already fetched, set
  `HF_HUB_OFFLINE=1` first and it starts without asking.

### Bengali (`tts/indic.py`, `tts/bengali.py`)

Kokoro was never taught Bengali and has no Bengali voice. **Bengali is said by AI4Bharat's
[Indic-TTS](https://github.com/AI4Bharat/Indic-TTS)**: a model taught Bengali itself (FastPitch,
which turns letters into a picture of the speech, and HiFi-GAN, which turns the picture into
sound), with a woman's voice and a man's. The model calls them only `female` and `male`, so the
names are ours: `bn_diya` (Diya) and `bn_arjun` (Arjun), in `INDIC` in `tts/voices.py`.

```bash
python -m tts.indic_fetch bn      # once: 1.5 GB to fetch, 1.6 GB kept in speech/.models/indic-tts
python -m tts.samples bn_diya bn_arjun
```

- **The model is fetched by hand, once on each machine** (`INDIC_TTS_HOME` puts it elsewhere).
  Without it the service starts all the same, says which language it cannot speak, and does not
  list that language's voices: Bengali is then silent in the app, like any language with no voice.
- **Coqui TTS runs it** (`coqui-tts` 0.27.5, the maintained one; AI4Bharat's own instructions are
  for a 2022 fork that does not install here). It is newer than the checkpoints and older than
  this environment's PyTorch and `transformers`, which shows in three places, all in `indic.py`:
  it will not be imported without `torchaudio` and `torchcodec`, which this model never uses; it
  asks `transformers` for a helper that is gone, for its XTTS model, so a stand-in is put there
  first; and it reads the speakers from a path on the machine the model was trained on, so the
  loading is done step by step. **A newer `torch` or `transformers` may break it again**: after
  upgrading either, run `python -m tts.samples bn_diya` before anything else.
- **On the development laptop** `scikit-learn==1.8.0` was needed (Smart App Control blocked
  1.9.1, and with it `transformers`, which uses it whenever it is installed).
- **It reads Bengali letters only** (`tts/bengali.py`): a number is said as its word
  (`bnnumerizer`), and an English word is respelled in Bengali letters, from a list of the words
  the course quotes (`RESPELLED`) or else from its sounds as eSpeak NG gives them, and said by the
  same voice with a Bengali speaker's accent. What the model was not taught is left out.
  `TODO(content)`: a Bengali speaker's eye on the list, and ear on the rest.
- **Every sentence came with up to a second of quiet before and after it**, as the recordings it
  learned from had; that is cut to a breath and a pause (`spoken_part` in `indic.py`).
- **The mouth is close, not exact.** FastPitch too decides each letter's length before it speaks,
  and those lengths add up to the speech, so nothing is estimated from the spelling. But where
  the model puts a letter is not always where its sound is: measured against the sound, most
  letters sit on theirs (every vowel and stop of "সুপ্রভাত"), while **a vowel that opens a word
  ("আপনার", "আছি") is heard 60 to 100 ms from the time it was given**, in its neighbour's. And
  the model is given letters, not sounds: a Bengali consonant carries a vowel that is not
  written, and `mouth_of_letters` opens the jaw for it wherever the spelling says it is there,
  which is not everywhere a speaker says it. `TODO(content)`: an eye on the tutor's lips in
  Bengali.
- **How fast:** about 0.6 to 1.0 seconds of work for a second of sound on the 2-core laptop,
  after about a minute to load.
- **Its sounds are kept under its own name** (`MODELS` in `tts/voices.py`: `indic-tts-v1`). After
  changing how a Bengali text is prepared or how its quiet is cut, change that name: every Bengali
  sound is then made afresh, and Kokoro's are left as they are.
- **Another of its languages** (it has thirteen: Hindi, Tamil, Telugu, Marathi, …) needs its model
  fetched (`python -m tts.indic_fetch <code>`), a reader for its script beside `bengali.py`
  (`READERS` in `indic.py`), and its two voices in `INDIC`. Nothing in the app.
- **The licence is not settled.** The repository is MIT; the terms of the model files and of the
  IIT Madras recordings they were trained on were not found. `TODO(ops)`: read them before this
  speaks to real learners.

**What was tried before, and is gone.** Kokoro's Hindi voices reading Bengali, from sounds eSpeak
NG wrote (`bn_alpha`, `bn_beta`, `bn_omega`, `bn_psi`): Bengali in a Hindi speaker's mouth, from a
model that never heard Bengali. It was listened to beside Indic-TTS on 2026-10-13 and rejected.
The IndicVoice-82M fork (`Bindkushal/IndicVoice-82M`) was never used: its model and voice files
are Kokoro's own, the same to the byte, and its Bengali reader stops with an error on its first
word.

## Listening (`assess/`)

**No learner sees any of this yet.** Its job is to tell us how often it is right on recordings of
our own learners. Only what clears the bar below goes on a screen.

| Library | For | Licence |
| --- | --- | --- |
| [OpenPronounce](https://github.com/Halleck45/OpenPronounce) 0.3.0 | The sounds that were said, against the sounds the word has | MIT |
| Praat, through `praat-parselmouth` | Length, loudness and pitch of each syllable, for stress | GPL: server-side only, never shipped in the app |

Only OpenPronounce's sound recogniser is loaded: one model, about 1.2 GB. Its 0-to-100 score is
not used: a learner is shown a thing to fix, not a mark.

**It has an environment of its own, `speech/.venv-assess`.** OpenPronounce cannot be installed
beside the voices: it needs `click` below 8.2 and the `transformers` the voices run on needs 8.4
or later, and it wants `phonemizer` where Kokoro has a fork under the same name.

```bash
cd speech
python -m venv .venv-assess
.venv-assess/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv-assess/Scripts/python -m pip install "openpronounce==0.3.0" "transformers<5" praat-parselmouth espeakng-loader psutil
.venv-assess/Scripts/python -m assess recordings/synthetic/wednesday-right.wav "Wednesday" --parts "We(d)n(e)s-day" --stress 1
```

- **Nothing is installed on the system.** espeak-ng comes from `espeakng-loader`, as the voices'
  does (`assess/sounds.py` says where it is), and a WAV is read without `ffmpeg`. A browser's
  recording (webm, mp4) is not: that still needs `ffmpeg`, or the app sending WAV.
- The first run fetches the model into `speech/.models`. Only the one model comes.

### What it costs (measured 2026-10-13)

On the development laptop (2 cores, 8 GB), a word of about a second and a half:

| | As OpenPronounce loads it | An 8-bit copy of it |
| --- | --- | --- |
| On disk | 1.2 GB | 0.34 GB |
| Memory, loaded and used | 1.7 GB | 1.15 GB |
| Seconds a word | 0.5 to 0.7 | 0.2 to 0.25 |
| To load | about 5 s; 30 s the first time after a restart | about 8 s |

The first word or two after loading are slower (up to 2 s, once 7 s). The 8-bit copy is
PyTorch's own dynamic quantisation of the model's linear layers; **it is not in this repo**, only
measured. It heard the same sounds in all three clips, with confidences a little different:
enough to move one finding across a line (an extra syllable at 0.54, and at 0.44), so its
thresholds would have to be set on recordings of its own.

**What this does not say: whether it is right.** The three clips in `recordings/synthetic` are a
machine's voice. On them it heard "Wednesday" sound for sound, and the three-part "Wed-nes-day"
as an extra syllable with other sounds. That shows it runs. The bar below is still unmet, and
needs learners' recordings.

| Code | Meaning | How it is known |
| --- | --- | --- |
| `ok` | Nothing to correct | No finding below applied |
| `nothingHeard` | No speech in the recording | No sounds recognised |
| `extraSyllable` | More parts than the word has ("Wed-nes-day") | Vowels heard, against the parts in the lesson's content |
| `missingSyllable` | Fewer parts | The same count |
| `stressMoved` | Another part was the strong one | Each syllable against the speaker's own others; never against a target in Hz |
| `soundDiffers` | A sound was heard as another | OpenPronounce's comparison, minus `assess/variants.py` |

`assess/variants.py` lists the sounds of an Indian accent that are not mistakes (`v` for `w`,
`t` and `d` with the tongue curled back, …). It is a first list and needs a teacher's review.

```bash
python -m assess clip.wav "Wednesday" --parts "We(d)n(e)s-day" --stress 1
python evaluate.py recordings/        # the numbers: see below
```

`--parts` and `--stress` are what Admin › Lessons stores for a word on Day 2. Recordings that are
not WAV (a browser's webm or mp4) also need `ffmpeg` on the system.

### The recordings we need

`recordings/` is ignored by git: learners' voices never go in the repository.

About 60 to 100 clips of Week 1's six words, from a few speakers like our learners (adults and,
if possible, a child). Each word said once well and once with a known mistake. Then
`recordings/labels.csv`, one line per clip, `said` being what the speaker really did:

```csv
file,word,parts,stress,said
asha-hello-1.wav,hello,hel-lo,2,ok
asha-hello-2.wav,hello,hel-lo,2,stressMoved
ravi-name-2.wav,name,nam(e),,extraSyllable
```

### The bar

`evaluate.py` prints, per code and at several confidence thresholds: right, wrong, missed,
precision and recall, then seconds a word and peak memory.

A code is shown to learners only if, at some threshold, **it is right at least 8 times in 10 when
it speaks** (precision 0.8 or more) on our recordings, and a word takes under about 3 seconds on
the server. Missing a mistake is cheap; a wrong correction is not.

Every number in `assess/stress.py` and `MISSING_UNSURE` in `assess/result.py` is a guess until
then.

## Tests

```bash
pytest          # both halves, on fixed numbers and fakes; no model needed
```
