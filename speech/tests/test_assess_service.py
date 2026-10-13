import io

import numpy as np
import pytest
import soundfile
from fastapi.testclient import TestClient

from assess.result import Difference, Finding, Heard, Sound, judge
from assess.service import MAX_BYTES, MAX_SECONDS, WARM_UP, create_app, read_wav
from assess.sounds import RATE


def wav(seconds: float = 1.0, rate: int = RATE, channels: int = 1) -> bytes:
    """A recording as the app sends it."""
    samples = np.full((round(seconds * rate), channels), 0.1, dtype=np.float32)
    packed = io.BytesIO()
    soundfile.write(packed, samples, rate, format="WAV", subtype="PCM_16")
    return packed.getvalue()


class FakeAssessor:
    """Hears "Wed-nes-day" in whatever it is given, and remembers what it was asked."""

    def __init__(self) -> None:
        self.asked: list[tuple[int, str, int | None, int | None]] = []

    def assess(self, waveform, word, parts, stress):
        self.asked.append((len(waveform), word, parts, stress))
        heard = Heard([Sound(phone, 0.6, at / 10, at / 10 + 0.1) for at, phone in enumerate("wɛdnɛsdeɪ")])
        return judge(word, heard, parts, stress)


@pytest.fixture
def assessor() -> FakeAssessor:
    return FakeAssessor()


@pytest.fixture
def client(assessor: FakeAssessor) -> TestClient:
    return TestClient(create_app(assessor))


def test_a_recording_is_judged_against_the_word_its_parts_and_its_strong_part(client, assessor):
    answer = client.post(
        "/assess",
        params={"word": " Wednesday ", "parts": "We(d)n(e)s-day", "stress": 1},
        content=wav(1.5),
        headers={"Content-Type": "audio/wav"},
    )

    assert answer.status_code == 200
    # A second and a half of sound, the word tidied, and "We(d)n(e)s-day" counted as two parts.
    assert assessor.asked == [(round(1.5 * RATE), "Wednesday", 2, 1)]
    report = answer.json()
    assert report["findings"][0]["code"] == "extraSyllable"
    assert (report["findings"][0]["expected"], report["findings"][0]["heard"]) == (2, 4)
    assert report["syllablesHeard"] == 4


def test_a_word_alone_is_enough(client, assessor):
    answer = client.post("/assess", params={"word": "hello"}, content=wav())

    assert answer.status_code == 200
    assert assessor.asked == [(RATE, "hello", None, None)]


def test_two_channels_are_heard_as_one():
    assert read_wav(wav(0.5, channels=2)).shape == (RATE // 2,)


def test_a_recording_longer_than_a_word_takes_is_not_read():
    with pytest.raises(ValueError, match="seconds"):
        read_wav(wav(MAX_SECONDS + 0.5))


@pytest.mark.parametrize(
    ("recording", "status"),
    [
        (b"not a recording at all", 422),
        (b"", 422),
        (wav(1.0, rate=44_100), 422),
        # Longer than a word takes is also heavier than a recording may be.
        (wav(MAX_SECONDS + 0.5), 413),
        (b"RIFF" + b"\0" * MAX_BYTES, 413),
    ],
    # Named, or the recording itself becomes the name of its test.
    ids=["not a recording", "nothing", "another rate", "too long", "too large"],
)
def test_what_is_not_a_short_recording_at_the_right_rate_is_refused_unjudged(client, assessor, recording, status):
    assert client.post("/assess", params={"word": "hello"}, content=recording).status_code == status
    assert assessor.asked == []


@pytest.mark.parametrize(
    "params",
    [{}, {"word": ""}, {"word": "x" * 201}, {"word": "hello", "stress": 0}, {"word": "hello", "stress": "two"}],
)
def test_what_was_to_be_said_must_be_said(client, assessor, params):
    assert client.post("/assess", params=params, content=wav()).status_code == 422
    assert assessor.asked == []


def test_the_word_it_warms_up_with_is_a_recording_it_would_take_from_the_app():
    waveform = read_wav(WARM_UP.read_bytes())

    assert 0.5 * RATE < len(waveform) < 3 * RATE
    assert abs(waveform).max() > 0.05


def test_it_says_that_it_is_up(client):
    assert client.get("/health").json()["status"] == "ok"


def test_a_sound_that_differed_in_a_sentence_says_which_word_it_was_in():
    heard = Heard(
        [Sound(phone, 0.9, at / 10, at / 10 + 0.1) for at, phone in enumerate("naɪstəmitju")],
        expected=list("naɪstəmitju"),
        differences=[Difference("i", "ɪ", 0.8, "meet"), Difference("t", "d", 0.6)],
    )

    findings = judge("Nice to meet you.", heard).to_json()["findings"]

    assert findings[0] == {"code": "soundDiffers", "confidence": 0.8, "expected": "i", "heard": "ɪ", "word": "meet"}
    # A sound whose word is not known says nothing of one.
    assert "word" not in findings[1]


def test_a_sentence_is_taken_like_a_word_only_longer(client, assessor):
    sentence = "I am fine, thank you. And you?"

    assert client.post("/assess", params={"word": sentence}, content=wav(3.0)).status_code == 200
    assert assessor.asked == [(3 * RATE, sentence, None, None)]


def test_a_finding_goes_out_as_a_code_and_how_sure_it_is():
    report = judge("hello", Heard([])).to_json()

    assert report["findings"] == [{"code": "nothingHeard", "confidence": 1.0}]
    assert Finding("ok", 1.0).detail == {}
