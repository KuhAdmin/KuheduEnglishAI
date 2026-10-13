"""What was said, in words: the one place that touches Whisper.

A learner's reply in a conversation is not something to hold against a text (`sounds.py` does
that for a word they were given): what they said has to be written down first, and only then can
anything be said about it. Whisper writes it (OpenAI's, MIT licence; the English-only models).

**What it writes is a guess, and a tidy one.** Whisper was taught to write what a speaker meant,
so it may write "I am fine" for a learner's "I fine", and it writes a likely phrase ("Thank
you.") for a recording with nobody speaking in it. The first cannot be seen from here. The
second is what the two checks below are for; both are untuned guesses, like every number in this
package, until there are learners' recordings to set them by.
"""

from __future__ import annotations

import math
import os
import threading
from dataclasses import dataclass
from pathlib import Path

RATE = 16_000
# Which Whisper writes the words. `base.en` holds about 0.3 GB and is the smallest that is not
# plainly worse on an accent; `small.en` hears better and holds about 1 GB (see README.md).
MODEL = os.environ.get("WORDS_MODEL", "openai/whisper-base.en")
# A reply in a conversation is a sentence or two. Whisper itself takes half a minute at most.
MAX_SECONDS = 30
MAX_WORDS_WRITTEN = 64

# Quieter than this throughout, and nobody spoke: nothing is given to Whisper to make words of.
# As a share of full loudness, over the loudest tenth of a second.
QUIET = 0.01
# How likely Whisper found its own words, on average a word-piece (0 to 1). Under this it was
# guessing, and a guess is not told to a learner as what they said.
UNSURE = 0.4


@dataclass(frozen=True)
class Written:
    """What was heard as words. `text` is empty when nothing was, or nothing it was sure of."""

    text: str
    confidence: float

    def to_json(self) -> dict:
        return {"text": self.text, "confidence": round(self.confidence, 3)}


NOTHING = Written("", 0.0)


def loudest(waveform, rate: int = RATE) -> float:
    """How loud the loudest tenth of a second of a waveform is, from 0 to 1."""
    import numpy

    samples = numpy.asarray(waveform, dtype="float32")
    window = max(1, rate // 10)
    if len(samples) < window:
        return float(numpy.sqrt(numpy.mean(samples**2))) if len(samples) else 0.0
    whole = samples[: len(samples) // window * window].reshape(-1, window)
    return float(numpy.sqrt((whole**2).mean(axis=1)).max())


def settled(text: str, likelihoods: list[float]) -> Written:
    """Whisper's words, or nothing where it was only guessing at them."""
    text = " ".join(text.split())
    if not text or not likelihoods:
        return NOTHING
    # The mean of the logarithms: one word-piece it doubted counts, as it should.
    confidence = math.exp(sum(math.log(max(each, 1e-9)) for each in likelihoods) / len(likelihoods))
    return Written(text, confidence) if confidence >= UNSURE else Written("", confidence)


class WhisperWriter:
    """Whisper on this machine's processor. Its model is loaded by `load`, or by the first reply."""

    def __init__(self, model: str = MODEL, lock: threading.Lock | None = None) -> None:
        self.model = model
        # One recording at a time, and not while a word is being judged: the processor is the limit.
        self._lock = lock or threading.Lock()
        self._loaded = None

    def load(self) -> None:
        """Bring the model into memory (and, the first time on a machine, onto its disk)."""
        if self._loaded is not None:
            return
        # Kept beside the code, with the other models: the system drive may have no room.
        os.environ.setdefault("HF_HOME", str(Path(__file__).resolve().parents[1] / ".models"))
        # Imported here: it loads PyTorch, which the service's own tests do not need.
        from transformers import WhisperForConditionalGeneration, WhisperProcessor
        from transformers.utils import logging

        # It otherwise says the same two things about every recording it is given.
        logging.set_verbosity_error()

        def read(only_from_disk: bool):
            processor = WhisperProcessor.from_pretrained(self.model, local_files_only=only_from_disk)
            model = WhisperForConditionalGeneration.from_pretrained(
                self.model, local_files_only=only_from_disk
            )
            return processor, model.eval()

        try:
            # Once fetched it is read from the disk without asking the model hub, which on a
            # poor connection can keep a start waiting for minutes.
            self._loaded = read(only_from_disk=True)
        except OSError:
            self._loaded = read(only_from_disk=False)

    def write(self, waveform) -> Written:
        """The words said in a waveform (one channel, at `RATE`, up to `MAX_SECONDS`)."""
        if loudest(waveform) < QUIET:
            return NOTHING
        import torch

        with self._lock:
            self.load()
            processor, model = self._loaded
            given = processor(
                waveform, sampling_rate=RATE, return_tensors="pt", return_attention_mask=True
            )
            with torch.inference_mode():
                made = model.generate(
                    given.input_features,
                    attention_mask=given.attention_mask,
                    max_new_tokens=MAX_WORDS_WRITTEN,
                    do_sample=False,
                    num_beams=1,
                    return_dict_in_generate=True,
                    output_scores=True,
                )
                scores = model.compute_transition_scores(
                    made.sequences, made.scores, normalize_logits=True
                )
            text = processor.batch_decode(made.sequences, skip_special_tokens=True)[0]
            # The end-of-text mark is a piece too, and after it there is only padding.
            likelihoods = [math.exp(score) for score in scores[0].tolist() if math.isfinite(score)]
        return settled(text, likelihoods)
