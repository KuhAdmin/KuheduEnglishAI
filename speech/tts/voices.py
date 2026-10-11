"""The voices the app can speak with: Kokoro's, for the languages it has, and for Bengali.

One of Kokoro's own voices says what it is in its id: the first letter is the language Kokoro
speaks it in (`a` American English, `b` British English, `h` Hindi), the second whether it is a
woman's or a man's. So nothing here is guessed, as it had to be with a browser's voices.

Only voices Kokoro's own model card grades C or better are offered, best first: the app's
learners chose these voices because the device's were poor. The whispered voice is left out; a
tutor does not whisper. TODO(content): a teacher's ear on the order, and on which to offer.

Kokoro has no Bengali voices. Bengali is said in its Hindi ones (see `bengali.py`), each offered
again under an id of its own (`bn_alpha`), because a voice is of one language to the app.
"""

from __future__ import annotations

from dataclasses import dataclass

# The language of one of Kokoro's own voices, by the first letter of its id.
LANGUAGES = {"a": "en-US", "b": "en-GB", "h": "hi-IN"}
GENDERS = {"f": "female", "m": "male"}

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

# A language Kokoro was not taught, and the voices of the nearest one it was: who says it.
BORROWED = {"bn-IN": ("hf_alpha", "hf_beta", "hm_omega", "hm_psi")}


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
    # Which of Kokoro's voices says it: itself, unless its language borrows another's.
    speaker: str

    @property
    def lang_code(self) -> str:
        """Kokoro's letter for the language its speaker was made for."""
        return self.speaker[0]

    def to_json(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "language": self.language,
            "gender": self.gender,
            "default": self.default,
        }


def base_language(tag: str) -> str:
    return tag.split("-")[0].lower()


def _catalogue() -> tuple[Voice, ...]:
    said_by = [(speaker, LANGUAGES[speaker[0]], speaker) for speaker in OFFERED]
    for language, speakers in BORROWED.items():
        said_by += [
            (f"{base_language(language)}_{speaker.split('_', 1)[1]}", language, speaker)
            for speaker in speakers
        ]

    voices = []
    seen: set[tuple[str, str]] = set()
    for voice_id, language, speaker in said_by:
        gender = GENDERS[speaker[1]]
        # One default for each gender in a language, whatever its accent.
        first = (base_language(language), gender)
        voices.append(
            Voice(
                id=voice_id,
                name=speaker.split("_", 1)[1].capitalize(),
                language=language,
                gender=gender,
                default=first not in seen,
                speaker=speaker,
            )
        )
        seen.add(first)
    return tuple(voices)


VOICES: tuple[Voice, ...] = _catalogue()
_BY_ID = {voice.id: voice for voice in VOICES}


def find_voice(voice_id: str) -> Voice | None:
    return _BY_ID.get(voice_id)
