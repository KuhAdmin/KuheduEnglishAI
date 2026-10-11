"""What the scorer says about one attempt at a word.

It answers in codes, never in sentences: the app turns a code into a stored text in the learner's
language, so nothing a model wrote is ever shown. Every finding carries how sure the scorer is,
and the app shows only what is sure enough (see README: the bar).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .stress import StressReading
from .syllables import is_nucleus
from .variants import accepted

OK = "ok"
NOTHING_HEARD = "nothingHeard"
EXTRA_SYLLABLE = "extraSyllable"
MISSING_SYLLABLE = "missingSyllable"
STRESS_MOVED = "stressMoved"
SOUND_DIFFERS = "soundDiffers"

# The codes that say something was not as expected: the ones an evaluation counts.
CORRECTIONS = (EXTRA_SYLLABLE, MISSING_SYLLABLE, STRESS_MOVED, SOUND_DIFFERS)

# A syllable that is missing, when nothing says how sure that is. Untuned.
MISSING_UNSURE = 0.5


@dataclass(frozen=True)
class Sound:
    """One sound the recogniser heard, and when (seconds from the start of the recording)."""

    phone: str
    confidence: float
    start: float
    end: float


@dataclass(frozen=True)
class Difference:
    """An expected sound that was heard as something else (`heard` is empty when it was not heard)."""

    expected: str
    heard: str
    confidence: float


@dataclass(frozen=True)
class Heard:
    sounds: list[Sound]
    # `None` when the expected sounds could not be worked out (espeak-ng is not installed):
    # syllables and stress are still judged, sounds are not.
    expected: list[str] | None = None
    differences: list[Difference] = field(default_factory=list)


@dataclass(frozen=True)
class Finding:
    code: str
    confidence: float
    detail: dict = field(default_factory=dict)


@dataclass(frozen=True)
class Assessment:
    word: str
    findings: list[Finding]
    heard_sounds: list[str]
    expected_sounds: list[str] | None
    syllables_heard: int
    syllables_expected: int | None
    stress: StressReading | None

    def codes(self, min_confidence: float) -> set[str]:
        """The corrections sure enough to be shown; empty means nothing to correct."""
        return {
            finding.code
            for finding in self.findings
            if finding.code in CORRECTIONS and finding.confidence >= min_confidence
        }

    def to_json(self) -> dict:
        return {
            "word": self.word,
            "findings": [
                {"code": f.code, "confidence": round(f.confidence, 3), **f.detail}
                for f in self.findings
            ],
            "heardSounds": self.heard_sounds,
            "expectedSounds": self.expected_sounds,
            "syllablesHeard": self.syllables_heard,
            "syllablesExpected": self.syllables_expected,
            "stress": None
            if self.stress is None
            else {
                "strongest": self.stress.strongest,
                "confidence": round(self.stress.confidence, 3),
                "scores": [round(score, 3) for score in self.stress.scores],
            },
        }


def judge(
    word: str,
    heard: Heard,
    parts: int | None = None,
    stress: int | None = None,
    reading: StressReading | None = None,
) -> Assessment:
    """Turn what was heard into findings.

    `parts` is how many parts the word is said in and `stress` which one is strong (from 1), as
    the lesson's content has them; without `parts` the expected sounds are counted instead.
    `reading` is the stress that was measured, when it could be.
    """
    nuclei = [sound for sound in heard.sounds if is_nucleus(sound.phone)]
    expected_count = parts
    if expected_count is None and heard.expected is not None:
        expected_count = sum(1 for phone in heard.expected if is_nucleus(phone))

    def assessment(findings: list[Finding]) -> Assessment:
        return Assessment(
            word=word,
            findings=findings or [Finding(OK, 1.0)],
            heard_sounds=[sound.phone for sound in heard.sounds],
            expected_sounds=heard.expected,
            syllables_heard=len(nuclei),
            syllables_expected=expected_count,
            stress=reading,
        )

    if not heard.sounds:
        return assessment([Finding(NOTHING_HEARD, 1.0)])

    findings: list[Finding] = []
    counts = {"expected": expected_count, "heard": len(nuclei)}
    surplus = 0 if expected_count is None else len(nuclei) - expected_count

    if surplus > 0:
        # Which syllables are the extra ones is not known; the least sure are the likeliest, and
        # taking them keeps the scorer from being surer than it should be.
        least_sure = sorted(sound.confidence for sound in nuclei)[:surplus]
        findings.append(Finding(EXTRA_SYLLABLE, sum(least_sure) / surplus, counts))
    elif surplus < 0:
        unheard = sorted(
            (d.confidence for d in heard.differences if not d.heard and is_nucleus(d.expected)),
            reverse=True,
        )[:-surplus]
        sure = sum(unheard) / len(unheard) if unheard else MISSING_UNSURE
        findings.append(Finding(MISSING_SYLLABLE, sure, counts))

    # Stress is only compared part for part: with a part too many or too few, which is which?
    if reading is not None and stress is not None and surplus == 0 and reading.strongest != stress:
        findings.append(
            Finding(STRESS_MOVED, reading.confidence, {"expected": stress, "heard": reading.strongest})
        )

    for difference in heard.differences:
        if difference.confidence <= 0 or accepted(difference.expected, difference.heard):
            continue
        # Already said, as a syllable: a vowel that was not heard, or an extra one that the
        # comparison hangs on the sound before it ("n" heard as "nɛ").
        if surplus < 0 and not difference.heard and is_nucleus(difference.expected):
            continue
        if surplus > 0 and difference.heard.startswith(difference.expected):
            continue
        findings.append(
            Finding(
                SOUND_DIFFERS,
                difference.confidence,
                {"expected": difference.expected, "heard": difference.heard},
            )
        )

    return assessment(findings)
