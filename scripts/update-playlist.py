#!/usr/bin/env python3

import json
from pathlib import Path

# need to run:
# python3 scripts/update-playlist.py

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MUSIC_DIR = PROJECT_ROOT / "music"
PLAYLIST_PATH = MUSIC_DIR / "playlist.json"
AUDIO_EXTENSIONS = {
    ".aac",
    ".aiff",
    ".alac",
    ".flac",
    ".m4a",
    ".mp3",
    ".ogg",
    ".opus",
    ".wav",
    ".webm",
}


def is_audio_file(path: Path) -> bool:
    return path.is_file() and not path.name.startswith(".") and path.suffix.lower() in AUDIO_EXTENSIONS


def main() -> None:
    tracks = []
    if MUSIC_DIR.exists():
      tracks = [
          path.relative_to(MUSIC_DIR).as_posix()
          for path in MUSIC_DIR.rglob("*")
          if is_audio_file(path)
      ]

    tracks.sort(key=str.casefold)
    PLAYLIST_PATH.write_text(json.dumps(tracks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {PLAYLIST_PATH.relative_to(PROJECT_ROOT)} with {len(tracks)} track(s).")


if __name__ == "__main__":
    main()
