"""`python -m tts.samples`: every offered voice saying a sentence, to judge by ear, and how long each took.

Writes MP3s to `samples/` (ignored by git) and prints, per voice, the seconds of sound, the
seconds it took to make, and the memory in use at the end.
"""

from __future__ import annotations

import io
import sys
import time
from pathlib import Path

from .synth import KokoroSynth
from .voices import VOICES, base_language

SENTENCES = {
    "en": "Hello! Good morning. Nice to meet you. Tap Start Day 1 when you are ready.",
    "hi": "नमस्ते! सुप्रभात। आपसे मिलकर अच्छा लगा। तैयार होने पर शुरू करें पर टैप करें।",
    "bn": "নমস্কার! সুপ্রভাত। আপনার সঙ্গে দেখা হয়ে ভালো লাগল। তৈরি হলে “দিন ১ শুরু করুন”-এ ট্যাপ করুন।",
}


def seconds_of(mp3: bytes) -> float:
    import soundfile

    return soundfile.info(io.BytesIO(mp3)).duration


def memory_mb() -> float | None:
    try:
        import psutil
    except ImportError:
        return None
    memory = psutil.Process().memory_info()
    return getattr(memory, "peak_wset", memory.rss) / 1_048_576


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    folder = Path(__file__).resolve().parents[1] / "samples"
    folder.mkdir(exist_ok=True)
    only = set(sys.argv[1:])
    synth = KokoroSynth()

    print(f"{'voice':14} {'language':7} {'sound s':>8} {'made in s':>10} {'ratio':>6}")
    for voice in VOICES:
        if only and voice.id not in only:
            continue
        started = time.perf_counter()
        mp3 = synth.synthesize(SENTENCES[base_language(voice.language)], voice)
        took = time.perf_counter() - started
        (folder / f"{voice.id}.mp3").write_bytes(mp3)
        sound = seconds_of(mp3)
        print(f"{voice.id:14} {voice.language:7} {sound:8.1f} {took:10.1f} {took / sound:6.2f}")

    memory = memory_mb()
    if memory is not None:
        print(f"Peak memory: {memory:.0f} MB")
    print(f"Samples in {folder}")


if __name__ == "__main__":
    main()
