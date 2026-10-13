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
