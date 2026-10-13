"""The voices the app can speak with: Kokoro's, for the languages it has, and Indic-TTS's for Bengali.

One of Kokoro's own voices says what it is in its id: the first letter is the language Kokoro
speaks it in (`a` American English, `b` British English, `h` Hindi), the second whether it is a
woman's or a man's. So nothing here is guessed, as it had to be with a browser's voices.

Only voices Kokoro's own model card grades C or better are offered, best first: the app's
learners chose these voices because the device's were poor. The whispered voice is left out; a
tutor does not whisper. TODO(content): a teacher's ear on the order, and on which to offer.

Kokoro has no Bengali voices, and its Hindi ones reading Bengali were listened to and rejected.
Bengali is said by a model that was taught Bengali, AI4Bharat's Indic-TTS (see `indic.py`).
"""

from __future__ import annotations

from dataclasses import dataclass

# The language of one of Kokoro's own voices, by the first letter of its id.
LANGUAGES = {"a": "en-US", "b": "en-GB", "h": "hi-IN"}
GENDERS = {"f": "female", "m": "male"}

# What says a voice, and the name its sounds are kept under: a sound made by another model, or
# another version of one, is not served. A change to one leaves the other's sounds as they are.
MODELS = {"kokoro": "kokoro-82m-v1.0", "indic": "indic-tts-v1"}

# Best first within a language and gender. American English comes before British because its
# voices are the better made; the first of each gender is what a tutor speaks with until the
# learner chooses.
OFFERED = (
    "af_heart", "af_bella", "af_aoede", "af_kore", "af_sarah", "af_nova",
    "am_michael", "am_fenrir", "am_puck",
    "bf_emma", "bf_isabella",
    "bm_george", "bm_fable",
    "hf_alpha", "hf_beta",
    "hm_omega", "hm_psi",
)  # fmt: skip

# Indic-TTS has a woman's and a man's voice for each of its languages and calls them only that
# (`female`, `male`), so the names are ours: an id, what it is called on screen, its language, and
# which of the model's two speakers it is.
INDIC = (
    ("bn_diya", "Diya", "bn-IN", "female"),
    ("bn_arjun", "Arjun", "bn-IN", "male"),
)


@dataclass(frozen=True)
class Voice:
    id: str
    # What it is called on screen: its own name, which is not translated.
    name: str
    # A language tag with its region: the accent is part of what a learner chooses.
    language: str
    gender: str
    # The voice a tutor of this gender has in this language until one is chosen.
    default: bool
    # Who says it, as its model knows them: one of Kokoro's voices, or `female` or `male`.
    speaker: str
    # What says it: `kokoro` or `indic`.
    engine: str = "kokoro"

    @property
    def lang_code(self) -> str:
        """Kokoro's letter for the language one of its speakers was made for."""
        return self.speaker[0]

    @property
    def model(self) -> str:
        return MODELS[self.engine]

    def to_json(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "language": self.language,
            "gender": self.gender,
            "default": self.default,
            # For the server's shelf of sounds; it does not pass this on to the app.
            "model": self.model,
        }


def base_language(tag: str) -> str:
    return tag.split("-")[0].lower()


def _catalogue() -> tuple[Voice, ...]:
    said_by = [
        (speaker, speaker.split("_", 1)[1].capitalize(), LANGUAGES[speaker[0]], GENDERS[speaker[1]], speaker, "kokoro")
        for speaker in OFFERED
    ]
    said_by += [(voice_id, name, language, speaker, speaker, "indic") for voice_id, name, language, speaker in INDIC]

    voices = []
    seen: set[tuple[str, str]] = set()
    for voice_id, name, language, gender, speaker, engine in said_by:
        # One default for each gender in a language, whatever its accent.
        first = (base_language(language), gender)
        voices.append(
            Voice(
                id=voice_id,
                name=name,
                language=language,
                gender=gender,
                default=first not in seen,
                speaker=speaker,
                engine=engine,
            )
        )
        seen.add(first)
    return tuple(voices)


VOICES: tuple[Voice, ...] = _catalogue()
_BY_ID = {voice.id: voice for voice in VOICES}


def find_voice(voice_id: str) -> Voice | None:
    return _BY_ID.get(voice_id)
