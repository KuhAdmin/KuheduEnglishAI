# speech: the app's voice, and assessing a spoken word

Two things live here, both run on our own machine with open-source libraries. No paid speech
service is called, and once the models are downloaded nothing leaves the machine.

| Folder | What it does | Used by the app? |
| --- | --- | --- |
| `tts/` | **Speaks.** A text said in one of Kokoro's voices, as MP3. | Yes: everything the app says aloud. |
| `assess/` | **Listens.** Says what it heard in a recording of one word, as codes with a confidence. | Not yet: a measuring tool. |

## Set up

Python **3.10 to 3.12** (Kokoro does not run on later ones yet). Nothing needs installing on the
system: Kokoro brings its own copy of espeak-ng.

On a machine whose system drive is nearly full, send downloads elsewhere first: `PIP_CACHE_DIR`,
`TEMP` / `TMP`. The model goes to `speech/.models` by itself (set `HF_HOME` to put it elsewhere).
This repo ignores `speech/.cache`, `speech/.models` and `speech/.venv`.

```bash
cd speech
python -m venv .venv
.venv/Scripts/activate            # Windows; source .venv/bin/activate elsewhere
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -e ".[dev]"           # add ",assess" inside the brackets for the scorer too
```

**If Windows refuses to load a library file** ("An Application Control policy has blocked this
file"): Smart App Control does that to some freshly released builds. Leave the policy alone and
install an older release of the package named in the error. On the development laptop these
were needed: `numpy==2.2.6`, `spacy==3.8.7`, `srsly==2.5.1`, `curated-tokenizers==0.0.9`.

## Speaking (`tts/`)

```bash
npm run dev:speech            # from the repo's root; or: python -m tts
python -m tts.samples         # every offered voice says a sentence, into speech/samples/
python -m tts.samples af_heart hf_alpha     # or only some
```

- It listens on `127.0.0.1:8788` (`SPEECH_PORT`) and is called by the Node server only, which
  checks, limits and keeps what it makes. The app never talks to it directly.
- It loads the model **before** it starts answering, which takes up to a minute; the first use
  ever also downloads it (about 330 MB) and each voice (about 0.5 MB).
- `GET /voices` lists the voices, `POST /speak {text, voice}` answers with MP3, `GET /health`.
- A voice's file is asked of the model hub only the first time it is wanted (`voice_file` in
  `tts/synth.py`). Kokoro would ask again on every start, and on a slow connection that kept
  the first sentence in each voice waiting a minute and a half: longer than the server waits.
- **The voices on offer** are in `tts/voices.py`: American and British English and Hindi, those
  Kokoro's model card grades C or better, best first, and Bengali (below). The first of each
  gender in a language is that language's default. One of Kokoro's own voices says what it is in
  its id: `a` American, `b` British, `h` Hindi, then `f` or `m` (`af_heart`). Adding a language
  or a voice is done in that file and nowhere in the app.
- **How fast:** on a 2-core laptop a sentence takes about as long to make as it lasts (1.0 to
  1.4 times), in about 1 GB of memory. The Node server keeps every sound it has made, so a
  sentence is made once.

### Bengali (`tts/bengali.py`)

Kokoro was never taught Bengali and has no Bengali voice. It speaks in two steps, text to sounds
and sounds to speech, and only the first knows about languages. So:

1. **eSpeak NG reads the Bengali text** into sounds. Kokoro already uses it for Hindi and brings
   it along, so nothing more is installed. English words and numbers inside the text are read too.
2. **Kokoro's model says those sounds in one of its Hindi voices**, Hindi being the nearest
   language it was taught. Each is offered again under an id of its own (`bn_alpha`, `bn_beta`,
   `bn_omega`, `bn_psi`), because a voice is of one language to the app.

What comes out is Bengali in a Hindi speaker's mouth, from a model that never heard Bengali.
**Listen before trusting it:** `python -m tts.samples bn_alpha bn_beta bn_omega bn_psi`, and
`hf_alpha` beside them for the same speaker in the language she was made for. To take Bengali
away again, remove the `bn-IN` line from `BORROWED` in `tts/voices.py`.

- **What eSpeak NG gets wrong is repaired in `bengali.py`**, each repair held by a test that asks
  eSpeak NG itself (`tests/test_bengali.py`): the dotted letters ড়, ঢ়, য়, whose following vowel
  it loses in one of their two encodings (`বাড়ি` came out as "bar"); the flapped r, which it
  writes "r." with a full stop the model would take for the end of a sentence; a consonant
  doubled at the start of a word (`ক্ষমা`); and Bengali's own full stop (।), which it drops.
- **A wrongly read word is fixed there**, or upstream in eSpeak NG's Bengali rules. A sound
  already made stays as it was: the Node server keeps sounds by voice and text, so clear
  `server/var/speech` after changing how Bengali is read.
- **The IndicVoice-82M fork** (`Bindkushal/IndicVoice-82M`, with `indic-g2p` and `indic-voice`)
  was the fork meant for this, and is not used. Its model and voice files are Kokoro's own, the
  same to the byte, so it has no Bengali voice either; and its Bengali reader is a table of
  letters that does not join consonants or drop the unwritten vowel, is refused by its own
  pipeline (`bn` is not among its languages) and stops with an error on its first word.
  `sammy4321/Kokoro-Indic-Fine-Tuning`, a real retraining, has published Kannada only. A
  Bengali voice worth the name needs one of those to publish Bengali weights; the catalogue is
  the only place that would change.

## Listening (`assess/`)

**No learner sees any of this yet.** Its job is to tell us how often it is right on recordings of
our own learners. Only what clears the bar below goes on a screen.

| Library | For | Licence |
| --- | --- | --- |
| [OpenPronounce](https://github.com/Halleck45/OpenPronounce) 0.3.0 | The sounds that were said, against the sounds the word has | MIT |
| Praat, through `praat-parselmouth` | Length, loudness and pitch of each syllable, for stress | GPL: server-side only, never shipped in the app |

Only OpenPronounce's sound recogniser is loaded: one model, about 1.2 GB. Its 0-to-100 score is
not used: a learner is shown a thing to fix, not a mark. Install with
`pip install -e ".[dev,assess]"`; it has not been run with its model yet (the development laptop
has no room for it).

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
