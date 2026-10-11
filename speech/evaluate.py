"""`python evaluate.py recordings/`: how often the scorer is right on labelled recordings.

`recordings/labels.csv` has one line per clip:

    file,word,parts,stress,said
    asha-hello-1.wav,hello,hel-lo,2,ok
    asha-hello-2.wav,hello,hel-lo,2,stressMoved
    ravi-wednesday-2.wav,Wednesday,We(d)n(e)s-day,1,extraSyllable+soundDiffers

`said` is what the speaker really did, as the person who labelled it heard it: `ok`, or the
corrections that apply, joined with `+`. Further columns (speaker, note) are ignored.
"""

from __future__ import annotations

import csv
import statistics
import sys
import time
from pathlib import Path

from assess.attempt import assess_attempt
from assess.metrics import tally
from assess.result import CORRECTIONS
from assess.syllables import count_parts

# A finding is shown to a learner at or above one of these; the table shows what each would cost.
THRESHOLDS = (0.3, 0.5, 0.7, 0.9)


def share(value: float | None) -> str:
    return "  n/a" if value is None else f"{value:5.0%}"


def peak_memory_mb() -> float | None:
    try:
        import psutil
    except ImportError:
        return None
    memory = psutil.Process().memory_info()
    return getattr(memory, "peak_wset", memory.rss) / 1_048_576


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else "recordings")
    with open(folder / "labels.csv", newline="", encoding="utf-8") as labels:
        rows = list(csv.DictReader(labels))

    attempts, seconds = [], []
    for row in rows:
        said = {code for code in row["said"].split("+") if code in CORRECTIONS}
        started = time.perf_counter()
        assessment = assess_attempt(
            folder / row["file"],
            row["word"],
            count_parts(row["parts"]) if row.get("parts") else None,
            int(row["stress"]) if row.get("stress") else None,
        )
        seconds.append(time.perf_counter() - started)
        attempts.append((said, assessment))
        found = ", ".join(
            f"{f.code} {f.confidence:.2f}" for f in assessment.findings
        )
        print(f"{row['file']}: said {row['said']}; found {found}")

    print(f"\n{len(rows)} recordings")
    for threshold in THRESHOLDS:
        print(f"\nShown at confidence {threshold:.1f} and above")
        print(f"  {'':16} right wrong missed  precision  recall")
        counts = tally([(said, assessment.codes(threshold)) for said, assessment in attempts])
        for code, count in counts.items():
            print(
                f"  {code:16} {count.right:5} {count.wrong:5} {count.missed:6}"
                f"      {share(count.precision)}   {share(count.recall)}"
            )

    if seconds:
        # The first recording also loads the model, so it is told apart.
        rest = seconds[1:] or seconds
        print(f"\nSeconds a word: first {seconds[0]:.1f}, then median {statistics.median(rest):.1f}, slowest {max(rest):.1f}")
    memory = peak_memory_mb()
    if memory is not None:
        print(f"Peak memory: {memory:.0f} MB")


if __name__ == "__main__":
    main()
