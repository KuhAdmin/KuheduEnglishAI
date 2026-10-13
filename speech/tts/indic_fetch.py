"""`python -m tts.indic_fetch bn`: fetches AI4Bharat's Indic-TTS model for a language, once.

A language is one archive of about 1.4 GB on the project's release page. It is kept beside the
code with Kokoro's model (`speech/.models/indic-tts/<language>`, see `indic.py`), never on the
system drive. A download that breaks off is carried on from where it stopped.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

from .indic import FILES, HOME, model_folder

RELEASE = "https://github.com/AI4Bharat/Indic-TTS/releases/download/v1-checkpoints-release"
CHUNK = 1 << 20
TRIES = 30


def download(url: str, to: Path) -> None:
    """The file at an address, carried on from what is already there."""
    part = to.with_name(to.name + ".part")
    for attempt in range(1, TRIES + 1):
        have = part.stat().st_size if part.exists() else 0
        request = urllib.request.Request(url, headers={"Range": f"bytes={have}-"} if have else {})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                # A server that does not carry on sends the whole file again.
                if have and response.status != 206:
                    have = 0
                total = have + int(response.headers.get("Content-Length", 0))
                with part.open("ab" if have else "wb") as file:
                    shown = time.monotonic()
                    while chunk := response.read(CHUNK):
                        file.write(chunk)
                        have += len(chunk)
                        if time.monotonic() - shown > 15:
                            shown = time.monotonic()
                            print(f"  {have / 1e6:7.0f} of {total / 1e6:.0f} MB", flush=True)
            if have >= total:
                part.replace(to)
                return
        except urllib.error.HTTPError as error:
            # Asked to carry on from the end: it is all here.
            if error.code == 416 and have:
                part.replace(to)
                return
            if error.code in (403, 404):
                raise
            print(f"  broke off ({error}); try {attempt} of {TRIES}", flush=True)
        except (OSError, TimeoutError) as error:
            print(f"  broke off ({error}); try {attempt} of {TRIES}", flush=True)
        time.sleep(min(30, 2 * attempt))
    raise SystemExit(f"Could not fetch {url}")


def unpack(archive: Path, language: str) -> None:
    """Only the files the model is made of, wherever in the archive they are."""
    folder = model_folder(language)
    with zipfile.ZipFile(archive) as packed:
        names = packed.namelist()
        for wanted in FILES:
            found = [name for name in names if name.replace("\\", "/").endswith(f"{language}/{wanted}")]
            if len(found) != 1:
                raise SystemExit(f"{archive.name} does not hold {language}/{wanted} once: {found}")
            target = folder / wanted
            target.parent.mkdir(parents=True, exist_ok=True)
            with packed.open(found[0]) as source, target.open("wb") as file:
                while chunk := source.read(CHUNK):
                    file.write(chunk)


def describe(language: str) -> None:
    folder = model_folder(language)
    config = json.loads((folder / "fastpitch" / "config.json").read_text(encoding="utf-8"))
    audio = config.get("audio", {})
    letters = config.get("characters") or {}
    print(f"Model: {config.get('model')}, text cleaner: {config.get('text_cleaner')}")
    print(f"Sample rate {audio.get('sample_rate')}, hop length {audio.get('hop_length')}")
    print(f"Phonemes: {config.get('use_phonemes')}, a blank between letters: {config.get('add_blank')}")
    print(f"Letters: {letters.get('characters')}")
    print(f"Punctuation: {letters.get('punctuations')!r}")
    for file in FILES:
        print(f"  {file:28} {(folder / file).stat().st_size / 1e6:8.1f} MB")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) != 2:
        raise SystemExit("Which language? For example: python -m tts.indic_fetch bn")
    language = sys.argv[1]
    folder = model_folder(language)

    if all((folder / file).exists() for file in FILES):
        print(f"Already here: {folder}")
    else:
        HOME.mkdir(parents=True, exist_ok=True)
        archive = HOME / f"{language}.zip"
        if not archive.exists():
            print(f"Fetching {language}.zip (about 1.4 GB) into {HOME}", flush=True)
            download(f"{RELEASE}/{language}.zip", archive)
        print("Unpacking…", flush=True)
        unpack(archive, language)
        archive.unlink()
        print(f"Kept in {folder}")
    describe(language)


if __name__ == "__main__":
    main()
