import pytest

from assess.metrics import Counts, tally
from assess.syllables import count_parts, is_nucleus, regions
from assess.variants import accepted


@pytest.mark.parametrize("phone", ["ɛ", "eɪ", "ə", "ɚ", "ɑɹ", "aɪ", "əl", "n̩"])
def test_a_vowel_or_a_syllabic_consonant_is_the_middle_of_a_syllable(phone):
    assert is_nucleus(phone)


@pytest.mark.parametrize("phone", ["w", "n", "z", "d", "θ", "ʃ", "dʒ", "ŋ", "ɹ", "j"])
def test_a_consonant_is_not(phone):
    assert not is_nucleus(phone)


def test_parts_are_counted_as_the_lesson_editor_writes_them():
    assert count_parts("We(d)n(e)s-day") == 2
    assert count_parts("nic(e)-to-meet-you") == 4
    assert count_parts("nam(e)") == 1
    # A hyphen typed with nothing after it yet.
    assert count_parts("hel-") == 1


def test_a_syllable_reaches_half_way_to_its_neighbours_and_to_the_edges_of_what_was_said():
    assert regions([0.2, 0.6, 0.8], 0.1, 1.0) == pytest.approx([(0.1, 0.4), (0.4, 0.7), (0.7, 1.0)])
    assert regions([0.3], 0.1, 0.5) == [(0.1, 0.5)]


@pytest.mark.parametrize(
    ("expected", "heard"),
    [("w", "v"), ("v", "w"), ("t", "ʈ"), ("θ", "t̪"), ("ð", "d"), ("ɹ", "r"), ("eɪ", "e"), ("z", "z")],
)
def test_sounds_of_an_indian_accent_are_accepted(expected, heard):
    assert accepted(expected, heard)


@pytest.mark.parametrize(("expected", "heard"), [("z", "dʒ"), ("z", "s"), ("ɛ", "i"), ("n", ""), ("d", "t")])
def test_other_sounds_and_sounds_left_out_are_not(expected, heard):
    assert not accepted(expected, heard)


def test_right_wrong_and_missed_are_counted_per_correction():
    counts = tally(
        [
            ({"extraSyllable"}, {"extraSyllable"}),
            ({"extraSyllable"}, set()),
            (set(), {"extraSyllable", "stressMoved"}),
            ({"stressMoved", "soundDiffers"}, {"stressMoved"}),
            (set(), set()),
        ]
    )

    assert counts["extraSyllable"] == Counts(right=1, wrong=1, missed=1)
    assert counts["stressMoved"] == Counts(right=1, wrong=1, missed=0)
    assert counts["soundDiffers"] == Counts(right=0, wrong=0, missed=1)
    assert counts["missingSyllable"] == Counts()


def test_precision_is_of_what_it_said_and_recall_of_what_was_there():
    counts = Counts(right=8, wrong=2, missed=8)

    assert counts.precision == 0.8
    assert counts.recall == 0.5
    # Never spoke, nothing there: there is no rate to give, and none is made up.
    assert Counts().precision is None
    assert Counts().recall is None
