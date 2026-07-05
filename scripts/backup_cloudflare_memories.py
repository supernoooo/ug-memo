#!/usr/bin/env python3

import datetime as dt
import json
import re
import subprocess
import tarfile
from pathlib import Path
from urllib.parse import unquote, urlparse


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKUP_ROOT = PROJECT_ROOT / "backups"
MEMORIES_ENDPOINT = "https://ug-memo.pages.dev/api/memories"
R2_PUBLIC_BASE_URL = "https://pub-1aca6d58e52442cd974202e263faa11d.r2.dev"


def run_curl(args, output_path=None):
    command = ["curl", "-fsSL", "--max-time", "120", "-A", "Mozilla/5.0", *args]
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        command.extend(["-o", str(output_path)])
        subprocess.run(command, check=True)
        return ""
    return subprocess.check_output(command, text=True)


def safe_segment(value):
    cleaned = re.sub(r'[<>:"\\|?*\x00-\x1f]', "_", str(value or "unnamed"))
    return "_" if re.fullmatch(r"\.+", cleaned) else cleaned


def media_relative_path(url, fallback):
    parsed = urlparse(str(url or ""))
    base = urlparse(R2_PUBLIC_BASE_URL)
    parts = [safe_segment(unquote(part)) for part in parsed.path.split("/") if part]
    if parsed.netloc == base.netloc and parts:
        return Path("media", *parts)
    name = parts[-1] if parts else fallback
    return Path("media", "external", safe_segment(name))


def collect_media_urls(memory):
    items = []
    image_url = memory.get("image_url")
    if image_url:
        items.append(("image_url", image_url))
    video_url = memory.get("video_url")
    if video_url:
        items.append(("video_url", video_url))
    return items


def main():
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = BACKUP_ROOT / f"cloudflare-{stamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)

    memories_path = backup_dir / "memories.json"
    raw = run_curl([MEMORIES_ENDPOINT])
    memories = json.loads(raw)
    memories_path.write_text(json.dumps(memories, ensure_ascii=False, indent=2), encoding="utf-8")

    manifest = []
    failures = []
    for index, memory in enumerate(memories, start=1):
        for field, url in collect_media_urls(memory):
            relative_path = media_relative_path(url, f"{memory.get('id', 'memory')}-{field}")
            target = backup_dir / relative_path
            print(f"[{index}/{len(memories)}] {field} {memory.get('id')} -> {relative_path}", flush=True)
            try:
                run_curl([url], output_path=target)
                manifest.append({
                    "id": memory.get("id"),
                    "title": memory.get("title"),
                    "field": field,
                    "url": url,
                    "path": str(relative_path),
                    "bytes": target.stat().st_size,
                })
            except subprocess.CalledProcessError as error:
                failures.append({
                    "id": memory.get("id"),
                    "title": memory.get("title"),
                    "field": field,
                    "url": url,
                    "error": str(error),
                })

    (backup_dir / "media-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (backup_dir / "failures.json").write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding="utf-8")

    archive_path = backup_dir.with_suffix(".tar.gz")
    with tarfile.open(archive_path, "w:gz") as archive:
        archive.add(backup_dir, arcname=backup_dir.name)

    print(json.dumps({
        "backupDir": str(backup_dir),
        "archive": str(archive_path),
        "memories": len(memories),
        "media": len(manifest),
        "failures": len(failures),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
