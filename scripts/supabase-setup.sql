create table if not exists public.memories (
  id text primary key,
  year text not null,
  month integer not null,
  title text not null,
  date text,
  place text,
  feeling text,
  tags text[] not null default '{}',
  image_url text not null,
  image_path text,
  source text not null default 'user',
  deleted_at text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.memories enable row level security;

drop policy if exists "public read memories" on public.memories;
drop policy if exists "public insert memories" on public.memories;
drop policy if exists "public update memories" on public.memories;
drop policy if exists "public delete memories" on public.memories;

create policy "public read memories" on public.memories for select using (true);
create policy "public insert memories" on public.memories for insert with check (true);
create policy "public update memories" on public.memories for update using (true) with check (true);
create policy "public delete memories" on public.memories for delete using (true);

insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do update set public = true;

drop policy if exists "public read memory images" on storage.objects;
drop policy if exists "public insert memory images" on storage.objects;
drop policy if exists "public update memory images" on storage.objects;
drop policy if exists "public delete memory images" on storage.objects;

create policy "public read memory images" on storage.objects
for select using (bucket_id = 'memories');

create policy "public insert memory images" on storage.objects
for insert with check (bucket_id = 'memories');

create policy "public update memory images" on storage.objects
for update using (bucket_id = 'memories') with check (bucket_id = 'memories');

create policy "public delete memory images" on storage.objects
for delete using (bucket_id = 'memories');
