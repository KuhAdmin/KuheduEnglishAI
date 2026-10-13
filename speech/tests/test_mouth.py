import re

from tts.mouth import mouth_of


def marks(text: str) -> list[tuple[int, str]]:
    return [(int(at), shape) for at, shape in re.findall(r"(\d+)([cmowr])", text)]


def test_each_sound_gets_its_shape_from_the_moment_it_is_said():
    # "map": silence, m, a, p, silence. Four frames are a tenth of a second.
    assert mouth_of([("mæp", [4, 2, 6, 2, 4], 0.45)]) == "0c150o300c"
    # Lips together for m, b and p; round for o, u and w; wide for i; open for the other vowels,
    # the short one of "the" included; every other consonant shows the teeth.
    assert mouth_of([("wisənu", [1, 1, 1, 1, 1, 1, 1, 1], 0.2)]) == "0c25r50w75m100o125m150r175c"


def test_the_same_shape_twice_running_is_one_mark():
    assert marks(mouth_of([("ana", [2, 2, 2, 2, 2], 0.25)])) == [(0, "c"), (50, "o"), (100, "m"), (150, "o"), (200, "c")]
    assert marks(mouth_of([("tsn", [2, 2, 2, 2, 2], 0.25)])) == [(0, "c"), (50, "m"), (200, "c")]


def test_the_jaw_opens_on_every_vowel_and_comes_up_for_the_consonants_between():
    # "together", as Kokoro writes it. A mouth that held one shape through it looked stuck.
    said = mouth_of([("təɡˈɛðəɹ", [2] * 10, 0.5)])

    assert [shape for _, shape in marks(said)] == ["c", "m", "o", "m", "o", "m", "o", "m", "c"]


def test_a_mark_that_is_part_of_another_sound_has_no_shape_of_its_own():
    # A stress mark belongs to the sound after it; length and a puff of air to the one before.
    assert marks(mouth_of([("ˈaːm", [2, 1, 2, 2, 2, 2], 0.275)])) == [(0, "c"), (50, "o"), (175, "c")]
    assert marks(mouth_of([("kʰˈo", [2, 2, 1, 1, 2, 2], 0.25)])) == [(0, "c"), (50, "m"), (125, "r"), (200, "c")]
    # Kokoro's capital letters are diphthongs: "I" is the vowel of "my".
    assert marks(mouth_of([("mI", [1, 2, 4, 1], 0.2)])) == [(0, "c"), (75, "o"), (175, "c")]


def test_the_lips_come_together_for_a_pause_but_not_between_every_two_words():
    # A short gap keeps the shape before it; a long one, and any punctuation, is a pause.
    assert marks(mouth_of([("a i", [1, 2, 1, 2, 1], 0.175)])) == [(0, "c"), (25, "o"), (100, "w"), (150, "c")]
    assert marks(mouth_of([("a i", [1, 2, 3, 2, 1], 0.225)])) == [(0, "c"), (25, "o"), (75, "c"), (150, "w"), (200, "c")]
    assert marks(mouth_of([("a, i", [1, 2, 1, 1, 2, 1], 0.2)])) == [(0, "c"), (25, "o"), (75, "c"), (125, "w"), (175, "c")]


def test_a_second_piece_starts_where_the_first_ones_speech_ends():
    first = ("a", [2, 2, 2], 0.2)
    second = ("i", [2, 2, 2], 0.15)

    assert marks(mouth_of([first, second])) == [(0, "c"), (50, "o"), (100, "c"), (250, "w"), (300, "c")]


def test_no_mouth_is_given_for_sounds_and_lengths_that_do_not_line_up():
    assert mouth_of([("map", [4, 2, 6, 2], 0.4)]) is None
    assert mouth_of([("map", None, 0.4)]) is None
    assert mouth_of([("a", [1, 1, 1], 0.1), ("map", [1], 0.1)]) is None
    assert mouth_of([]) is None
