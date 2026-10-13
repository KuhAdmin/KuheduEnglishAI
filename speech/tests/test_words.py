import io

import numpy as np
import pytest
import soundfile
from fastapi.testclient import TestClient

from assess.service import create_app
from assess.sounds import RATE
from assess.words import MAX_SECONDS, NOTHING, QUIET, UNSURE, Written, loudest, settled


def wav(seconds: float = 1.0, rate: int = RATE, level: float = 0.1) -> bytes:
    """A recording as the app sends it."""
    samples = np.full((round(seconds * rate), 1), level, dtype=np.float32)
    packed = io.BytesIO()
    soundfile.write(packed, samples, rate, format="WAV", subtype="PCM_16")
    return packed.getvalue()


class FakeWriter:
    """Hears the same sentence in whatever it is given, and remembers how much it was given."""

    model = "a-fake"

    def __init__(self, written: Written = Written("I am fine, thank you.", 0.9)) -> None:
        self.written = written
        self.asked: list[int] = []

    def write(self, waveform) -> Written:
        self.asked.append(len(waveform))
        return self.written


class NoAssessor:
    def assess(self, waveform, word, parts, stress):
        raise AssertionError("A reply is not judged as a word")


@pytest.fixture
def writer() -> FakeWriter:
    return FakeWriter()


@pytest.fixture
def client(writer: FakeWriter) -> TestClient:
    return TestClient(create_app(NoAssessor(), writer))


def test_the_words_said_in_a_recording_go_out_with_how_sure_it_is(client, writer):
    answer = client.post("/transcribe", content=wav(2.5), headers={"Content-Type": "audio/wav"})

    assert answer.status_code == 200
    assert answer.json() == {"text": "I am fine, thank you.", "confidence": 0.9}
    assert writer.asked == [round(2.5 * RATE)]


def test_a_reply_may_be_longer_than_a_word(client, writer):
    # A word is refused after 15 seconds; a turn of a conversation is not.
    assert client.post("/transcribe", content=wav(20)).status_code == 200
    assert writer.asked == [20 * RATE]


@pytest.mark.parametrize(
    ("recording", "status"),
    [
        (b"not a recording at all", 422),
        (b"", 422),
        (wav(1.0, rate=44_100), 422),
        (wav(MAX_SECONDS + 0.5), 413),
    ],
    # Named, or the recording itself becomes the name of its test.
    ids=["not a recording", "nothing", "another rate", "too long"],
)
def test_what_is_not_a_recording_at_the_right_rate_is_refused_unheard(client, writer, recording, status):
    assert client.post("/transcribe", content=recording).status_code == status
    assert writer.asked == []


def test_without_a_model_for_words_it_says_so_and_still_judges_words():
    client = TestClient(create_app(NoAssessor()))

    assert client.post("/transcribe", content=wav()).status_code == 503
    assert client.get("/health").json()["words"] is None


def test_it_says_which_model_writes_the_words(client):
    assert client.get("/health").json()["words"] == "a-fake"


def test_how_loud_a_recording_is_goes_by_its_loudest_moment():
    quiet = np.zeros(2 * RATE, dtype=np.float32)
    # Two seconds of quiet with a fifth of a second of speech-level sound in them.
    spoken = quiet.copy()
    spoken[RATE : RATE + RATE // 5] = 0.2

    assert loudest(quiet) == 0
    assert loudest(spoken) == pytest.approx(0.2, abs=0.01)
    assert loudest(spoken) > QUIET > loudest(quiet + 0.001)
    # Shorter than a tenth of a second, and empty: neither is an error.
    assert loudest(np.full(100, 0.5, dtype=np.float32)) == pytest.approx(0.5)
    assert loudest(np.zeros(0, dtype=np.float32)) == 0


def test_words_it_was_sure_of_are_what_was_heard():
    written = settled("  I am   fine. ", [0.9, 0.8, 0.95])

    assert written.text == "I am fine."
    assert written.confidence == pytest.approx(0.881, abs=0.001)


def test_words_it_was_only_guessing_at_are_not_told_as_what_was_said():
    # What it makes of a room with nobody speaking: a likely phrase, and little faith in it.
    guessed = settled("Thank you.", [0.3, 0.1, 0.2])

    assert guessed.text == ""
    assert guessed.confidence < UNSURE
    # One piece it doubted counts against the rest.
    assert settled("Good morning.", [0.99, 0.99, 0.01]).text == ""


def test_no_words_at_all_is_nothing_heard():
    assert settled("   ", [0.9]) == NOTHING
    assert settled("Hello.", []) == NOTHING
    assert NOTHING.to_json() == {"text": "", "confidence": 0.0}
