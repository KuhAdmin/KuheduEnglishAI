"""What was said, sound by sound: the one place that touches OpenPronounce.

Only its sound recogniser is used (one model, about 1.2 GB). Its overall score is not: that needs
a second model and a synthetic reference voice, and a score out of 100 is not what a learner is
shown. Nothing here sends anything anywhere once the model has been downloaded.
"""

from __future__ import annotations

from pathlib import Path

from .result import Difference, Heard, Sound

RATE = 16_000


def hear(recording: Path, text: str, lang: str = "en"):
    """The recording as a waveform, and the sounds heard in it against those `text` expects."""
    # Imported here: it loads PyTorch, which the rest of this package and its tests do not need.
    from openpronounce import compare_phones, load_audio, recognize_phones

    waveform = load_audio(str(recording))
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
        return waveform, Heard(sounds)

    differences = [
        Difference(phone["expected"], phone["heard"], phone["confidence"])
        for error in comparison["errors"]
        for phone in error["phones"]
        if phone["confidence"] > 0
    ]
    return waveform, Heard(sounds, [phone for group in groups for phone in group], differences)
