-- Consultation invitation email tracking.
-- Run in Supabase SQL Editor. Do NOT auto-run from the app.

alter table public.appointments
  add column if not exists consultation_email_sent_at timestamptz;

alter table public.appointments
  add column if not exists consultation_email_last_error text;
