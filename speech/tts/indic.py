"""Text to sound in a language Kokoro was never taught: the one place that touches Coqui TTS.

AI4Bharat's Indic-TTS is a model per language (FastPitch, which turns letters into a picture of the
speech, and HiFi-GAN, which turns the picture into sound), each trained on a woman's and a man's
recordings of that language itself. Coqui TTS is the library that runs them.

Like Kokoro, FastPitch decides how long every letter lasts before it makes the speech. Coqui's own
`Synthesizer.tts` throws that away, so the two steps are run here and the lengths kept: they are
what a drawn face's lips move by (`mouth.py`).
"""

from __future__ import annotations

import os
import threading
from dataclasses import dataclass
from pathlib import Path

from . import bengali
from .mouth import mouth_of_letters
from .synth import Spoken, to_mp3
from .voices import Voice, base_language

_SPEECH = Path(__file__).resolve().parents[1]
# Beside Kokoro's model, and for the same reason: the system drive may have no room for it.
HOME = Path(os.environ.get("INDIC_TTS_HOME", _SPEECH / ".models" / "indic-tts"))
# Coqui draws charts while training and so loads Matplotlib, which keeps a list of fonts: here too.
os.environ.setdefault("MPLCONFIGDIR", str(_SPEECH / ".cache" / "matplotlib"))

# What a language's model is made of (`python -m tts.indic_fetch` brings them).
FILES = (
    "fastpitch/best_model.pth",
    "fastpitch/config.json",
    "fastpitch/speakers.pth",
    "hifigan/best_model.pth",
    "hifigan/config.json",
)

# A language's text as its model can read it: only the letters it was taught, in sentences.
READERS = {"bn": bengali}

# The model was taught on recordings that open and close with up to a second of quiet, and gives
# that back with every sentence: left in, a line of three sentences is half pauses (measured: 2.7 s
# for "আপনার নাম কী?", under a second of it speech). What is kept instead: a breath before the
# first sound, and after the last the pause a speaker leaves between two sentences.
LEAD_SECONDS = 0.06
TAIL_SECONDS = 0.3
# Quiet is anything under this share of the sentence's loudest hundredth of a second. Low enough
# to keep a word that opens on a hiss ("সুপ্রভাত"), above the murmur the quiet stretches have.
QUIET = 0.04


def model_folder(language: str) -> Path:
    return HOME / language


def spoken_part(samples, rate: int) -> tuple[int, int]:
    """Where the speech is in a sentence's sound: the sample it is kept from, and the one it is kept to."""
    import numpy as np

    window = rate // 100
    count = len(samples) // window
    if not count:
        return 0, len(samples)
    whole = np.asarray(samples[: count * window], dtype=np.float64).reshape(count, window)
    level = np.sqrt((whole**2).mean(axis=1))
    heard = np.flatnonzero(level > QUIET * level.max())
    if not len(heard):
        return 0, len(samples)
    start = max(0, int(heard[0]) * window - round(LEAD_SECONDS * rate))
    end = min(len(samples), (int(heard[-1]) + 1) * window + round(TAIL_SECONDS * rate))
    return start, end


@dataclass(frozen=True)
class Piece:
    """One sentence as it was said."""

    # What the model was given, one at a time: letters, marks, spaces.
    letters: tuple[str, ...]
    # How many frames of speech it gave each; `None` if they do not add up to the speech.
    frames: tuple[int, ...] | None
    # How long a frame lasts.
    frame_seconds: float
    # When the first letter begins, in seconds into `samples`: before zero where the quiet it
    # opens with was cut away.
    begins: float
    # How long `samples` last.
    seconds: float
    samples: object


@dataclass(frozen=True)
class Loaded:
    """A language's model: what makes the picture of the speech, and what makes the sound of it."""

    speech: object
    vocoder: object
    # The scale the vocoder was taught pictures in, which is not the scale they are drawn in.
    vocoder_audio: object


def _load(folder: Path) -> Loaded:
    """Imported where it is used: Coqui loads PyTorch and a great deal else."""
    import torch
    import transformers.pytorch_utils as helpers

    # Coqui TTS 0.27 wants this the moment it is imported, for a model of its own (XTTS) that is
    # not used here, and the `transformers` Kokoro runs on no longer has it. It was `torch.isin`
    # with a detour for Apple's processors.
    if not hasattr(helpers, "isin_mps_friendly"):
        helpers.isin_mps_friendly = torch.isin

    from TTS.config import load_config
    from TTS.tts.models import setup_model as setup_speech
    from TTS.utils.audio import AudioProcessor
    from TTS.vocoder.models import setup_model as setup_vocoder

    # Coqui's own `Synthesizer` does these steps, but reads the speakers from wherever the model's
    # notes say, which is a folder on the machine it was trained on.
    notes = load_config(str(folder / "fastpitch" / "config.json"))
    speakers = str(folder / "fastpitch" / "speakers.pth")
    notes.speakers_file = notes.model_args.speakers_file = speakers
    speech = setup_speech(config=notes)
    speech.load_checkpoint(notes, str(folder / "fastpitch" / "best_model.pth"), eval=True)

    vocoder_notes = load_config(str(folder / "hifigan" / "config.json"))
    if vocoder_notes.audio["sample_rate"] != speech.ap.sample_rate:
        raise ValueError("The two halves of this model do not speak at the same rate")
    vocoder = setup_vocoder(vocoder_notes)
    vocoder.load_checkpoint(vocoder_notes, str(folder / "hifigan" / "best_model.pth"), eval=True)
    return Loaded(speech, vocoder, AudioProcessor(**vocoder_notes.audio))


class IndicSynth:
    """Indic-TTS on this machine's processor. A model per language, loaded when first asked for."""

    def __init__(self) -> None:
        # One sentence at a time: the processor is the limit, and two at once only take longer.
        self._lock = threading.Lock()
        self._models: dict[str, object] = {}

    def _model(self, language: str):
        if language not in self._models:
            folder = model_folder(language)
            missing = [file for file in FILES if not (folder / file).exists()]
            if missing:
                raise FileNotFoundError(
                    f"No Indic-TTS model for '{language}' in {folder}. "
                    f"Fetch it first: python -m tts.indic_fetch {language}"
                )
            self._models[language] = _load(folder)
        return self._models[language]

    def ready(self, voice: Voice) -> bool:
        """Whether the voice's language is here: a model of 1.5 GB is fetched by hand, not by itself."""
        language = base_language(voice.language)
        return language in READERS and all((model_folder(language) / file).exists() for file in FILES)

    def sample_rate(self, voice: Voice) -> int:
        return self._model(base_language(voice.language)).speech.ap.sample_rate

    def warm(self, voice: Voice) -> None:
        """Load the model and say a word, so that the first learner does not wait for either."""
        self.say("নমস্কার।", voice)

    def say(self, text: str, voice: Voice) -> list[Piece]:
        """The text, sentence by sentence, with how long the model gave every letter."""
        import torch

        language = base_language(voice.language)
        reader = READERS[language]
        said = []
        with self._lock, torch.no_grad():
            loaded = self._model(language)
            model = loaded.speech
            letters = model.tokenizer.characters
            for sentence in reader.sentences(reader.readable(text, set(letters.vocab))):
                made = model.synthesize(text=sentence, speaker=voice.speaker, use_griffin_lim=False)
                # The picture of the speech, from the scale one half draws it in to the other's.
                picture = made["outputs"]["model_outputs"][0].detach().cpu().numpy()
                picture = loaded.vocoder_audio.normalize(model.ap.denormalize(picture.T))
                samples = loaded.vocoder.inference(torch.tensor(picture).unsqueeze(0))
                # The lengths as the model itself rounds them (`ForwardTTS.format_durations`).
                lengths = (torch.exp(made["outputs"]["durations_log"]) - 1) * model.length_scale
                frames = tuple(int(length) for length in lengths.clamp(min=1).round().flatten())
                given = tuple(letters.id_to_char(index) for index in made["text_inputs"][0].tolist())
                lined_up = len(frames) == len(given) and sum(frames) == picture.shape[1]
                rate, frame_seconds = model.ap.sample_rate, model.ap.hop_length / model.ap.sample_rate
                samples = samples.cpu().numpy().squeeze()
                start, end = spoken_part(samples, rate)
                # The vocoder repeats the picture's first and last frames a few times over, so its
                # sound is that much longer than the picture, and the speech begins half of that
                # into it. Measured, not asked of the vocoder: where it keeps the number differs.
                padded = (len(samples) / rate - picture.shape[1] * frame_seconds) / 2
                said.append(
                    Piece(
                        letters=given,
                        frames=frames if lined_up else None,
                        frame_seconds=frame_seconds,
                        begins=padded - start / rate,
                        seconds=(end - start) / rate,
                        samples=samples[start:end],
                    )
                )
        if not said:
            raise ValueError("Nothing to say in this text")
        return said

    def synthesize(self, text: str, voice: Voice) -> Spoken:
        import numpy as np

        said = self.say(text, voice)
        speech = np.concatenate([piece.samples for piece in said])
        mouth = mouth_of_letters(
            (piece.letters, piece.frames, piece.frame_seconds, piece.begins, piece.seconds) for piece in said
        )
        return Spoken(mp3=to_mp3(speech, self.sample_rate(voice)), mouth=mouth)
