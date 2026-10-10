-- Run this once in the Supabase SQL editor.
-- The Vercel connection inside Supabase is not required.
-- Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Vercel project settings.

create table if not exists public.desk_settings (
  id integer primary key default 1 check (id = 1),
  volume numeric not null default 0.1,
  days integer not null default 30,
  auto_approve boolean not null default false
);

insert into public.desk_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.identity (
  id integer primary key default 1 check (id = 1),
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  mentor_name text not null default '',
  license_id text not null default '',
  profile_id text not null default ''
);

insert into public.identity (id) values (1) on conflict (id) do nothing;

create table if not exists public.mentors (
  id text primary key,
  name text not null,
  full_name text not null default '',
  display_name text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  instagram text not null default '',
  telegram text not null default '',
  telegram_on boolean not null default false,
  password_hash text not null default '',
  market text not null default '',
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ea_profiles (
  id text primary key,
  name text not null,
  mentor_name text not null default '',
  mentor_id text not null default '',
  symbols text[] not null default '{}',
  picture_url text not null default '',
  media_url text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.license_keys (
  id text primary key,
  code text not null unique,
  label text not null default '',
  name text not null default '',
  email text not null default '',
  term text not null,
  status text not null,
  ea_name text not null default '',
  profile_id text not null default '',
  mentor_id text not null default '',
  picture_url text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id text primary key,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  holder text not null default '',
  plan text not null default '',
  key_id text not null default '',
  days integer not null default 0,
  status text not null,
  created_at timestamptz not null default now()
);

alter table public.desk_settings enable row level security;
alter table public.identity enable row level security;
alter table public.mentors enable row level security;
alter table public.ea_profiles enable row level security;
alter table public.license_keys enable row level security;
alter table public.subscriptions enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['desk_settings', 'identity', 'mentors', 'ea_profiles', 'license_keys', 'subscriptions']
  loop
    execute format('drop policy if exists desk_read on public.%I', tbl);
    execute format('drop policy if exists desk_insert on public.%I', tbl);
    execute format('drop policy if exists desk_update on public.%I', tbl);
    execute format('drop policy if exists desk_delete on public.%I', tbl);
    execute format('create policy desk_read on public.%I for select to anon, authenticated using (true)', tbl);
    execute format('create policy desk_insert on public.%I for insert to anon, authenticated with check (true)', tbl);
    execute format('create policy desk_update on public.%I for update to anon, authenticated using (true) with check (true)', tbl);
    execute format('create policy desk_delete on public.%I for delete to anon, authenticated using (true)', tbl);
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ea-media',
  'ea-media',
  true,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ea_media_read on storage.objects;
drop policy if exists ea_media_insert on storage.objects;
drop policy if exists ea_media_update on storage.objects;
drop policy if exists ea_media_delete on storage.objects;

create policy ea_media_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'ea-media');

create policy ea_media_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'ea-media');

create policy ea_media_update on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'ea-media')
  with check (bucket_id = 'ea-media');

create policy ea_media_delete on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'ea-media');
