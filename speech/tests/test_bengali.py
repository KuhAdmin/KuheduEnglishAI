import importlib.util
import json
from pathlib import Path

import pytest

from tts import bengali

DOT = "়"


def test_bengalis_full_stop_becomes_one_the_reader_keeps():
    assert bengali.tidy("আমার নাম আশা। আপনার নাম কী?") == "আমার নাম আশা. আপনার নাম কী?"


def test_a_dotted_letter_is_put_in_the_form_that_is_read_rightly_whichever_way_it_came():
    two, one = "বা" + "ড" + DOT + "ি", "বাড়ি"
    assert bengali.tidy(two) == bengali.tidy(one) == one

    # This letter is joined before a vowel sign only.
    assert bengali.tidy("হয" + DOT + "ে") == bengali.tidy("হয়ে") == "হয়ে"
    assert bengali.tidy("সময" + DOT) == bengali.tidy("সময়") == "সময" + DOT


def test_the_flapped_r_gets_a_symbol_of_its_own_and_a_full_stop_stays_one():
    assert bengali.repair("bˈɔr.") == "bˈɔɽ"
    assert bengali.repair("bˈɔr.. ˈaʃahr.ˌo") == "bˈɔɽ. ˈaʃaɽˌo"
    assert bengali.repair("ˌamaɾ nˈam.") == "ˌamaɾ nˈam."


def test_a_consonant_doubled_at_the_start_of_a_word_is_said_once_and_elsewhere_stays():
    assert bengali.repair("kʰkʰˈɔma ɡɡˈan") == "kʰˈɔma ɡˈan"
    assert bengali.repair("“kʰkʰˈɔma”") == "“kʰˈɔma”"
    assert bengali.repair("ʃˈikʰkʰɔk ʧʰˈabbiʃ") == "ʃˈikʰkʰɔk ʧʰˈabbiʃ"


def test_a_long_run_of_sounds_is_cut_where_a_speaker_would_stop():
    sentence = "ˌami bʰˈalo ˈaʧʰi."
    assert bengali.pieces(sentence) == [sentence]
    assert bengali.pieces("  ") == []

    assert bengali.pieces("ab. cd, ef gh", limit=8) == ["ab.", "cd,", "ef gh"]
    assert bengali.pieces("ab cd, ef gh", limit=8) == ["ab cd,", "ef gh"]
    # Nowhere to stop at all: cut anyway, and lose nothing.
    assert bengali.pieces("abcdefghij", limit=4) == ["abcd", "efgh", "ij"]

    long = " ".join([sentence] * 60)
    parts = bengali.pieces(long)
    assert len(parts) > 1 and all(len(part) <= bengali.LIMIT for part in parts)
    assert " ".join(parts) == long


# From here on eSpeak NG itself reads, as it does in the service. No model is loaded.
reads = pytest.mark.skipif(
    importlib.util.find_spec("misaki") is None, reason="Kokoro's text reader is not installed"
)


@reads
@pytest.mark.parametrize(
    ("word", "sounds"),
    [
        ("বাংলা", "bˈaŋla"),
        ("ভালোবাসি", "bʰˈalobˌaʃi"),
        # The dotted letters, written as the app's texts have them: as two characters.
        ("বাড" + DOT + "ি", "bˈaɽi"),
        ("বিড" + DOT + "াল", "bˈiɽal"),
        ("বড" + DOT, "bˈɔɽ"),
        ("হয" + DOT + "ে", "hˈɔe"),
        ("দিয" + DOT + "ে", "dˈie"),
        ("সময" + DOT, "ʃˈɔmɔj"),
        ("নয" + DOT + "টায" + DOT, "nˈɔjɔʈˌaj"),
        ("ক্ষমা", "kʰˈɔma"),
        ("জ্ঞান", "ɡˈan"),
    ],
)
def test_words_are_read_as_they_are_said(word: str, sounds: str):
    assert bengali.read(word) == sounds


@reads
def test_sentences_keep_their_stops_and_english_and_numbers_are_read_too():
    assert bengali.read("আমার নাম আশা। আপনার নাম কী?") == "ˌamaɾ nˈam ˈaʃa. ˌapɔnˌaɾ nˈam kˈi?"
    assert bengali.read("৭ দিন") == "ʃˈat dˈin"
    assert bengali.read("Week 2") == "wˈiːk dˈuj"


@reads
def test_every_sound_bengali_is_given_is_one_the_model_knows():
    configs = sorted((Path(__file__).resolve().parents[1] / ".models").rglob("config.json"))
    if not configs:
        pytest.skip("The model has not been downloaded on this machine")
    known = json.loads(configs[0].read_text(encoding="utf-8"))["vocab"]

    text = (
        "নমস্কার! আপনি এখন বিভাগ ১-এ আছেন: পরিচয়। আপনার সপ্তাহগুলো দেখতে এতে ট্যাপ করুন। "
        "দুঃখ, চাঁদ, বিদ্যালয়, প্রশ্ন, উচ্চারণ, বড়, আষাঢ়, হঠাৎ, ঘর, ঝড়, ধন্যবাদ, ঠিকানা, ছাব্বিশ — “Hello”?"
    )
    unknown = {sound for part in bengali.sounds(text) for sound in part if sound not in known}
    assert unknown == set()
