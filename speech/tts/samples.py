"""`python -m tts.samples`: every offered voice saying a sentence, to judge by ear, and how long each took.

Writes MP3s to `samples/` (ignored by git) and prints, per voice, the seconds of sound, the
seconds it took to make, whether the mouth for it came too, and the memory in use at the end.
"""

from __future__ import annotations

import io
import sys
import time
from pathlib import Path

from .indic import IndicSynth
from .synth import KokoroSynth, Speakers
from .voices import VOICES, base_language

# A language with several lines gets a file for each: `bn_diya-1.mp3`, `bn_diya-2.mp3`, …
SENTENCES = {
    "en": ("Hello! Good morning. Nice to meet you. Tap Start Day 1 when you are ready.",),
    "hi": ("नमस्ते! सुप्रभात। आपसे मिलकर अच्छा लगा। तैयार होने पर शुरू करें पर टैप करें।",),
    # The app's own Bengali: a greeting with a number in it, the voice sample, two of the tutor's
    # lines, a sentence of Day 3, and a tip that quotes English.
    "bn": (
        "নমস্কার! সুপ্রভাত। আপনার সঙ্গে দেখা হয়ে ভালো লাগল। তৈরি হলে “দিন ১ শুরু করুন”-এ ট্যাপ করুন।",
        "নমস্কার! চলুন, একসঙ্গে ইংরেজি বলা অনুশীলন করি।",
        "আপনি এখন বিভাগ ১-এ আছেন: কথা বলা শুরু করি। আপনার সপ্তাহগুলো দেখতে এতে ট্যাপ করুন।",
        "এগুলো সপ্তাহ ১৬ থেকে ২০। কোন সপ্তাহে কী শিখবেন তা দেখতে সেটিতে ট্যাপ করুন।",
        "আপনার সঙ্গে পরিচিত হয়ে ভালো লাগল। আমি ভালো আছি, ধন্যবাদ। আপনার নাম কী?",
        "দুপুরের আগে “Good morning” বলুন। “Hello” দিনের যেকোনো সময় বলা যায়। শেষে “please” বলুন।",
    ),
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
    # Neither loads its model until the first of its voices is said.
    synth = Speakers({"kokoro": KokoroSynth(), "indic": IndicSynth()})

    print(f"{'file':14} {'language':7} {'sound s':>8} {'made in s':>10} {'ratio':>6} {'mouth':>6}")
    for voice in synth.ready(VOICES):
        if only and voice.id not in only:
            continue
        lines = SENTENCES[base_language(voice.language)]
        for number, line in enumerate(lines, start=1):
            name = voice.id if len(lines) == 1 else f"{voice.id}-{number}"
            started = time.perf_counter()
            spoken = synth.synthesize(line, voice)
            took = time.perf_counter() - started
            (folder / f"{name}.mp3").write_bytes(spoken.mp3)
            sound = seconds_of(spoken.mp3)
            print(
                f"{name:14} {voice.language:7} {sound:8.1f} {took:10.1f} {took / sound:6.2f}"
                f" {'yes' if spoken.mouth else 'NO':>6}",
                flush=True,
            )

    memory = memory_mb()
    if memory is not None:
        print(f"Peak memory: {memory:.0f} MB")
    print(f"Samples in {folder}")


if __name__ == "__main__":
    main()
