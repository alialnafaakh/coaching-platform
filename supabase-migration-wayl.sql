-- Run in Supabase SQL Editor if appointments already exist from the Stripe schema.

alter table public.appointments
  alter column stripe_session_id drop not null;

alter table public.appointments
  add column if not exists payment_reference text;

alter table public.appointments
  add column if not exists payment_provider text default 'wayl';

alter table public.appointments
  alter column status type text using status::text;

create unique index if not exists appointments_payment_reference_unique
  on public.appointments (payment_reference)
  where payment_reference is not null;
