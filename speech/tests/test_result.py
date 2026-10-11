from assess.result import (
    EXTRA_SYLLABLE,
    MISSING_SYLLABLE,
    MISSING_UNSURE,
    NOTHING_HEARD,
    OK,
    SOUND_DIFFERS,
    STRESS_MOVED,
    Difference,
    Heard,
    Sound,
    judge,
)
from assess.stress import StressReading

WEDNESDAY = ["w", "ɛ", "n", "z", "d", "eɪ"]


def heard(phones, expected=WEDNESDAY, differences=(), confidences=None):
    confidences = confidences or [0.9] * len(phones)
    sounds = [Sound(phone, sure, at * 0.1, at * 0.1 + 0.05) for at, (phone, sure) in enumerate(zip(phones, confidences))]
    return Heard(sounds, expected, list(differences))


def codes(assessment):
    return [finding.code for finding in assessment.findings]


def test_a_word_said_as_expected_is_ok():
    assessment = judge("Wednesday", heard(WEDNESDAY), parts=2, stress=1)

    assert codes(assessment) == [OK]
    assert assessment.codes(0.5) == set()
    assert (assessment.syllables_heard, assessment.syllables_expected) == (2, 2)


def test_silence_is_nothing_heard_and_not_a_mistake_in_the_word():
    assessment = judge("Wednesday", heard([]), parts=2, stress=1)

    assert codes(assessment) == [NOTHING_HEARD]
    assert assessment.codes(0.0) == set()


def test_wed_nes_day_is_an_extra_syllable_as_sure_as_its_least_sure_vowel():
    said = ["w", "ɛ", "d", "n", "ɛ", "s", "d", "eɪ"]
    sure = [0.9, 0.9, 0.9, 0.9, 0.6, 0.9, 0.9, 0.8]
    # The comparison hangs the extra vowel on the "n" before it; that is the same finding.
    differences = [Difference("n", "nɛ", 1.0), Difference("z", "s", 0.5)]

    assessment = judge("Wednesday", heard(said, differences=differences, confidences=sure), parts=2)

    extra = assessment.findings[0]
    assert (extra.code, extra.confidence) == (EXTRA_SYLLABLE, 0.6)
    assert extra.detail == {"expected": 2, "heard": 3}
    assert codes(assessment) == [EXTRA_SYLLABLE, SOUND_DIFFERS]
    assert assessment.findings[1].detail == {"expected": "z", "heard": "s"}


def test_a_syllable_too_few_is_as_sure_as_the_comparison_is_that_its_vowel_was_not_heard():
    differences = [Difference("ɛ", "", 0.8)]
    assessment = judge("Wednesday", heard(["w", "n", "z", "d", "eɪ"], differences=differences), parts=2)

    assert codes(assessment) == [MISSING_SYLLABLE]
    assert assessment.findings[0].confidence == 0.8

    unexplained = judge("Wednesday", heard(["w", "n", "z", "d", "eɪ"]), parts=2)
    assert unexplained.findings[0].confidence == MISSING_UNSURE


def test_the_parts_are_counted_from_the_expected_sounds_when_the_lesson_does_not_say():
    assessment = judge("Wednesday", heard(["w", "ɛ", "d", "n", "ɛ", "s", "d", "eɪ"]))

    assert assessment.syllables_expected == 2
    assert codes(assessment) == [EXTRA_SYLLABLE]


def test_stress_on_another_part_is_reported_with_the_readings_own_confidence():
    reading = StressReading(strongest=2, confidence=0.7, scores=[0.6, 1.0])
    moved = judge("Wednesday", heard(WEDNESDAY), parts=2, stress=1, reading=reading)

    assert codes(moved) == [STRESS_MOVED]
    assert moved.findings[0].confidence == 0.7
    assert moved.findings[0].detail == {"expected": 1, "heard": 2}
    # Sure enough at one threshold, not at another: the app decides what to show.
    assert moved.codes(0.5) == {STRESS_MOVED}
    assert moved.codes(0.8) == set()

    assert codes(judge("Wednesday", heard(WEDNESDAY), parts=2, stress=2, reading=reading)) == [OK]


def test_stress_is_not_judged_when_the_parts_do_not_match_one_for_one():
    reading = StressReading(strongest=3, confidence=1.0, scores=[0.5, 0.6, 1.0])
    said = ["w", "ɛ", "d", "n", "ɛ", "s", "d", "eɪ"]

    assert codes(judge("Wednesday", heard(said), parts=2, stress=1, reading=reading)) == [EXTRA_SYLLABLE]


def test_an_indian_accent_is_not_a_mistake_but_another_sound_is():
    differences = [Difference("w", "v", 0.5), Difference("z", "dʒ", 0.9), Difference("d", "d", 0.0)]
    assessment = judge("Wednesday", heard(["v", "ɛ", "n", "dʒ", "d", "eɪ"], differences=differences), parts=2)

    assert codes(assessment) == [SOUND_DIFFERS]
    assert assessment.findings[0].detail == {"expected": "z", "heard": "dʒ"}


def test_the_report_for_the_app_is_codes_and_numbers_with_no_sentences():
    reading = StressReading(strongest=2, confidence=0.71234, scores=[0.61234, 1.0])
    report = judge("Wednesday", heard(WEDNESDAY), parts=2, stress=1, reading=reading).to_json()

    assert report == {
        "word": "Wednesday",
        "findings": [{"code": "stressMoved", "confidence": 0.712, "expected": 1, "heard": 2}],
        "heardSounds": WEDNESDAY,
        "expectedSounds": WEDNESDAY,
        "syllablesHeard": 2,
        "syllablesExpected": 2,
        "stress": {"strongest": 2, "confidence": 0.712, "scores": [0.612, 1.0]},
    }
