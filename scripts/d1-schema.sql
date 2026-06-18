create table if not exists memories (
  id text primary key,
  year text not null,
  month integer not null,
  title text not null,
  date text,
  place text,
  feeling text,
  tags text not null default '[]',
  image_url text not null,
  image_path text,
  media_type text not null default 'image',
  video_url text,
  video_path text,
  source text not null default 'user',
  deleted_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists memories_created_at_idx on memories(created_at desc);
create index if not exists memories_year_month_idx on memories(year, month);
create index if not exists memories_deleted_at_idx on memories(deleted_at);
