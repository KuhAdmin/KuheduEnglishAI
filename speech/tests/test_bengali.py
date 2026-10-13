import pytest

from tts import bengali
from tts.bengali import readable, respell, sentences, spell

DOT = chr(0x09BC)

# What a model taught Bengali knows: its letters and signs, and a few marks.
KNOWN = {chr(code) for code in range(0x0981, 0x09E4)} | set("!?,.-") | {"।"}


def no_reader(word: str) -> str:
    raise AssertionError(f"'{word}' should not have needed its sounds")


def test_a_number_is_said_as_its_word_whichever_digits_it_is_written_in():
    assert readable("এবার দিন ১।", KNOWN, no_reader) == "এবার দিন এক।"
    assert readable("এগুলো সপ্তাহ ১৬ থেকে ২০।", KNOWN, no_reader) == "এগুলো সপ্তাহ ষোল থেকে বিশ।"
    assert readable("দিন 3", KNOWN, no_reader) == "দিন তিন"


def test_an_english_word_the_course_quotes_is_written_as_a_bengali_speaker_writes_it():
    assert readable("দুপুরের আগে “Good morning” বলুন।", KNOWN, no_reader) == "দুপুরের আগে গুড মর্নিং বলুন।"
    assert readable("“I’m” দিয়ে শুরু করুন।", KNOWN, no_reader).startswith("আইম ")
    assert respell("HELLO", no_reader) == "হ্যালো"


def test_any_other_english_word_is_written_by_its_sounds():
    assert respell("every", lambda word: "ˈɛvɹi") == "এভ্রি"
    assert readable("“teacher” বলুন", KNOWN, lambda word: "tˈiʧɚ") == "টিচার বলুন"


@pytest.mark.parametrize(
    ("sounds", "written"),
    [
        ("ɡˈʊd", "গুড"),
        ("mˈɔɹnɪŋ", "মর্নিং"),
        ("plˈiz", "প্লিজ"),
        ("nˈIs", "নাইস"),
        ("hɛlˈO", "হেলো"),
        ("hˈW", "হাউ"),
        ("ˈɑɹ", "আর"),
        ("nˈAm", "নেম"),
        ("θˈæŋk", "থ্যাংক"),
        ("stˈɑɹt", "স্টার্ট"),
    ],
)
def test_sounds_are_spelled_with_vowel_signs_and_joined_consonants(sounds: str, written: str):
    assert spell(sounds) == written


def test_what_the_model_was_not_taught_is_left_out_and_does_not_join_its_neighbours():
    assert readable("তৈরি হলে “দিন ১ শুরু করুন”-এ ট্যাপ করুন।", KNOWN, no_reader) == (
        "তৈরি হলে দিন এক শুরু করুন-এ ট্যাপ করুন।"
    )
    assert readable("ভালো 🙂 আছি", KNOWN, no_reader) == "ভালো আছি"
    assert readable("“…”", KNOWN, no_reader) == "."


def test_bengalis_full_stop_is_kept_for_a_model_that_knows_it_and_replaced_for_one_that_does_not():
    assert readable("আমার নাম আশা। আপনার নাম কী?", KNOWN, no_reader) == "আমার নাম আশা। আপনার নাম কী?"
    without = KNOWN - {"।"}
    assert readable("আমার নাম আশা। আপনার নাম কী?", without, no_reader) == "আমার নাম আশা. আপনার নাম কী?"


def test_a_dotted_letter_is_given_as_the_app_writes_it_whichever_way_it_came():
    # The second letter of the word for "house": a letter and its dot, or the one older character.
    two = chr(0x09AC) + chr(0x09BE) + chr(0x09A1) + DOT + chr(0x09BF)
    one = chr(0x09AC) + chr(0x09BE) + chr(0x09DC) + chr(0x09BF)

    assert readable(two, KNOWN, no_reader) == readable(one, KNOWN, no_reader) == two
    # The other two of the three, as the words for "time" and a month end.
    time, month = chr(0x09B8) + chr(0x09AE) + chr(0x09DF), chr(0x0986) + chr(0x09B7) + chr(0x09BE) + chr(0x09DD)
    assert readable(time + " " + month, KNOWN, no_reader) == (
        chr(0x09B8) + chr(0x09AE) + chr(0x09AF) + DOT + " " + chr(0x0986) + chr(0x09B7) + chr(0x09BE) + chr(0x09A2) + DOT
    )


def test_a_model_that_was_never_taught_the_dot_is_given_the_one_character():
    two = chr(0x09AC) + chr(0x09BE) + chr(0x09A1) + DOT + chr(0x09BF)
    one = chr(0x09AC) + chr(0x09BE) + chr(0x09DC) + chr(0x09BF)
    without_the_dot = KNOWN - {DOT}

    assert readable(two, without_the_dot, no_reader) == readable(one, without_the_dot, no_reader) == one


def test_a_text_is_said_a_sentence_at_a_time_each_with_its_mark():
    assert sentences("নমস্কার! সুপ্রভাত। আপনার নাম কী?") == ["নমস্কার!", "সুপ্রভাত।", "আপনার নাম কী?"]
    assert sentences("ভালো আছি") == ["ভালো আছি"]
    assert sentences(" । . ") == []
    assert sentences("") == []


def test_the_english_reader_is_asked_only_for_a_word_that_is_not_listed():
    asked = []

    def reader(word: str) -> str:
        asked.append(word)
        return "tˈiʧɚ"

    readable("“Good” আর “teacher”", KNOWN, reader)
    assert asked == ["teacher"]
    assert "good" in bengali.RESPELLED
