"""The mouth for a sound: which shape the lips have, and from when.

Kokoro decides how long every sound of a sentence lasts before it makes the speech, so it knows
exactly when each one is said. That is passed on with the speech, and a drawn face in the app
moves its lips by it instead of guessing a pace from the spelling.

The app's faces have five shapes of speech. `c` lips closed (m, b, p, and a pause), `m` nearly
closed with the teeth showing (every other consonant), `o` open (a, e, and the vowel of "the"),
`w` wide (i), `r` round (o, u, w). Which sound gets which is a drawing's simplification, not
phonetics: what makes a face look as if it is the one talking is that its jaw opens on every
vowel and comes up again for the consonants between, so no vowel shares the consonants' shape.
(When e and the vowel of "the" did, "together" was one still mouth for most of a second.)
TODO(content): an animator's eye on the table.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence

# Kokoro counts a sound's length in 40ths of a second.
FRAME_SECONDS = 0.025
# A gap between words shorter than this is not a pause: the lips keep the shape they had.
PAUSE_FRAMES = 3

CLOSED, MID, OPEN, WIDE, ROUND = "c", "m", "o", "w", "r"

# Kokoro writes a diphthong as one capital letter: A (eɪ), I (aɪ), W (aʊ), O (oʊ), Q (əʊ), Y (ɔɪ).
_SHAPES = {
    **dict.fromkeys("mbp", CLOSED),
    **dict.fromkeys("aɑɐæʌɒeɛəɜɚᵊAIW", OPEN),
    **dict.fromkeys("iɪɨᵻjʝ", WIDE),
    **dict.fromkeys("oɔuʊwøœyɥOQY", ROUND),
}
# Marks that are part of the sound after them (stress) or before them (length, a puff of air,
# through the nose): no shape of their own.
_OF_THE_NEXT = set("ˈˌ")
_OF_THE_LAST = set("ːʰʲ̃↓→↗↘")
_PAUSES = set(";:,.!?—…\"()“”")


def _shapes(sounds: str, frames: Sequence[int]) -> list[str]:
    """A shape for every sound, and for the silence Kokoro puts before and after them."""
    shapes = [CLOSED]
    for index, sound in enumerate(sounds):
        if sound in _PAUSES:
            shape = CLOSED
        elif sound == " ":
            shape = CLOSED if frames[index + 1] >= PAUSE_FRAMES else shapes[-1]
        elif sound in _OF_THE_LAST:
            shape = shapes[-1]
        elif sound in _OF_THE_NEXT:
            shape = ""
        else:
            shape = _SHAPES.get(sound, MID)
        shapes.append(shape)
    shapes.append(CLOSED)
    # A stress mark takes the shape of the sound it is the stress of.
    for index in range(len(shapes) - 2, 0, -1):
        if not shapes[index]:
            shapes[index] = shapes[index + 1]
    return shapes


# Indic-TTS is given letters, not sounds, and says how long each letter lasts. A Bengali letter is
# not one sound: a consonant carries a vowel that is not written (the "o" of "বল") unless a vowel
# sign or a joining mark follows it, or it ends the word. The same five shapes, by the same rule.
# The three dotted letters as one character each (ড়, ঢ়, য়), named by number: typed, they are
# easily the two-character form, which is a consonant followed by a dot.
_RRA, _RHA, _YYA = chr(0x09DC), chr(0x09DD), chr(0x09DF)
_LETTER_SHAPES = {
    **dict.fromkeys("পফবভম", CLOSED),
    **dict.fromkeys("আএাে", OPEN),
    **dict.fromkeys("ইঈঋিীৃ" + _YYA, WIDE),
    **dict.fromkeys("অউঊঐওঔুূৈোৌৗ", ROUND),
}
# Part of the letter before them: a dot under it (U+09BC), the joining mark (U+09CD), a tone
# through the nose (U+0981), a breath (U+0983), and the two marks that only say how letters are
# drawn together.
_DOT = chr(0x09BC)
_OF_THE_LETTER_BEFORE = {_DOT, chr(0x09CD), chr(0x0981), chr(0x0983), chr(0x200C), chr(0x200D)}
_NG = chr(0x0982)
_LETTER_PAUSES = _PAUSES | set("।'‘’¡¿")
# The share of a consonant's length that is the consonant, where it carries its unwritten vowel.
CONSONANT_SHARE = 0.4
# A gap between words shorter than this is not a pause: the lips keep the shape they had.
PAUSE_SECONDS = PAUSE_FRAMES * FRAME_SECONDS


def _is_consonant(letter: str) -> bool:
    return "ক" <= letter <= "হ" or letter in (_RRA, _RHA, _YYA)


def _letter_shapes(letters: Sequence[str], seconds: Sequence[float]) -> list[tuple[str, float]]:
    """The shapes a sentence's letters take, each with how long it is held."""
    shapes: list[tuple[str, float]] = []
    last = CLOSED
    for index, (letter, length) in enumerate(zip(letters, seconds)):
        # What follows the letter, past the dot that may be under it.
        after = next((later for later in letters[index + 1 :] if later != _DOT), " ")
        if letter in _LETTER_PAUSES:
            last = CLOSED
        elif letter == " ":
            last = CLOSED if length >= PAUSE_SECONDS else last
        elif letter in _OF_THE_LETTER_BEFORE:
            pass
        elif _is_consonant(letter) and (_is_consonant(after) or after == _NG):
            # The jaw comes up for the consonant and opens for the vowel it carries.
            shapes.append((_LETTER_SHAPES.get(letter, MID), length * CONSONANT_SHARE))
            shapes.append((ROUND, length * (1 - CONSONANT_SHARE)))
            last = ROUND
            continue
        else:
            last = _LETTER_SHAPES.get(letter, MID)
        shapes.append((last, length))
    return shapes


def mouth_of_letters(
    pieces: Iterable[tuple[Sequence[str], Sequence[int] | None, float, float, float]],
) -> str | None:
    """The mouth for a sound made from letters, written as `mouth_of` writes it.

    A piece is a sentence: the letters the model was given, how many frames it gave each, how long
    a frame lasts, when the first letter begins in the sentence's sound (before zero where the
    quiet it opens with was cut away) and the seconds of sound it came to. `None` when letters and
    lengths do not line up.
    """
    marks: list[tuple[int, str]] = []
    start = 0.0
    for letters, frames, frame_seconds, begins, seconds in pieces:
        if frames is None or len(frames) != len(letters):
            return None
        # Closed from where the sentence's sound begins until its first letter does.
        changes = [(start, CLOSED)]
        at = start + begins
        for shape, length in _letter_shapes(letters, [length * frame_seconds for length in frames]):
            changes.append((at, shape))
            at += length
        changes.append((at, CLOSED))
        for moment, shape in changes:
            # A letter whose quiet was cut still begins no earlier than its sentence's sound.
            at_ms = round(min(max(moment, start), start + seconds) * 1000)
            # Two changes at one moment: the later is the one that is seen.
            if marks and marks[-1][0] == at_ms:
                marks.pop()
            if not marks or marks[-1][1] != shape:
                marks.append((at_ms, shape))
        start += seconds
    return "".join(f"{at}{shape}" for at, shape in marks) or None


def mouth_of(pieces: Iterable[tuple[str, Sequence[int] | None, float]]) -> str | None:
    """The mouth for a whole sound, written as the app reads it: `0c75m150o`.

    Each number is thousandths of a second from the start, each letter the shape from then on.
    A piece is the sounds the model was given, how long it made each (with the silence before the
    first and after the last), and the seconds of speech it came to. `None` when the two do not
    line up: a face is better left guessing than given a mouth for another sentence.
    """
    marks: list[tuple[int, str]] = []
    start = 0.0
    for sounds, frames, seconds in pieces:
        if frames is None or len(frames) != len(sounds) + 2:
            return None
        at = start
        for shape, length in zip(_shapes(sounds, frames), frames):
            if not marks or marks[-1][1] != shape:
                marks.append((round(at * 1000), shape))
            at += length * FRAME_SECONDS
        # The next piece begins where this one's speech ends, whatever the sum of its sounds.
        start += seconds
    return "".join(f"{at}{shape}" for at, shape in marks) or None
