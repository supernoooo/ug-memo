#!/usr/bin/env python3

import argparse
import base64
import datetime as dt
import hashlib
import hmac
import json
import os
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse, unquote
from urllib.request import Request, urlopen

DEFAULT_R2_ACCOUNT_ID = "128598718da0d76f8893b3836f1785ff"
DEFAULT_R2_BUCKET = "jjn-ug-memo"
SUPABASE_STORAGE_MARKER = "/storage/v1/object/public/"
CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
}


def read_cloud_config():
    source = Path("cloud-config.js").read_text(encoding="utf-8")

    def pick(key):
        match = re.search(rf"{key}:\s*[\"']([^\"']+)[\"']", source)
        return match.group(1) if match else ""

    return {
        "url": pick("url"),
        "publishable_key": pick("publishableKey") or pick("anonKey"),
        "table": pick("table") or "memories",
        "bucket": pick("bucket") or "memories",
    }


def env(name, fallback=""):
    return os.environ.get(name) or fallback


def require_env(name, value):
    if not value:
        raise RuntimeError(f"Missing required env: {name}")
    return value


def request_bytes(url, headers=None, method="GET", body=None, timeout=45):
    request = Request(url, data=body, headers=headers or {}, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.read(), dict(response.headers)
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed: {error.code} {error.reason} {detail}") from error
    except TimeoutError as error:
        raise RuntimeError(f"{method} {url} failed: timed out after {timeout}s") from error
    except URLError as error:
        raise RuntimeError(f"{method} {url} failed: {error.reason}") from error


def request_json(url, headers=None):
    body, _headers = request_bytes(url, headers=headers)
    return json.loads(body.decode("utf-8"))


def encode_storage_path(value):
    return "/".join(quote(part, safe="") for part in str(value).split("/"))


def decode_supabase_storage_path(url, bucket):
    if not url or url.startswith(("data:", "blob:")):
        return ""
    parsed = urlparse(url)
    marker_index = parsed.path.find(SUPABASE_STORAGE_MARKER)
    if marker_index == -1:
        return ""
    after_marker = parsed.path[marker_index + len(SUPABASE_STORAGE_MARKER):]
    prefix = f"{quote(bucket, safe='')}/"
    if not after_marker.startswith(prefix):
        return ""
    return "/".join(unquote(part) for part in after_marker[len(prefix):].split("/"))


def filename_from_url(url, fallback):
    parsed = urlparse(url)
    parts = [part for part in parsed.path.split("/") if part]
    return unquote(parts[-1]) if parts else fallback


def safe_file_name(value, fallback="media"):
    name = str(value or fallback).strip()
    name = re.sub(r"[^\w.\-\u4e00-\u9fa5]+", "-", name, flags=re.UNICODE).strip("-")
    if len(name) > 120:
        stem = Path(name).stem[:96]
        suffix = Path(name).suffix[:16]
        name = f"{stem}{suffix}" if suffix else stem
    return name or fallback


def normalize_base_url(value):
    return str(value or "").rstrip("/")


def public_r2_url(base_url, key):
    return f"{base_url}/{encode_storage_path(key)}"


def is_migratable_url(url, r2_public_base_url):
    if not url or url.startswith(("data:", "blob:")):
        return False
    if r2_public_base_url and str(url).startswith(r2_public_base_url):
        return False
    return str(url).startswith(("http://", "https://"))


def object_key(row, field_name, url, existing_path, supabase_bucket):
    if str(url or "").startswith("data:"):
        content_type, _body = parse_data_url(url)
        extension = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }.get(content_type, ".bin")
        return f"{row['id']}/{field_name}{extension}"
    decoded = existing_path or decode_supabase_storage_path(url, supabase_bucket)
    if decoded:
        return decoded.lstrip("/")
    fallback_name = "video" if field_name == "video_url" else "image"
    stamp = int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)
    return f"{row['id']}/{stamp}-{filename_from_url(url, fallback_name)}"


def flat_object_key(row, field_name, url, existing_path, supabase_bucket, prefix):
    original_key = object_key(row, field_name, url, existing_path, supabase_bucket)
    original_name = Path(original_key).name or filename_from_url(url, field_name)
    file_name = safe_file_name(original_name, field_name)
    row_id = safe_file_name(row.get("id"), "memory")
    return f"{prefix.strip('/')}/{row_id}-{file_name}"


def build_media_items(row, supabase_bucket, r2_public_base_url, r2_prefix="", force=False):
    items = []
    image_url = row.get("image_url")
    image_allowed = str(image_url or "").startswith("data:") or is_migratable_url(image_url, r2_public_base_url)
    if image_allowed and (force or is_migratable_url(image_url, r2_public_base_url) or str(image_url or "").startswith("data:")):
        key = flat_object_key(row, "image_url", row.get("image_url"), row.get("image_path"), supabase_bucket, r2_prefix) if r2_prefix else object_key(row, "image_url", row.get("image_url"), row.get("image_path"), supabase_bucket)
        items.append({
            "url_field": "image_url",
            "path_field": "image_path",
            "old_url": row.get("image_url"),
            "old_path": row.get("image_path") or "",
            "old_object_key": object_key(row, "image_url", row.get("image_url"), row.get("image_path"), supabase_bucket),
            "object_key": key,
        })
    video_url = row.get("video_url")
    video_allowed = is_migratable_url(video_url, r2_public_base_url)
    if video_url and video_allowed and (force or is_migratable_url(video_url, r2_public_base_url)):
        key = flat_object_key(row, "video_url", row.get("video_url"), row.get("video_path"), supabase_bucket, r2_prefix) if r2_prefix else object_key(row, "video_url", row.get("video_url"), row.get("video_path"), supabase_bucket)
        items.append({
            "url_field": "video_url",
            "path_field": "video_path",
            "old_url": row.get("video_url"),
            "old_path": row.get("video_path") or "",
            "old_object_key": object_key(row, "video_url", row.get("video_url"), row.get("video_path"), supabase_bucket),
            "object_key": key,
        })
    return items


def sha256_hex(data):
    return hashlib.sha256(data).hexdigest()


def sign(key, msg):
    if isinstance(key, str):
        key = key.encode("utf-8")
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def signing_key(secret_access_key, date_stamp, region, service):
    date_key = sign(f"AWS4{secret_access_key}", date_stamp)
    region_key = sign(date_key, region)
    service_key = sign(region_key, service)
    return sign(service_key, "aws4_request")


def put_r2_object(endpoint, bucket, access_key_id, secret_access_key, key, body, content_type):
    parsed = urlparse(endpoint)
    region = "auto"
    service = "s3"
    now = dt.datetime.now(dt.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    payload_hash = sha256_hex(body)
    canonical_uri = f"/{bucket}/{encode_storage_path(key)}"
    signed_headers = "content-type;host;x-amz-content-sha256;x-amz-date"
    canonical_headers = (
        f"content-type:{content_type}\n"
        f"host:{parsed.netloc}\n"
        f"x-amz-content-sha256:{payload_hash}\n"
        f"x-amz-date:{amz_date}\n"
    )
    canonical_request = "\n".join([
        "PUT",
        canonical_uri,
        "",
        canonical_headers,
        signed_headers,
        payload_hash,
    ])
    credential_scope = f"{date_stamp}/{region}/{service}/aws4_request"
    string_to_sign = "\n".join([
        "AWS4-HMAC-SHA256",
        amz_date,
        credential_scope,
        sha256_hex(canonical_request.encode("utf-8")),
    ])
    signature = hmac.new(
        signing_key(secret_access_key, date_stamp, region, service),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    authorization = (
        "AWS4-HMAC-SHA256 "
        f"Credential={access_key_id}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature}"
    )
    headers = {
        "Authorization": authorization,
        "Content-Type": content_type,
        "Host": parsed.netloc,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
    }
    request_bytes(f"{endpoint}{canonical_uri}", headers=headers, method="PUT", body=body)


def patch_supabase_row(supabase_url, supabase_key, supabase_write_token, table, row_id, patch):
    patch = {**patch, "updated_at": dt.datetime.now(dt.timezone.utc).isoformat()}
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_write_token}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    url = f"{supabase_url}/rest/v1/{quote(table, safe='')}?id=eq.{quote(str(row_id), safe='')}"
    request_bytes(url, headers=headers, method="PATCH", body=json.dumps(patch).encode("utf-8"))


def safe_segment(value):
    cleaned = re.sub(r'[<>:"\\|?*\x00-\x1f]', "_", str(value or "unnamed"))
    return "_" if re.fullmatch(r"\.+", cleaned) else cleaned


def backup_media_path(backup_dir, object_key):
    parts = [safe_segment(part) for part in str(object_key or "unnamed").split("/") if part]
    return backup_dir.joinpath("media", *parts)


def content_type_from_key(object_key):
    return CONTENT_TYPES.get(Path(str(object_key)).suffix.lower(), "application/octet-stream")


def parse_data_url(url):
    match = re.match(r"^data:([^;,]+)?(;base64)?,(.*)$", str(url or ""), flags=re.DOTALL)
    if not match:
        raise RuntimeError("Invalid data URL")
    content_type = match.group(1) or "application/octet-stream"
    is_base64 = bool(match.group(2))
    payload = match.group(3)
    if is_base64:
        return content_type, base64.b64decode(payload)
    return content_type, unquote(payload).encode("utf-8")


def read_backup_rows(source_backup):
    rows_path = source_backup / "memories-before.json"
    if not rows_path.exists():
        raise RuntimeError(f"Backup rows not found: {rows_path}")
    return json.loads(rows_path.read_text(encoding="utf-8"))


def read_media_source(item, source_backup):
    if str(item["old_url"] or "").startswith("data:"):
        content_type, body = parse_data_url(item["old_url"])
        return body, content_type
    if source_backup:
        media_path = backup_media_path(source_backup, item["old_object_key"])
        if not media_path.exists():
            raise RuntimeError(f"Backed up media not found: {media_path}")
        return media_path.read_bytes(), content_type_from_key(item["old_object_key"])
    body, headers = request_bytes(item["old_url"])
    content_type = headers.get("Content-Type") or headers.get("content-type") or "application/octet-stream"
    return body, content_type


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Back up and migrate Supabase Storage media URLs to Cloudflare R2.")
    parser.add_argument("--backup-only", action="store_true", help="Only export rows and media files; do not upload or update.")
    parser.add_argument("--write", action="store_true", help="Upload to R2 and update Supabase rows.")
    parser.add_argument("--skip-media-backup", action="store_true", help="Skip downloading media into the backup folder.")
    parser.add_argument("--source-backup", default="", help="Read original rows and media from an existing backup directory.")
    parser.add_argument("--r2-prefix", default="images", help="R2 folder prefix for migrated media. Use an empty string for no prefix.")
    parser.add_argument("--limit", type=int, default=0, help="Limit rows for a test run.")
    args = parser.parse_args()

    cloud_config = read_cloud_config()
    supabase_url = env("SUPABASE_URL", cloud_config["url"]).rstrip("/")
    supabase_key = env("SUPABASE_ANON_KEY", cloud_config["publishable_key"])
    supabase_write_token = env("SUPABASE_SERVICE_ROLE_KEY", env("SUPABASE_ACCESS_TOKEN", supabase_key))
    table = env("SUPABASE_TABLE", cloud_config["table"])
    supabase_bucket = env("SUPABASE_STORAGE_BUCKET", cloud_config["bucket"])
    r2_account_id = env("R2_ACCOUNT_ID", DEFAULT_R2_ACCOUNT_ID)
    r2_bucket = env("R2_BUCKET", DEFAULT_R2_BUCKET)
    r2_endpoint = env("R2_ENDPOINT", f"https://{r2_account_id}.r2.cloudflarestorage.com").rstrip("/")
    r2_public_base_url = normalize_base_url(env("R2_PUBLIC_BASE_URL"))
    access_key_id = env("R2_ACCESS_KEY_ID")
    secret_access_key = env("R2_SECRET_ACCESS_KEY")
    backup_dir = Path(env("BACKUP_DIR", f"backups/supabase-r2-{dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"))
    source_backup = Path(args.source_backup) if args.source_backup else None

    if not supabase_url or not supabase_key:
        raise RuntimeError("Supabase URL/key not found. Check cloud-config.js or set SUPABASE_URL and SUPABASE_ANON_KEY.")
    if args.write:
        require_env("R2_PUBLIC_BASE_URL", r2_public_base_url)
        require_env("R2_ACCESS_KEY_ID", access_key_id)
        require_env("R2_SECRET_ACCESS_KEY", secret_access_key)
        if supabase_write_token == supabase_key and not (env("SUPABASE_SERVICE_ROLE_KEY") or env("SUPABASE_ACCESS_TOKEN")):
            raise RuntimeError("Write mode needs SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ACCESS_TOKEN.")

    backup_dir.mkdir(parents=True, exist_ok=True)
    if source_backup:
        rows = read_backup_rows(source_backup)
        if args.limit > 0:
            rows = rows[:args.limit]
    else:
        select_url = f"{supabase_url}/rest/v1/{quote(table, safe='')}?select=*&order=created_at.desc"
        if args.limit > 0:
            select_url += f"&limit={args.limit}"
        rows = request_json(select_url, headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        })

    write_json(backup_dir / "memories-before.json", rows)
    plan = []
    for row in rows:
        media = []
        for item in build_media_items(row, supabase_bucket, r2_public_base_url, args.r2_prefix, force=bool(source_backup)):
            media.append({
                "urlField": item["url_field"],
                "pathField": item["path_field"],
                "oldUrl": item["old_url"],
                "oldPath": item["old_path"],
                "objectKey": item["object_key"],
                "newUrl": public_r2_url(r2_public_base_url, item["object_key"]) if r2_public_base_url else "",
            })
        plan.append({"id": row.get("id"), "title": row.get("title"), "media": media})
    write_json(backup_dir / "migration-plan.json", plan)

    backed_up_media = 0
    uploaded = 0
    updated = 0
    failures = []

    for row_index, row in enumerate(rows, start=1):
        patch = {}
        for item in build_media_items(row, supabase_bucket, r2_public_base_url, args.r2_prefix, force=bool(source_backup)):
            print(f"[{row_index}/{len(rows)}] migrating {item['url_field']} for {row.get('id')} -> {item['object_key']}", flush=True)
            try:
                body, content_type = read_media_source(item, source_backup)
                if not args.skip_media_backup:
                    target = backup_media_path(backup_dir, item["object_key"])
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(body)
                    backed_up_media += 1
                if args.write:
                    put_r2_object(r2_endpoint, r2_bucket, access_key_id, secret_access_key, item["object_key"], body, content_type)
                    uploaded += 1
                    patch[item["url_field"]] = public_r2_url(r2_public_base_url, item["object_key"])
                    patch[item["path_field"]] = item["object_key"]
            except Exception as error:
                failures.append({
                    "id": row.get("id"),
                    "title": row.get("title"),
                    "field": item["url_field"],
                    "oldUrl": item["old_url"],
                    "objectKey": item["object_key"],
                    "error": str(error),
                })
        if args.write and patch:
            try:
                patch_supabase_row(supabase_url, supabase_key, supabase_write_token, table, row.get("id"), patch)
                updated += 1
            except Exception as error:
                failures.append({
                    "id": row.get("id"),
                    "title": row.get("title"),
                    "field": "supabase-row",
                    "error": str(error),
                })

    write_json(backup_dir / "failures.json", failures)
    print(json.dumps({
        "mode": "write" if args.write else "backup/dry-run",
        "backupDir": str(backup_dir),
        "rows": len(rows),
        "plannedMedia": sum(len(item["media"]) for item in plan),
        "backedUpMedia": backed_up_media,
        "uploaded": uploaded,
        "updated": updated,
        "failures": len(failures),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
