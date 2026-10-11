"""Which part of a word was said strongest.

A strong syllable is longer, louder and higher than the ones beside it. Each is measured and
compared with the speaker's *own* other syllables, never with a target voice: a man, a woman and
a child differ far more from each other than a stressed syllable does from an unstressed one.

The weights and margins below are untuned guesses. `evaluate.py` is how they get set.
"""

from __future__ import annotations

from dataclasses import dataclass

# How much each cue counts towards "strong".
WEIGHTS = {"length": 0.4, "loudness": 0.35, "pitch": 0.25}
# The strongest syllable must beat the next by this share of its score to be called with full
# confidence; below that the confidence falls away to nothing.
SURE_MARGIN = 0.25
# A syllable lasts for as long as the sound stays within this many dB of its own peak.
LOUD_WITHIN_DB = 10.0
PRAAT_STEP = 0.01


@dataclass(frozen=True)
class Syllable:
    seconds: float
    loudness_db: float
    # `None` where no pitch could be found (a whispered or very short syllable).
    pitch_hz: float | None


@dataclass(frozen=True)
class StressReading:
    # Counted from 1, like the lesson's content.
    strongest: int
    confidence: float
    scores: list[float]


def prominence(syllables: list[Syllable]) -> list[float]:
    """How strong each syllable is, 0 to 1, against the strongest of each cue in this word."""
    longest = max(syllable.seconds for syllable in syllables) or 1.0
    loudest = max(syllable.loudness_db for syllable in syllables)
    pitches = [syllable.pitch_hz for syllable in syllables if syllable.pitch_hz]
    highest = max(pitches) if pitches else None

    scores = []
    for syllable in syllables:
        cues = {
            "length": syllable.seconds / longest,
            # Decibels back to a ratio of amplitudes, so 6 dB quieter counts as half.
            "loudness": 10 ** ((syllable.loudness_db - loudest) / 20),
        }
        # Pitch counts only when every syllable has one; else it would favour whichever does.
        if highest and len(pitches) == len(syllables):
            cues["pitch"] = (syllable.pitch_hz or 0.0) / highest
        weight = sum(WEIGHTS[cue] for cue in cues)
        scores.append(sum(WEIGHTS[cue] * value for cue, value in cues.items()) / weight)
    return scores


def read_stress(syllables: list[Syllable]) -> StressReading | None:
    """The strongest syllable and how clearly it stands out; `None` for a word of one part."""
    if len(syllables) < 2:
        return None
    scores = prominence(syllables)
    ranked = sorted(scores, reverse=True)
    margin = (ranked[0] - ranked[1]) / ranked[0] if ranked[0] > 0 else 0.0
    return StressReading(
        strongest=scores.index(ranked[0]) + 1,
        confidence=min(1.0, margin / SURE_MARGIN),
        scores=scores,
    )


def measure(waveform, rate: int, spans: list[tuple[float, float]]) -> list[Syllable] | None:
    """Length, loudness and pitch of each syllable's stretch of a recording, with Praat.

    `None` when the recording is too short for Praat to measure.
    """
    import numpy as np
    import parselmouth

    sound = parselmouth.Sound(np.asarray(waveform, dtype=np.float64), sampling_frequency=rate)
    try:
        intensity = sound.to_intensity(time_step=PRAAT_STEP)
        pitch = sound.to_pitch(time_step=PRAAT_STEP)
    except parselmouth.PraatError:
        return None

    loud_times, loud = intensity.xs(), intensity.values[0]
    pitch_times, hertz = pitch.xs(), pitch.selected_array["frequency"]

    syllables = []
    for start, end in spans:
        inside = loud[(loud_times >= start) & (loud_times < end)]
        if inside.size == 0:
            return None
        peak = float(inside.max())
        voiced = hertz[(pitch_times >= start) & (pitch_times < end)]
        voiced = voiced[voiced > 0]
        syllables.append(
            Syllable(
                seconds=float((inside >= peak - LOUD_WITHIN_DB).sum()) * PRAAT_STEP,
                loudness_db=peak,
                pitch_hz=float(np.median(voiced)) if voiced.size else None,
            )
        )
    return syllables
