-- Run this in Supabase SQL Editor to create the required tables

-- ─── time_slots ───────────────────────────────────────────────────────────────
create table if not exists public.time_slots (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  is_booked   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Prevent duplicate slots on the same date + time
create unique index if not exists time_slots_date_start_unique
  on public.time_slots (date, start_time);

-- ─── appointments ─────────────────────────────────────────────────────────────
create type if not exists appointment_status as enum ('pending', 'confirmed', 'cancelled');

create table if not exists public.appointments (
  id                 uuid primary key default gen_random_uuid(),
  slot_id            uuid not null references public.time_slots(id),
  client_name        text not null,
  client_email       text not null,
  notes              text,
  stripe_session_id  text not null unique,
  status             appointment_status not null default 'pending',
  created_at         timestamptz not null default now()
);

-- ─── Row Level Security (RLS) ────────────────────────────────────────────────
-- Enable RLS on both tables
alter table public.time_slots enable row level security;
alter table public.appointments enable row level security;

-- Public: read non-booked slots only
create policy "public_read_available_slots"
  on public.time_slots for select
  using (is_booked = false);

-- Service role bypasses RLS automatically (used by supabaseAdmin in API routes)
-- No additional policy needed for server-side operations
