"""Sounds an Indian accent uses that are not mistakes.

The recogniser was trained on American and British reading voices and would mark these as
errors. They are how English is spoken in India, and a learner is not corrected for them.

A first list, written from descriptions of Indian English and not yet from recordings:
TODO(content) review by a teacher, and check each pair against what `evaluate.py` reports.
"""

from __future__ import annotations

# Expected sound -> what may be heard in its place.
ACCEPTED: dict[str, frozenset[str]] = {
    # "v" and "w" are one sound for many speakers.
    "w": frozenset({"v", "ʋ"}),
    "v": frozenset({"w", "ʋ"}),
    # "t" and "d" said with the tongue curled back, or against the teeth.
    "t": frozenset({"ʈ", "t̪"}),
    "d": frozenset({"ɖ", "d̪"}),
    # "th" as a dental stop.
    "θ": frozenset({"t̪", "t"}),
    "ð": frozenset({"d̪", "d"}),
    # A tapped or rolled "r". OpenPronounce writes a tap as "t" (it reads it as the American
    # flapped t), so that has to be let through here too.
    "ɹ": frozenset({"r", "ɾ", "ɽ", "t"}),
    # Long vowels said without the glide.
    "eɪ": frozenset({"e"}),
    "oʊ": frozenset({"o"}),
    # The "r" after a vowel said, or left out.
    "ɚ": frozenset({"ə", "əɹ", "ər"}),
    "ɑ": frozenset({"a"}),
}


def accepted(expected: str, heard: str) -> bool:
    """Whether hearing `heard` where `expected` was due is no mistake."""
    return heard == expected or heard in ACCEPTED.get(expected, ())
