"""A Bengali text as a model that knows only Bengali letters can read it.

AI4Bharat's Bengali model was taught Bengali script and little else: a digit or an English word
is nothing to it, and is passed over in silence. The app's Bengali has both ("দিন ১", "“Good
morning” বলুন"), so here numbers become their words and English words are respelled in Bengali
letters, to be said by the same voice with a Bengali speaker's accent.

How an English word is respelled is content. TODO(content): a Bengali speaker's eye on `RESPELLED`,
and on what the sounds of a word not listed there come out as.
"""

from __future__ import annotations

import logging
import re
import unicodedata

DOT = chr(0x09BC)
HASANTA = "্"

# The three dotted letters (in বাড়ি, আষাঢ়, সময়) are each two characters, a letter and the dot
# under it: how Unicode keeps them and how the app's texts have them. Each is also one older
# character. Named by number here: typed, the one is easily the two.
_ONE = {chr(0x09A1) + DOT: chr(0x09DC), chr(0x09A2) + DOT: chr(0x09DD), chr(0x09AF) + DOT: chr(0x09DF)}

_BENGALI_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")

# English words the course really quotes, as a Bengali speaker writes them.
RESPELLED = {
    "a": "আ", "afternoon": "আফটারনুন", "am": "অ্যাম", "and": "অ্যান্ড", "are": "আর",
    "because": "বিকজ", "bye": "বাই", "day": "ডে", "evening": "ইভনিং", "fine": "ফাইন",
    "first": "ফার্স্ট", "good": "গুড", "goodbye": "গুডবাই", "hello": "হ্যালো", "how": "হাউ",
    "however": "হাউএভার", "i": "আই", "i'm": "আইম", "is": "ইজ", "kuhedu": "কুহেডু",
    "lingo": "লিঙ্গো", "meet": "মিট", "morning": "মর্নিং", "my": "মাই", "name": "নেম",
    "next": "নেক্সট", "nice": "নাইস", "night": "নাইট", "no": "নো", "please": "প্লিজ",
    "so": "সো", "sorry": "সরি", "start": "স্টার্ট", "thank": "থ্যাঙ্ক", "thanks": "থ্যাঙ্কস",
    "the": "দ্য", "then": "দেন", "to": "টু", "too": "টু", "week": "উইক", "what": "হোয়াট",
    "what's": "হোয়াটস", "yes": "ইয়েস", "you": "ইউ",
}  # fmt: skip

# The sounds of an English word (as Kokoro's reader writes them: a diphthong is one capital
# letter) in Bengali letters. A vowel is a letter of its own at the start of a word and after
# another vowel, and a sign on the consonant before it otherwise.
_CONSONANTS = {
    "b": "ব", "d": "ড", "f": "ফ", "h": "হ", "k": "ক", "l": "ল", "m": "ম", "n": "ন", "p": "প",
    "s": "স", "t": "ট", "v": "ভ", "z": "জ", "ɡ": "গ", "g": "গ", "ɹ": "র", "r": "র", "ɾ": "ট",
    "ʃ": "শ", "ʒ": "জ", "ð": "দ", "θ": "থ", "ʤ": "জ", "ʧ": "চ", "T": "ট",
}  # fmt: skip
# (a letter of its own, a sign). An empty sign is the vowel a Bengali consonant carries unwritten.
_VOWELS = {
    "i": ("ই", "ি"), "ɪ": ("ই", "ি"), "ᵻ": ("ই", "ি"), "u": ("উ", "ু"), "ʊ": ("উ", "ু"),
    "ɛ": ("এ", "ে"), "e": ("এ", "ে"), "A": ("এ", "ে"), "æ": ("অ্যা", "্যা"),
    "ɑ": ("আ", "া"), "ʌ": ("আ", "া"), "ɐ": ("আ", "া"), "a": ("আ", "া"),
    "ɔ": ("অ", ""), "ɒ": ("অ", ""), "ə": ("অ", ""), "ᵊ": ("", ""),
    "ɜ": ("আর", "ার"), "ɚ": ("আর", "ার"),
    "I": ("আই", "াই"), "W": ("আউ", "াউ"), "O": ("ও", "ো"), "Q": ("ও", "ো"), "Y": ("অয়", "য়"),
}  # fmt: skip
# Ride on the vowel before them: no letter of their own to join to.
_AFTER_A_VOWEL = {"ŋ": "ং"}
_GLIDES = {"j": ("ইয়", "িয়"), "w": ("ওয়", "োয়")}

_LATIN = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)*")
_QUOTES = set("“”‘’\"'«»")
_reader = None


def _sounds(word: str) -> str:
    """An English word's sounds, by the reader Kokoro already brings (eSpeak NG)."""
    global _reader
    if _reader is None:
        # Imported here: it loads eSpeak NG, which the tests of everything else do not need.
        from misaki import espeak

        logging.getLogger("phonemizer").setLevel(logging.ERROR)
        _reader = espeak.EspeakG2P(language="en-us")
    sounds, _ = _reader(word)
    return sounds


def spell(sounds: str) -> str:
    """The sounds of an English word, written in Bengali letters."""
    written = ""
    # What the last thing written was: nothing yet, a consonant still bare, or a vowel.
    last = None
    for sound in sounds:
        if sound in _CONSONANTS:
            # Two consonants with no vowel between are joined, as in "প্লিজ".
            written += (HASANTA if last == "consonant" else "") + _CONSONANTS[sound]
            last = "consonant"
        elif sound in _VOWELS:
            alone, sign = _VOWELS[sound]
            written += sign if last == "consonant" else alone
            last = "vowel"
        elif sound in _GLIDES:
            alone, sign = _GLIDES[sound]
            written += sign if last == "consonant" else alone
            last = "vowel"
        elif sound in _AFTER_A_VOWEL:
            written += _AFTER_A_VOWEL[sound]
            last = "vowel"
        # Stress, length and anything unknown: nothing to write.
    return written


def respell(word: str, sounds=_sounds) -> str:
    """An English word in Bengali letters: as listed, else by its sounds."""
    plain = word.lower().replace("’", "'")
    return RESPELLED.get(plain) or spell(sounds(plain))


def numbers_in_words(text: str) -> str:
    # Imported here: only a text with a number in it needs it.
    from bnnumerizer import numerize

    # It reads Bengali digits only; the app writes Latin ones in Hindi and English texts.
    return numerize(text.translate(_BENGALI_DIGITS))


def readable(text: str, known: set[str], sounds=_sounds) -> str:
    """The text with nothing in it but what the model was taught: `known`, its letters and marks."""
    # A dotted letter comes out of this as two characters, whichever way the text had it.
    text = unicodedata.normalize("NFC", text)
    if DOT not in known:
        # A model that was never taught the dot is given the one character instead.
        for two, one in _ONE.items():
            text = text.replace(two, one)
    if any(character.isdigit() for character in text):
        text = numbers_in_words(text)
    text = _LATIN.sub(lambda word: respell(word.group(), sounds), text)
    if "।" not in known:
        text = text.replace("॥", ".").replace("।", ".")
    # A dash between words is a pause; the hyphen before a case ending ("“…”-এ") is not.
    text = text.replace("—", ", ").replace("–", ", ").replace("…", ".")
    # A quotation mark goes without a gap, or that ending would stand apart from its word.
    text = "".join(character for character in text if character in known or character not in _QUOTES)
    kept ="".join(character if character in known or character == " " else " " for character in text)
    return " ".join(kept.split())


def sentences(text: str) -> list[str]:
    """A text in the parts it is said in: a sentence each, with the mark that ends it."""
    parts = re.findall(r"[^।.!?]+[।.!?]*", text)
    return [part.strip() for part in parts if any(character.isalpha() for character in part)]
