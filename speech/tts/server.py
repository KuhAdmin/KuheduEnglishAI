"""The speaking service: a list of voices, and a text said in one of them.

It listens on this machine only. The Node server is what the app talks to; it checks, limits and
keeps what this makes. Nothing said here is kept here.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field, field_validator

from .synth import MODEL_VERSION, Synth
from .voices import VOICES, find_voice

# A sentence or two: what a lesson or the tutor says in one go. The Node server holds the same limit.
MAX_TEXT_LENGTH = 400


class SpeakRequest(BaseModel):
    text: str = Field(max_length=MAX_TEXT_LENGTH)
    voice: str

    @field_validator("text")
    @classmethod
    def something_to_say(cls, text: str) -> str:
        tidy = " ".join(text.split())
        if not tidy:
            raise ValueError("Nothing to say")
        return tidy


def create_app(synth: Synth) -> FastAPI:
    app = FastAPI(title="Kuhedu speech", docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "model": MODEL_VERSION}

    @app.get("/voices")
    def voices() -> dict:
        return {"model": MODEL_VERSION, "voices": [voice.to_json() for voice in VOICES]}

    @app.post("/speak")
    def speak(request: SpeakRequest) -> Response:
        voice = find_voice(request.voice)
        if voice is None:
            raise HTTPException(status_code=404, detail="No such voice")
        try:
            sound = synth.synthesize(request.text, voice)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return Response(content=sound, media_type="audio/mpeg")

    return app
