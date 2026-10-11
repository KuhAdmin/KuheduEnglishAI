"""Counting the parts a word is said in, from its sounds."""

from __future__ import annotations

# Letters of the phonetic alphabet that are vowels. A sound with one in it is the middle of a
# syllable: a diphthong ("eɪ") or an r-coloured vowel ("ɑɹ") is still one.
VOWELS = frozenset("aeiouyæɑɒɐɔəɚɛɜɝɪʊʌøœᵻɨʉɯ")
# The mark under a consonant that is a syllable by itself ("n̩" in "button").
SYLLABIC = "̩"


def is_nucleus(phone: str) -> bool:
    """Whether a sound is the middle of a syllable."""
    return SYLLABIC in phone or any(letter in VOWELS for letter in phone)


def count_parts(written: str) -> int:
    """How many parts a word has, written as the lesson's editor writes them: "We(d)n(e)s-day"."""
    return len([part for part in written.split("-") if part.strip()])


def regions(centres: list[float], start: float, end: float) -> list[tuple[float, float]]:
    """The stretch of time that belongs to each syllable, given the middle of each.

    The recogniser says where a vowel is, not how long it lasts, so a syllable is taken to reach
    half-way to its neighbours, and the first and last to the edges of what was said.
    """
    edges = [start] + [(a + b) / 2 for a, b in zip(centres, centres[1:])] + [end]
    return list(zip(edges, edges[1:]))
