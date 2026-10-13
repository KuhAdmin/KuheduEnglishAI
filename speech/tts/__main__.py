"""`python -m tts`: the speaking service, for the Node server on this machine to call."""

from __future__ import annotations

import os

import uvicorn

from .indic import IndicSynth
from .server import create_app
from .synth import KokoroSynth, Speakers
from .voices import VOICES


def main() -> None:
    synth = Speakers({"kokoro": KokoroSynth(), "indic": IndicSynth()})
    voices = synth.ready(VOICES)
    for language in sorted({voice.language for voice in VOICES} - {voice.language for voice in voices}):
        # Silent in that language, as for one with no voice at all, rather than failing to start.
        tag = language.split("-")[0]
        print(f"No voice for {language}: its model is not here. Fetch it with: python -m tts.indic_fetch {tag}")

    # Before it listens: a service that answers "ok" and then keeps its first caller waiting a
    # minute for a model is not ready.
    print("Loading the voices: this takes a minute or two…", flush=True)
    synth.warm(voices)

    # This machine only: the Node server is the way in for everyone else.
    port = int(os.environ.get("SPEECH_PORT", "8788"))
    uvicorn.run(create_app(synth, voices), host="127.0.0.1", port=port)


if __name__ == "__main__":
    main()
