"""`python -m assess.service`: the scoring service, for the Node server on this machine to call.

A recording of one word comes in, findings go out as codes with a confidence (`/assess`); or a
recording of a reply in a conversation comes in and the words said go out (`/transcribe`). It
listens on this machine only; the Node server is what the app talks to, and what decides who may
ask and what a learner is told. **A recording is held in memory while it is judged and then
let go: it is never written down here, and nothing about it, or of what was said, is logged.**
"""

from __future__ import annotations

import io
import os
import threading
from pathlib import Path
from typing import Protocol

from fastapi import FastAPI, HTTPException, Query, Request
from starlette.concurrency import run_in_threadpool

from . import words
from .result import Assessment
from .sounds import RATE
from .syllables import count_parts
from .words import Written

# A word, or a few said together. The Node server holds the same limits.
MAX_SECONDS = 15
MAX_BYTES = MAX_SECONDS * RATE * 2 + 1024
MODEL = "openpronounce-0.3.0"
# The word the service judges before it listens (see `warm`).
WARM_UP = Path(__file__).with_name("warm.wav")


class Assessor(Protocol):
    """Anything that can judge a recording of a word."""

    def assess(self, waveform, word: str, parts: int | None, stress: int | None) -> Assessment: ...


class Writer(Protocol):
    """Anything that can write down the words said in a recording."""

    model: str

    def write(self, waveform) -> Written: ...


class OpenPronounceAssessor:
    """The scorer on this machine's processor. Its model is loaded by the first recording."""

    def __init__(self, lock: threading.Lock | None = None) -> None:
        # One recording at a time: the processor is the limit, and two at once only take longer.
        self._lock = lock or threading.Lock()

    def warm(self) -> None:
        """Judge a word, so that no first learner waits for anything a word goes through.

        It is speech, and a word of two parts: quiet has no sounds for the recogniser to find,
        and a word of one part never reaches what measures stress. `warm.wav` is the app's own
        voice saying "hello": a machine's, never a person's.
        """
        self.assess(read_wav(WARM_UP.read_bytes()), "hello", 2, 2)

    def assess(self, waveform, word: str, parts: int | None, stress: int | None) -> Assessment:
        # Imported here: it loads PyTorch, which the service's own tests do not need.
        from .attempt import assess_waveform

        with self._lock:
            return assess_waveform(waveform, word, parts, stress)


def read_wav(recording: bytes, seconds: int = MAX_SECONDS):
    """A WAV as the app sends it, as a waveform: one channel, at the recogniser's rate."""
    import soundfile

    try:
        samples, rate = soundfile.read(io.BytesIO(recording), dtype="float32", always_2d=True)
    except Exception as error:  # noqa: BLE001 - whatever libsndfile makes of something that is no WAV
        raise ValueError("Not a recording that can be read") from error
    if rate != RATE:
        raise ValueError(f"A recording must be at {RATE} Hz")
    if not len(samples) or len(samples) > seconds * RATE:
        raise ValueError(f"A recording must be up to {seconds} seconds long")
    return samples.mean(axis=1)


def create_app(assessor: Assessor, writer: Writer | None = None) -> FastAPI:
    """`writer` is left out where there is no model to write words with: a word is still judged."""
    app = FastAPI(title="Kuhedu scorer", docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "model": MODEL, "words": writer.model if writer else None}

    @app.post("/transcribe")
    async def transcribe(request: Request) -> dict:
        if writer is None:
            raise HTTPException(status_code=503, detail="There is no model to write words with")
        recording = await request.body()
        if len(recording) > words.MAX_SECONDS * RATE * 2 + 1024:
            raise HTTPException(status_code=413, detail="The recording is too large")
        try:
            waveform = read_wav(recording, words.MAX_SECONDS)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        # Off the loop that answers: writing takes a second or two of the processor.
        return (await run_in_threadpool(writer.write, waveform)).to_json()

    @app.post("/assess")
    async def assess(
        request: Request,
        # A word, or a sentence of a lesson.
        word: str = Query(min_length=1, max_length=200),
        parts: str | None = Query(default=None, max_length=120),
        stress: int | None = Query(default=None, ge=1, le=12),
    ) -> dict:
        recording = await request.body()
        if len(recording) > MAX_BYTES:
            raise HTTPException(status_code=413, detail="The recording is too large")
        try:
            waveform = read_wav(recording)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        said_in = count_parts(parts) if parts else None
        # Off the loop that answers: judging takes about half a second of the processor.
        assessment = await run_in_threadpool(assessor.assess, waveform, word.strip(), said_in or None, stress)
        return assessment.to_json()

    return app


def ask_itself(port: int, tries: int = 40) -> None:
    """Send the service its own warm-up word once it is listening.

    The first request a freshly started service answers took five seconds longer than any after
    it, however warm the model (measured): that request is this one, not a learner's.
    """
    import time
    import urllib.error
    import urllib.request

    request = urllib.request.Request(
        f"http://127.0.0.1:{port}/assess?word=hello&parts=hel-lo&stress=2",
        data=WARM_UP.read_bytes(),
        headers={"Content-Type": "audio/wav"},
        method="POST",
    )
    for _ in range(tries):
        try:
            urllib.request.urlopen(request, timeout=60).close()
            return
        except (urllib.error.URLError, OSError):
            # Not listening yet.
            time.sleep(0.25)


def main() -> None:
    import uvicorn

    # One lock for both models: they share the processor.
    busy = threading.Lock()
    assessor = OpenPronounceAssessor(busy)
    # Before it listens: a service that answers "ok" and then keeps its first caller waiting for
    # the model is not ready.
    print("Loading the scorer: this takes up to a minute…", flush=True)
    assessor.warm()

    writer: Writer | None = words.WhisperWriter(lock=busy)
    try:
        # The first time on a machine this fetches the model (0.3 GB for `base.en`).
        writer.write(read_wav(WARM_UP.read_bytes()))
    except Exception as error:  # noqa: BLE001 - no model, no room, no network: a word is still judged
        print(f"No words will be written ({words.MODEL} did not load: {error}).", flush=True)
        writer = None

    # This machine only: the Node server is the way in for everyone else.
    port = int(os.environ.get("SCORER_PORT", "8789"))
    threading.Thread(target=ask_itself, args=(port,), daemon=True).start()
    uvicorn.run(create_app(assessor, writer), host="127.0.0.1", port=port)


if __name__ == "__main__":
    main()
