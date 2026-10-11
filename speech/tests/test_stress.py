import math

import pytest

from assess.stress import SURE_MARGIN, Syllable, measure, prominence, read_stress


def test_a_longer_louder_higher_syllable_is_the_strong_one():
    reading = read_stress([Syllable(0.25, 70.0, 180.0), Syllable(0.10, 62.0, 140.0)])

    assert reading.strongest == 1
    assert reading.confidence == 1.0
    assert reading.scores[0] == 1.0


def test_the_same_word_from_a_low_voice_and_a_high_voice_reads_the_same():
    # A man and a child: an octave apart, and neither is compared with a target in Hz.
    low = read_stress([Syllable(0.12, 60.0, 95.0), Syllable(0.22, 66.0, 120.0)])
    high = read_stress([Syllable(0.12, 60.0, 190.0), Syllable(0.22, 66.0, 240.0)])

    assert low.strongest == high.strongest == 2
    assert low.scores == pytest.approx(high.scores)


def test_two_syllables_alike_are_not_called_with_any_confidence():
    reading = read_stress([Syllable(0.20, 65.0, 150.0), Syllable(0.20, 65.0, 150.0)])
    assert reading.confidence == 0.0

    nearly = read_stress([Syllable(0.20, 65.0, 150.0), Syllable(0.19, 64.5, 148.0)])
    assert 0.0 < nearly.confidence < 1.0
    margin = (nearly.scores[0] - nearly.scores[1]) / nearly.scores[0]
    assert nearly.confidence == pytest.approx(margin / SURE_MARGIN)


def test_pitch_is_left_out_when_one_syllable_has_none():
    # The second is longer and louder; the first is the only one with a pitch, and must not win by it.
    syllables = [Syllable(0.10, 60.0, 200.0), Syllable(0.20, 66.0, None)]

    assert read_stress(syllables).strongest == 2
    assert prominence(syllables)[1] == 1.0


def test_six_decibels_quieter_counts_as_half_as_loud():
    scores = prominence([Syllable(0.2, 66.0, None), Syllable(0.2, 60.0, None)])
    # Equal length (0.4 of the weight at full), half the loudness (0.35 at about half).
    assert scores[1] == pytest.approx((0.4 + 0.35 * 10 ** (-6 / 20)) / 0.75)


def test_a_word_of_one_part_has_no_stress_to_read():
    assert read_stress([Syllable(0.2, 65.0, 150.0)]) is None


def test_praat_measures_a_long_loud_high_tone_as_stronger_than_a_short_soft_low_one():
    np = pytest.importorskip("numpy")
    pytest.importorskip("parselmouth")
    rate = 16_000

    def tone(seconds, hertz, amplitude):
        times = np.arange(int(seconds * rate)) / rate
        # A few harmonics, so that Praat finds a pitch in it as it does in a voice.
        wave = sum(np.sin(2 * math.pi * hertz * n * times) / n for n in (1, 2, 3))
        return amplitude * wave / 2

    quiet = np.zeros(int(0.1 * rate))
    recording = np.concatenate([quiet, tone(0.30, 220, 0.5), quiet, tone(0.12, 160, 0.15), quiet])

    syllables = measure(recording, rate, [(0.05, 0.45), (0.45, 0.70)])

    assert syllables[0].seconds > syllables[1].seconds
    assert syllables[0].loudness_db > syllables[1].loudness_db + 6
    assert syllables[0].pitch_hz == pytest.approx(220, rel=0.05)
    assert syllables[1].pitch_hz == pytest.approx(160, rel=0.05)
    assert read_stress(syllables).strongest == 1


def test_a_recording_too_short_to_measure_gives_no_reading():
    np = pytest.importorskip("numpy")
    pytest.importorskip("parselmouth")

    assert measure(np.zeros(160), 16_000, [(0.0, 0.01)]) is None
