-- Consultation settings + booking price/duration snapshots.
-- Run manually in Supabase SQL Editor. Do NOT auto-apply from the app.

-- Singleton settings row (id must always be 1)
create table if not exists public.consultation_settings (
  id integer primary key default 1 check (id = 1),
  session_duration_minutes integer not null default 40
    check (session_duration_minutes >= 15 and session_duration_minutes <= 180),
  base_price_usd numeric(10, 2) not null default 50
    check (base_price_usd >= 0),
  discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100),
  updated_at timestamptz not null default now()
);

insert into public.consultation_settings (id, session_duration_minutes, base_price_usd, discount_percent)
values (1, 40, 50, 0)
on conflict (id) do nothing;

alter table public.consultation_settings enable row level security;

-- Snapshot columns on appointments (historical bookings keep their own values)
alter table public.appointments
  add column if not exists session_duration_minutes integer;

alter table public.appointments
  add column if not exists base_price_usd numeric(10, 2);

alter table public.appointments
  add column if not exists discount_percent numeric(5, 2);

alter table public.appointments
  add column if not exists final_price_usd numeric(10, 2);
