"""Bengali, which Kokoro was never taught: its text turned into sounds Kokoro's model knows.

Kokoro speaks in two steps: a text becomes sounds (IPA), and the sounds become speech. Only the
first step knows about languages, and for Hindi Kokoro itself leaves it to eSpeak NG, which has
Bengali's reading rules too. So a Bengali text is read by eSpeak NG here and said by Kokoro's
model in one of its Hindi voices, Hindi being the nearest language it was taught.

Nobody trained that model on Bengali: what comes out is Bengali in a Hindi speaker's mouth.
TODO(content): a Bengali speaker's ear on whether it is good enough for learners, and on which
words are read wrongly.

The IndicVoice-82M fork promises the same thing (it ships Kokoro's own model and voices, file for
file) but its Bengali is a table of letters that does not join consonants, never drops the
unwritten vowel, and stops with an error on its first word. It is not used.

What is repaired below is what eSpeak NG's Bengali gets wrong, or writes in a way the model would
misread. `tests/test_bengali.py` holds each repair against eSpeak NG itself, so a later release
that reads differently is noticed.
"""

from __future__ import annotations

import logging
import re
import unicodedata

# The most sounds the model takes at once.
LIMIT = 510

DOT = "়"
# A letter with a dot below is written as two characters (how Unicode keeps them, and how the
# app's texts have them) or as one older character. eSpeak NG reads the two-character form of
# these two wrongly: the vowel after it is lost ("বাড়ি" comes out as "bar").
_ALWAYS_ONE = {"ড" + DOT: "ড়", "ঢ" + DOT: "ঢ়"}
# This one it reads rightly as two characters at the end of a word and before a consonant
# ("সময়"), and as one before a vowel sign ("হয়ে"); either form is wrong in the other place.
_ONE_BEFORE_A_VOWEL_SIGN = re.compile("য" + DOT + "(?=[া-ৌ])")

# Where a text may be cut when it is longer than the model takes: at the end of a sentence if
# there is one, else at a pause, else between words.
_BREAKS = (".!?…", ",;:—", " ")

_reader = None


def tidy(text: str) -> str:
    """A Bengali text as eSpeak NG reads it best."""
    # The two-character form of every dotted letter first, whichever way the text came.
    text = unicodedata.normalize("NFC", text)
    for two, one in _ALWAYS_ONE.items():
        text = text.replace(two, one)
    text = _ONE_BEFORE_A_VOWEL_SIGN.sub("য়", text)
    # Bengali's full stop. Left as it is it would be dropped, and two sentences said as one.
    return text.replace("॥", ".").replace("।", ".")


def repair(sounds: str) -> str:
    """eSpeak NG's sounds, as Kokoro's model expects to be given them."""
    # eSpeak NG has no symbol of its own for the flapped r of "বড়" and writes "r.", whose full
    # stop the model would take for the end of a sentence. Its plain r is never written "r".
    sounds = sounds.replace("hr.", "ɽ").replace("r.", "ɽ")
    # "ক্ষমা" and "জ্ঞান" come back with their first consonant doubled, which is right in the
    # middle of a word ("শিক্ষক") and not something anyone says at the start of one.
    return re.sub(r"(?<!\w)(\wʰ?)\1(?=[ˈˌ]?\w)", r"\1", sounds)


def pieces(sounds: str, limit: int = LIMIT) -> list[str]:
    """The sounds in as few parts as the model takes, cut where a speaker would stop."""
    parts = []
    rest = sounds.strip()
    while len(rest) > limit:
        cut = limit - 1
        for marks in _BREAKS:
            last = max(rest.rfind(mark, 0, limit) for mark in marks)
            if last > 0:
                cut = last
                break
        parts.append(rest[: cut + 1].strip())
        rest = rest[cut + 1 :].strip()
    if rest:
        parts.append(rest)
    return parts


def read(text: str) -> str:
    """The sounds of a Bengali text. English words inside it are read as English."""
    global _reader
    if _reader is None:
        # Imported here: it loads eSpeak NG, which the catalogue and most tests do not need.
        from misaki import espeak

        # It warns about every text with an English word in it, which is most of the app's.
        logging.getLogger("phonemizer").setLevel(logging.ERROR)
        _reader = espeak.EspeakG2P(language="bn")
    sounds, _ = _reader(tidy(text))
    return repair(sounds)


def sounds(text: str) -> list[str]:
    """What the model is given for a Bengali text: its sounds, in parts it can take."""
    return pieces(read(text))
