"""`python -m assess recording.wav "Wednesday" --parts "We(d)n(e)s-day" --stress 1`"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from .attempt import assess_attempt
from .syllables import count_parts


def main() -> None:
    parser = argparse.ArgumentParser(prog="assess", description="Assess a recording of one word.")
    parser.add_argument("recording", type=Path)
    parser.add_argument("word", help="what was to be said, as it is written")
    parser.add_argument("--parts", help='the word in parts, as the lesson editor writes them: "hel-lo"')
    parser.add_argument("--stress", type=int, help="which part is the strong one, from 1")
    arguments = parser.parse_args()

    started = time.perf_counter()
    assessment = assess_attempt(
        arguments.recording,
        arguments.word,
        count_parts(arguments.parts) if arguments.parts else None,
        arguments.stress,
    )
    report = {**assessment.to_json(), "seconds": round(time.perf_counter() - started, 2)}
    # Phonetic letters, on a Windows console that is not UTF-8 by default.
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
