"""Text to sound: the one place that touches Kokoro, and the way in to whatever says a voice."""

from __future__ import annotations

import io
import os
import threading
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from .mouth import mouth_of
from .voices import MODELS, Voice

# Kokoro's own rate.
SAMPLE_RATE = 24_000
# What the service calls itself. Each voice names the model that says it (`Voice.model`).
MODEL_VERSION = MODELS["kokoro"]
# Where the model and its voices are fetched from, the first time each is used.
REPO_ID = "hexgrad/Kokoro-82M"

# The model is kept beside the code unless told otherwise: on a developer's machine the system
# drive may have no room for it. Set before Kokoro is imported, which reads it.
os.environ.setdefault("HF_HOME", str(Path(__file__).resolve().parents[1] / ".models"))


@dataclass(frozen=True)
class Spoken:
    """A text said aloud."""

    mp3: bytes
    # The shape of the lips through it (see `mouth.py`); `None` where that is not known.
    mouth: str | None = None


class Synth(Protocol):
    """Anything that can say a text in a voice."""

    def synthesize(self, text: str, voice: Voice) -> Spoken: ...


class Engine(Synth, Protocol):
    """One model, and the voices it says."""

    def ready(self, voice: Voice) -> bool:
        """Whether what it needs to say this voice is on this machine."""
        ...

    def warm(self, voice: Voice) -> None: ...


class Speakers:
    """Every voice behind one way in: a text goes to whichever model says its voice."""

    def __init__(self, engines: Mapping[str, Engine]) -> None:
        self._engines = engines
        # One sentence at a time, whichever model: the processor is the limit, and two at once
        # only take longer.
        self._lock = threading.Lock()

    def ready(self, voices: Iterable[Voice]) -> tuple[Voice, ...]:
        """Those of the voices that can be said here: a voice whose model was never fetched is not offered."""
        return tuple(voice for voice in voices if self._engines[voice.engine].ready(voice))

    def warm(self, voices: Iterable[Voice]) -> None:
        """Load every model and say a word with it, so that no first learner waits for either."""
        warmed: set[str] = set()
        for voice in voices:
            if voice.engine not in warmed:
                warmed.add(voice.engine)
                with self._lock:
                    self._engines[voice.engine].warm(voice)

    def synthesize(self, text: str, voice: Voice) -> Spoken:
        with self._lock:
            return self._engines[voice.engine].synthesize(text, voice)


def to_mp3(samples, rate: int = SAMPLE_RATE) -> bytes:
    """A mono waveform as MP3: small enough for a phone on 4G, played everywhere."""
    import soundfile

    buffer = io.BytesIO()
    soundfile.write(buffer, samples, rate, format="MP3")
    return buffer.getvalue()


def voice_file(speaker: str) -> str:
    """Where one of Kokoro's voices is on this machine, fetched the first time it is wanted.

    Left to itself Kokoro asks the hub about a voice again each time the service starts, even
    with the file at hand, and a slow answer (a minute and a half, measured) keeps the first
    sentence in that voice waiting for longer than the server waits for it.
    """
    from huggingface_hub import hf_hub_download
    from huggingface_hub.errors import LocalEntryNotFoundError

    name = f"voices/{speaker}.pt"
    try:
        return hf_hub_download(repo_id=REPO_ID, filename=name, local_files_only=True)
    except LocalEntryNotFoundError:
        return hf_hub_download(repo_id=REPO_ID, filename=name)


class KokoroSynth:
    """Kokoro on this machine's processor. One model, a pipeline per language, loaded when first asked for."""

    def __init__(self) -> None:
        # One sentence at a time: the processor is the limit, and two at once only take longer.
        self._lock = threading.Lock()
        self._model = None
        self._pipelines: dict[str, object] = {}

    def _pipeline(self, lang_code: str):
        # Imported here: it loads PyTorch, which the catalogue and the tests do not need.
        from kokoro import KModel, KPipeline

        if self._model is None:
            self._model = KModel(repo_id=REPO_ID).to("cpu").eval()
        if lang_code not in self._pipelines:
            self._pipelines[lang_code] = KPipeline(
                lang_code=lang_code, repo_id=REPO_ID, model=self._model
            )
        return self._pipelines[lang_code]

    def ready(self, voice: Voice) -> bool:
        # Its model and voices are fetched by themselves, the first time each is wanted.
        return True

    def warm(self, voice: Voice) -> None:
        """Load the model and say a word, so that the first learner does not wait for either.

        Loading takes the better part of a minute on a small machine; a sentence afterwards takes
        about as long as it lasts.
        """
        self.synthesize("Hello.", voice)

    def synthesize(self, text: str, voice: Voice) -> Spoken:
        import numpy as np

        pieces = []
        timed = []
        with self._lock:
            pipeline = self._pipeline(voice.lang_code)
            results = pipeline(text, voice=voice_file(voice.speaker), speed=1.0)
            known = self._model.vocab
            # A long text comes back in pieces; they are one sound to the caller.
            for result in results:
                if result.audio is None:
                    continue
                speech = result.audio.detach().cpu().numpy()
                pieces.append(speech)
                # The model passes over a sound it does not know, so it has no length either.
                sounds = "".join(sound for sound in result.phonemes if sound in known)
                frames = None if result.pred_dur is None else result.pred_dur.reshape(-1).tolist()
                timed.append((sounds, frames, len(speech) / SAMPLE_RATE))
        if not pieces:
            raise ValueError("Nothing to say in this text")
        return Spoken(mp3=to_mp3(np.concatenate(pieces)), mouth=mouth_of(timed))
