"""How often the scorer is right, per kind of correction."""

from __future__ import annotations

from dataclasses import dataclass

from .result import CORRECTIONS


@dataclass
class Counts:
    # Said it, and it was so. / Said it, and it was not. / It was so, and it was not said.
    right: int = 0
    wrong: int = 0
    missed: int = 0

    @property
    def precision(self) -> float | None:
        """Of the times it spoke, how often it was right. The number the bar is set on."""
        spoke = self.right + self.wrong
        return self.right / spoke if spoke else None

    @property
    def recall(self) -> float | None:
        """Of the mistakes that were there, how many it caught."""
        there = self.right + self.missed
        return self.right / there if there else None


def tally(attempts: list[tuple[set[str], set[str]]]) -> dict[str, Counts]:
    """Count, per correction, over attempts of (what was really said, what the scorer found)."""
    counts = {code: Counts() for code in CORRECTIONS}
    for said, found in attempts:
        for code in CORRECTIONS:
            if code in found and code in said:
                counts[code].right += 1
            elif code in found:
                counts[code].wrong += 1
            elif code in said:
                counts[code].missed += 1
    return counts
