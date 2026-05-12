-- Supabase setup for the memory website.
-- 1. Replace the email in public.is_memory_admin() with your Supabase Auth admin email.
-- 2. Run this file in Supabase SQL Editor after creating the Auth user.

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

create or replace function public.is_memory_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'jianuojiangn@gmail.com'
  );
$$;

grant execute on function public.is_memory_admin() to anon, authenticated;

drop policy if exists "public read memories" on public.memories;
drop policy if exists "public insert memories" on public.memories;
drop policy if exists "public update memories" on public.memories;
drop policy if exists "public delete memories" on public.memories;
drop policy if exists "authenticated admin insert memories" on public.memories;
drop policy if exists "authenticated admin update memories" on public.memories;
drop policy if exists "authenticated admin delete memories" on public.memories;

create policy "public read memories" on public.memories
for select
to anon, authenticated
using (true);

create policy "authenticated admin insert memories" on public.memories
for insert
to authenticated
with check (public.is_memory_admin());

create policy "authenticated admin update memories" on public.memories
for update
to authenticated
using (public.is_memory_admin())
with check (public.is_memory_admin());

create policy "authenticated admin delete memories" on public.memories
for delete
to authenticated
using (public.is_memory_admin());

insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do update set public = true;

drop policy if exists "public read memory images" on storage.objects;
drop policy if exists "public insert memory images" on storage.objects;
drop policy if exists "public update memory images" on storage.objects;
drop policy if exists "public delete memory images" on storage.objects;
drop policy if exists "authenticated admin insert memory images" on storage.objects;
drop policy if exists "authenticated admin update memory images" on storage.objects;
drop policy if exists "authenticated admin delete memory images" on storage.objects;

create policy "public read memory images" on storage.objects
for select
to anon, authenticated
using (bucket_id = 'memories');

create policy "authenticated admin insert memory images" on storage.objects
for insert
to authenticated
with check (bucket_id = 'memories' and public.is_memory_admin());

create policy "authenticated admin update memory images" on storage.objects
for update
to authenticated
using (bucket_id = 'memories' and public.is_memory_admin())
with check (bucket_id = 'memories' and public.is_memory_admin());

create policy "authenticated admin delete memory images" on storage.objects
for delete
to authenticated
using (bucket_id = 'memories' and public.is_memory_admin());
