-- Verified post-consultation reviews (manual migration).
-- Run in Supabase SQL Editor. Do NOT auto-apply from the app.

create table if not exists public.consultation_reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint consultation_reviews_appointment_unique unique (appointment_id)
);

create index if not exists consultation_reviews_moderation_status_idx
  on public.consultation_reviews (moderation_status);

create index if not exists consultation_reviews_created_at_idx
  on public.consultation_reviews (created_at desc);

alter table public.consultation_reviews enable row level security;

-- No permissive policies: all access via server-side service role only.
