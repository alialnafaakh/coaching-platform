-- Apply manually before deploying checkout recovery. Never auto-apply to shared data.
-- Private checkout access URLs: do not include these fields in public booking responses.
alter table public.appointments
  add column if not exists payment_checkout_url text;

alter table public.appointments
  add column if not exists payment_checkout_expires_at timestamptz;
