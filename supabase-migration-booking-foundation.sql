-- Phase 1: booking foundation (no payment provider).
-- Run in Supabase SQL Editor before using the new booking flow.

alter table public.appointments
  alter column stripe_session_id drop not null;

alter table public.appointments
  alter column status drop default;

alter table public.appointments
  alter column status type text using status::text;

alter table public.appointments
  add column if not exists payment_provider text;

alter table public.appointments
  add column if not exists payment_reference text;

alter table public.appointments
  add column if not exists payment_status text not null default 'unpaid';

alter table public.appointments
  add column if not exists payment_expires_at timestamptz;

alter table public.appointments
  add column if not exists join_token text;

alter table public.appointments
  add column if not exists room_id text;

alter table public.appointments
  add column if not exists started_at timestamptz;

alter table public.appointments
  add column if not exists ended_at timestamptz;

update public.appointments
  set status = 'pending_payment'
  where status in ('pending', 'pending_qi_payment');

update public.appointments
  set payment_status = 'unpaid'
  where payment_status is null;

alter table public.appointments
  alter column status set default 'pending_payment';

update public.appointments
  set join_token = encode(gen_random_bytes(32), 'hex')
  where join_token is null;

alter table public.appointments
  alter column join_token set not null;

create unique index if not exists appointments_join_token_unique
  on public.appointments (join_token);

-- If two legacy rows still claim the same slot, keep the newest.
with ranked as (
  select id,
    row_number() over (partition by slot_id order by created_at desc) as rn
  from public.appointments
  where status in ('pending_payment', 'confirmed', 'in_progress')
)
update public.appointments a
set status = 'cancelled',
    payment_status = 'failed'
from ranked r
where a.id = r.id
  and r.rn > 1;

-- Only one active reservation may occupy a slot
create unique index if not exists appointments_active_slot_unique
  on public.appointments (slot_id)
  where status in ('pending_payment', 'confirmed', 'in_progress');
