-- ANACONDAZ — Supabase schema
-- Run in Supabase SQL editor (Project -> SQL Editor -> New query).

create extension if not exists "pgcrypto";

-- ---------- releases (discography, editable without redeploying) ----------
create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  year text not null,
  spotify_album_id text not null unique,
  featured boolean not null default false,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.releases enable row level security;

create policy "Public read releases"
  on public.releases for select
  using (true);

-- ---------- tour_dates ----------
create table if not exists public.tour_dates (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  city text not null,
  venue text not null,
  ticket_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(event_date, city, venue)
);

alter table public.tour_dates enable row level security;

create policy "Public read tour dates"
  on public.tour_dates for select
  using (true);

-- ---------- booking_requests (write-only from the public site) ----------
create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization text not null,
  city text not null,
  event_date date,
  format text,
  contact text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.booking_requests enable row level security;

-- anon key may insert, but not read — requests are only visible via the
-- Supabase dashboard / a service-role key (e.g. from an admin tool or edge function).
create policy "Public insert booking requests"
  on public.booking_requests for insert
  with check (true);

-- ---------- seed data ----------
insert into public.releases (title, year, spotify_album_id, featured, description, sort_order) values
  ('Ночь с астраханцем', '2025', '6n9pF7yHoOfZD63HRHpdX1', true,
   'Восьмой полноформатный альбом и первый релиз после четырёхлетнего перерыва. Семнадцать треков — самое личное, что группа выпускала за всю историю.', 0),
  ('Перезвони мне +79995771202 (Deluxe)', '2022', '5XZlSaRAFO0ukaPElUinAy', false, null, 1),
  ('Перезвони мне +79995771202', '2021', '29rpiWucaS0UFkGGyPlzjt', false, null, 2),
  ('Синий кит', 'Сингл · 2019', '3ECq39uz37z2DWVqsOkp24', false, null, 3),
  ('Дети и радуга', '2013', '3CtNVI7ufM3ofkJC5XE9Mc', false, null, 4)
on conflict (spotify_album_id) do nothing;

insert into public.tour_dates (event_date, city, venue, ticket_url, sort_order) values
  (current_date + interval '30 days', 'Тбилиси', 'Tbilisi Concert Hall', '#0', 0),
  (current_date + interval '45 days', 'Ереван', 'Mexico Club', '#0', 1),
  (current_date + interval '60 days', 'Берлин', 'Astra Kulturhaus', '#0', 2),
  (current_date + interval '75 days', 'Белград', 'Dom Omladine', '#0', 3)
on conflict (event_date, city, venue) do nothing;
