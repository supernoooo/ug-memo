#!/usr/bin/env python3

import argparse
import json
from pathlib import Path


COLUMNS = [
    "id",
    "year",
    "month",
    "title",
    "date",
    "place",
    "feeling",
    "tags",
    "image_url",
    "image_path",
    "media_type",
    "video_url",
    "video_path",
    "source",
    "deleted_at",
    "created_at",
    "updated_at",
]


def sql_literal(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def clean_row(row):
    tags = row.get("tags") if isinstance(row.get("tags"), list) else []
    return {
        "id": str(row.get("id") or "").strip(),
        "year": str(row.get("year") or "").strip(),
        "month": int(row.get("month") or 1),
        "title": str(row.get("title") or "").strip(),
        "date": row.get("date") or "",
        "place": row.get("place") or "",
        "feeling": row.get("feeling") or "",
        "tags": json.dumps([str(tag).strip() for tag in tags if str(tag).strip()], ensure_ascii=False),
        "image_url": row.get("image_url") or row.get("image") or "",
        "image_path": row.get("image_path") or None,
        "media_type": row.get("media_type") or "image",
        "video_url": row.get("video_url") or None,
        "video_path": row.get("video_path") or None,
        "source": row.get("source") or "user",
        "deleted_at": row.get("deleted_at") or None,
        "created_at": row.get("created_at") or row.get("updated_at") or "",
        "updated_at": row.get("updated_at") or row.get("created_at") or "",
    }


def validate(row):
    missing = [key for key in ("id", "year", "title", "image_url") if not row.get(key)]
    if missing:
        raise ValueError(f"missing {', '.join(missing)} in row {row.get('id')!r}")


def insert_statement(row):
    values = ", ".join(sql_literal(row[column]) for column in COLUMNS)
    updates = ", ".join(f"{column} = excluded.{column}" for column in COLUMNS if column not in {"id", "created_at"})
    return (
        f"insert into memories ({', '.join(COLUMNS)}) values ({values}) "
        f"on conflict(id) do update set {updates};"
    )


def main():
    parser = argparse.ArgumentParser(description="Convert ug-memo restore JSON into Cloudflare D1 SQL.")
    parser.add_argument("input", nargs="?", default="ug-memo-restore-ready.json")
    parser.add_argument("output", nargs="?", default="backups/ug-memo-d1-import.sql")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    rows = json.loads(input_path.read_text(encoding="utf-8"))
    cleaned_rows = [clean_row(row) for row in rows]
    for row in cleaned_rows:
        validate(row)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sql = ["begin transaction;"]
    sql.extend(insert_statement(row) for row in cleaned_rows)
    sql.append("commit;")
    output_path.write_text("\n".join(sql) + "\n", encoding="utf-8")
    print(json.dumps({"input": str(input_path), "output": str(output_path), "rows": len(cleaned_rows)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
