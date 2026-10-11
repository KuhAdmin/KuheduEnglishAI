"""`python -m tts`: the speaking service, for the Node server on this machine to call."""

from __future__ import annotations

import os

import uvicorn

from .server import create_app
from .synth import KokoroSynth
from .voices import VOICES


def main() -> None:
    synth = KokoroSynth()
    # Before it listens: a service that answers "ok" and then keeps its first caller waiting a
    # minute for the model is not ready.
    print("Loading the voices: this takes up to a minute…", flush=True)
    synth.warm(VOICES[0])

    # This machine only: the Node server is the way in for everyone else.
    port = int(os.environ.get("SPEECH_PORT", "8788"))
    uvicorn.run(create_app(synth), host="127.0.0.1", port=port)


if __name__ == "__main__":
    main()
