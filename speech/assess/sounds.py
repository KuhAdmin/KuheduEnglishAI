"""What was said, sound by sound: the one place that touches OpenPronounce.

Only its sound recogniser is used (one model, about 1.2 GB). Its overall score is not: that needs
a second model and a synthetic reference voice, and a score out of 100 is not what a learner is
shown. Nothing here sends anything anywhere once the model has been downloaded.
"""

from __future__ import annotations

import os
from pathlib import Path

from .result import Difference, Heard, Sound

RATE = 16_000

# OpenPronounce reports a word when its wrong sounds add up to two, "whatever the length of the
# word". But no wrong sound is ever counted as quite a whole one (each is scaled by how unlikely
# the right sound was), so two sounds that are plainly wrong come to 1.99, and a word of five
# sounds or more with two of them wrong was passed as right: "evening" was not told from
# "morning" (measured 2026-10-13). This is two sounds, each at least nine parts in ten sure.
# Two near misses (a sound for one close to it counts half) still come to one, and are let by.
TWO_WRONG_SOUNDS = 1.8


def _prepare() -> None:
    """What OpenPronounce reads from the environment, said before it is imported."""
    # The model is kept beside the code, with the voices': the system drive may have no room.
    os.environ.setdefault("HF_HOME", str(Path(__file__).resolve().parents[1] / ".models"))
    try:
        import espeakng_loader
    except ImportError:
        # espeak-ng is then looked for on the system, as OpenPronounce expects.
        return
    # Its own copy of espeak-ng, as the voices have: nothing to install on the system.
    os.environ.setdefault("PHONEMIZER_ESPEAK_LIBRARY", espeakng_loader.get_library_path())
    os.environ.setdefault("ESPEAK_DATA_PATH", espeakng_loader.get_data_path())


def hear(recording: Path, text: str, lang: str = "en"):
    """The recording as a waveform, and the sounds heard in it against those `text` expects."""
    _prepare()
    # Imported here: it loads PyTorch, which the rest of this package and its tests do not need.
    from openpronounce import load_audio

    waveform = load_audio(str(recording))
    return waveform, listen(waveform, text, lang)


def listen(waveform, text: str, lang: str = "en") -> Heard:
    """The sounds heard in a waveform (one channel, at `RATE`) against those `text` expects."""
    _prepare()
    from openpronounce import compare_phones, recognize_phones
    from openpronounce import phones as library

    library.PHONE_ERROR_MIN_EDITS = TWO_WRONG_SOUNDS
    recognition = recognize_phones(waveform, lang=lang)
    frames = max(1, len(recognition.log_posteriors))
    frame_seconds = len(waveform) / RATE / frames

    sounds = [
        Sound(phone, confidence, start * frame_seconds, end * frame_seconds)
        for phone, confidence, (start, end) in zip(
            recognition.phones, recognition.confidences, recognition.spans
        )
    ]

    # Without espeak-ng the expected sounds come back empty, and there is nothing to compare.
    comparison = compare_phones(recognition, text, lang)
    groups = comparison["expected_phones"]
    if not any(groups):
        return Heard(sounds)

    differences = [
        Difference(phone["expected"], phone["heard"], phone["confidence"], str(error.get("word", "")))
        for error in comparison["errors"]
        for phone in error["phones"]
        if phone["confidence"] > 0
    ]
    return Heard(sounds, [phone for group in groups for phone in group], differences)
