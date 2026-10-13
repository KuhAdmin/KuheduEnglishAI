import numpy as np
import pytest

from tts.indic import FILES, LEAD_SECONDS, TAIL_SECONDS, IndicSynth, model_folder, spoken_part
from tts.voices import find_voice

RATE = 22050


def sound(*parts: tuple[float, float]) -> np.ndarray:
    """A sound made of stretches: (seconds, how loud)."""
    return np.concatenate([np.full(round(seconds * RATE), loud) for seconds, loud in parts])


def test_the_quiet_a_sentence_opens_and_closes_with_is_cut_to_a_breath_and_a_pause():
    start, end = spoken_part(sound((1.0, 0.001), (0.9, 0.3), (0.8, 0.001)), RATE)

    assert start / RATE == pytest.approx(1.0 - LEAD_SECONDS, abs=0.011)
    assert end / RATE == pytest.approx(1.9 + TAIL_SECONDS, abs=0.011)


def test_a_word_that_opens_softly_keeps_its_opening():
    # A hiss a tenth as loud as the vowel after it is still the word.
    start, _ = spoken_part(sound((0.5, 0.001), (0.1, 0.03), (0.6, 0.3), (0.5, 0.001)), RATE)

    assert start / RATE == pytest.approx(0.5 - LEAD_SECONDS, abs=0.011)


def test_a_pause_inside_a_sentence_is_left_as_it_is():
    samples = sound((0.4, 0.001), (0.5, 0.3), (0.6, 0.001), (0.5, 0.3), (0.4, 0.001))
    start, end = spoken_part(samples, RATE)

    assert (end - start) / RATE == pytest.approx(LEAD_SECONDS + 1.6 + TAIL_SECONDS, abs=0.011)


def test_nothing_is_cut_from_a_sound_with_little_quiet_or_with_nothing_in_it():
    samples = sound((0.02, 0.001), (0.5, 0.3), (0.1, 0.001))
    assert spoken_part(samples, RATE) == (0, len(samples))

    silence = np.zeros(RATE)
    assert spoken_part(silence, RATE) == (0, len(silence))
    assert spoken_part(np.zeros(10), RATE) == (0, 10)


def test_a_language_is_ready_only_once_every_file_of_its_model_is_here(monkeypatch, tmp_path):
    monkeypatch.setattr("tts.indic.HOME", tmp_path)
    diya = find_voice("bn_diya")
    assert model_folder("bn") == tmp_path / "bn"
    assert not IndicSynth().ready(diya)

    for file in FILES[:-1]:
        (tmp_path / "bn" / file).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / "bn" / file).write_bytes(b"")
    assert not IndicSynth().ready(diya)

    (tmp_path / "bn" / FILES[-1]).write_bytes(b"")
    assert IndicSynth().ready(diya)
    # A language it has no reader for is not its to say, whatever is in the folder.
    assert not IndicSynth().ready(find_voice("hf_alpha"))


def test_a_language_whose_model_was_never_fetched_says_how_to_fetch_it(monkeypatch, tmp_path):
    monkeypatch.setattr("tts.indic.HOME", tmp_path)

    with pytest.raises(FileNotFoundError, match="python -m tts.indic_fetch bn"):
        IndicSynth().say("নমস্কার।", find_voice("bn_diya"))
