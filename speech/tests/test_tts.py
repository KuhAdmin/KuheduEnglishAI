import pytest
from fastapi.testclient import TestClient

from tts.server import MAX_TEXT_LENGTH, create_app
from tts.voices import VOICES, Voice, find_voice


class FakeSynth:
    """Says nothing, and remembers what it was asked to say."""

    def __init__(self) -> None:
        self.asked: list[tuple[str, str]] = []

    def synthesize(self, text: str, voice: Voice) -> bytes:
        if text == "…":
            raise ValueError("Nothing to say in this text")
        self.asked.append((text, voice.id))
        return b"ID3 a sound"


@pytest.fixture
def synth() -> FakeSynth:
    return FakeSynth()


@pytest.fixture
def client(synth: FakeSynth) -> TestClient:
    return TestClient(create_app(synth))


def test_every_one_of_kokoros_own_voices_says_what_it_is_in_its_id():
    own = [voice for voice in VOICES if voice.language != "bn-IN"]

    for voice in own:
        language, gender = voice.id[0], voice.id[1]
        assert {"a": "en-US", "b": "en-GB", "h": "hi-IN"}[language] == voice.language
        assert {"f": "female", "m": "male"}[gender] == voice.gender
        assert voice.name and voice.name[0].isupper() and "_" not in voice.name
        assert voice.speaker == voice.id
    assert len(own) == 17
    assert len({voice.id for voice in VOICES}) == len(VOICES)


def test_each_language_has_one_default_voice_for_each_kind_of_tutor():
    defaults = [(voice.language.split("-")[0], voice.gender) for voice in VOICES if voice.default]

    assert sorted(defaults) == [
        ("bn", "female"),
        ("bn", "male"),
        ("en", "female"),
        ("en", "male"),
        ("hi", "female"),
        ("hi", "male"),
    ]
    # English's are American: the better made of its two accents.
    assert {voice.id for voice in VOICES if voice.default and voice.language == "en-US"} == {
        "af_heart",
        "am_michael",
    }
    assert not any(voice.default for voice in VOICES if voice.language == "en-GB")


def test_british_hindi_and_bengali_voices_are_on_offer_too():
    languages = {voice.language for voice in VOICES}
    assert languages == {"en-US", "en-GB", "hi-IN", "bn-IN"}


def test_bengali_is_said_by_the_hindi_voices_under_ids_of_its_own():
    bengali = [voice for voice in VOICES if voice.language == "bn-IN"]
    hindi = {voice.id: voice for voice in VOICES if voice.language == "hi-IN"}

    assert [voice.id for voice in bengali] == ["bn_alpha", "bn_beta", "bn_omega", "bn_psi"]
    for voice in bengali:
        said_by = hindi[voice.speaker]
        assert (voice.name, voice.gender) == (said_by.name, said_by.gender)
        # Kokoro keeps a speaker with the language it was made for.
        assert voice.lang_code == "h"
    assert [voice.id for voice in bengali if voice.default] == ["bn_alpha", "bn_omega"]
    # What the app is told about a voice does not say whose it is.
    assert "speaker" not in bengali[0].to_json()


def test_the_service_lists_its_voices(client: TestClient):
    answer = client.get("/voices").json()

    assert answer["model"] == "kokoro-82m-v1.0"
    assert answer["voices"][0] == {
        "id": "af_heart",
        "name": "Heart",
        "language": "en-US",
        "gender": "female",
        "default": True,
    }
    assert len(answer["voices"]) == len(VOICES)


def test_a_text_is_said_in_the_voice_asked_for_tidied_of_stray_spaces(client: TestClient, synth: FakeSynth):
    answer = client.post("/speak", json={"text": "  Hello!\n Good   morning. ", "voice": "bf_emma"})

    assert answer.status_code == 200
    assert answer.headers["content-type"] == "audio/mpeg"
    assert answer.content == b"ID3 a sound"
    assert synth.asked == [("Hello! Good morning.", "bf_emma")]


@pytest.mark.parametrize(
    ("body", "status"),
    [
        ({"text": "Hello", "voice": "zz_nobody"}, 404),
        ({"text": "   ", "voice": "af_heart"}, 422),
        ({"text": "x" * (MAX_TEXT_LENGTH + 1), "voice": "af_heart"}, 422),
        ({"voice": "af_heart"}, 422),
        ({"text": "…", "voice": "af_heart"}, 422),
    ],
)
def test_what_cannot_be_said_is_refused_and_nothing_is_made(client: TestClient, synth: FakeSynth, body, status):
    assert client.post("/speak", json=body).status_code == status
    assert synth.asked == []


def test_a_voice_is_found_by_its_id_and_an_unknown_one_is_not():
    assert find_voice("hf_alpha").language == "hi-IN"
    assert find_voice("bn_alpha").language == "bn-IN"
    assert find_voice("af_nicole") is None
