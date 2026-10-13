"""One recording of one word, from file (or waveform) to findings."""

from __future__ import annotations

from pathlib import Path

from .result import Assessment, Heard, judge
from .sounds import RATE, hear, listen
from .stress import measure, read_stress
from .syllables import is_nucleus, regions


def assess_attempt(
    recording: Path,
    word: str,
    parts: int | None = None,
    stress: int | None = None,
    lang: str = "en",
) -> Assessment:
    """Assess a recording of `word`, said in `parts` parts with part number `stress` strong."""
    waveform, heard = hear(recording, word, lang)
    return _judged(waveform, heard, word, parts, stress)


def assess_waveform(
    waveform,
    word: str,
    parts: int | None = None,
    stress: int | None = None,
    lang: str = "en",
) -> Assessment:
    """The same for a recording already in memory (one channel, at `RATE`): nothing is written down."""
    return _judged(waveform, listen(waveform, word, lang), word, parts, stress)


def _judged(waveform, heard: Heard, word: str, parts: int | None, stress: int | None) -> Assessment:
    reading = None
    nuclei = [sound for sound in heard.sounds if is_nucleus(sound.phone)]
    # Stress is measured only when the parts heard are the parts expected, one for one.
    if stress is not None and parts is not None and len(nuclei) == parts >= 2:
        centres = [(sound.start + sound.end) / 2 for sound in nuclei]
        spans = regions(centres, heard.sounds[0].start, heard.sounds[-1].end)
        syllables = measure(waveform, RATE, spans)
        reading = read_stress(syllables) if syllables else None

    return judge(word, heard, parts, stress, reading)
