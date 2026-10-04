-- Approved additive remediation. Existing payment evidence and sent-email records are preserved.
set lock_timeout = '5s';
set statement_timeout = '60s';

-- Add constraints without replacing legacy definitions or rewriting rows.
alter table public.consultation_settings add constraint consultation_settings_positive_charge
  check (base_price_usd>0 and discount_percent<100 and round(base_price_usd*(1-discount_percent/100),2)>0) not valid;
alter table public.consultation_settings validate constraint consultation_settings_positive_charge;
alter table public.time_slots add constraint time_slots_positive_duration check(end_time>start_time) not valid;
alter table public.time_slots validate constraint time_slots_positive_duration;

create unique index if not exists appointments_payment_reference_unique
  on public.appointments(payment_reference) where payment_reference is not null;

create table public.consultation_email_jobs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id),
  purpose text not null default 'invitation',
  status text not null default 'pending' check (status in ('pending','processing','sent','review','skipped')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  first_attempt_at timestamptz,
  provider_acceptance_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  unique(appointment_id,purpose)
);
alter table public.consultation_email_jobs enable row level security;
revoke all on public.consultation_email_jobs from public, anon, authenticated;
grant select, insert, update on public.consultation_email_jobs to service_role;
create index consultation_email_jobs_due on public.consultation_email_jobs(next_attempt_at)
  where status in ('pending','processing');

-- Every inventory function locks the slot BEFORE the appointment.
create function public.expire_booking_holds() returns integer
language plpgsql security invoker set search_path = '' as $$
declare s record; changed integer; total integer := 0;
begin
  for s in select ts.id from public.time_slots ts
    where exists(select 1 from public.appointments a where a.slot_id=ts.id
      and a.status='pending_payment' and a.payment_status='unpaid' and a.payment_expires_at <= clock_timestamp())
    order by ts.id for update of ts skip locked
  loop
    update public.appointments set status='cancelled',payment_status='failed'
      where slot_id=s.id and status='pending_payment' and payment_status='unpaid'
      and payment_expires_at <= clock_timestamp();
    get diagnostics changed = row_count;
    total := total + changed;
    update public.time_slots set is_booked=exists(select 1 from public.appointments
      where slot_id=s.id and status in ('pending_payment','confirmed','in_progress')) where id=s.id;
  end loop;
  return total;
end $$;

create function public.reserve_booking(p_slot_id uuid,p_date date,p_start_time time,
  p_client_name text,p_client_email text,p_notes text,p_join_token text,p_expected_settings jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare s public.time_slots; a public.appointments; cfg public.consultation_settings; price numeric;
begin
  if length(p_client_name) not between 2 and 80 or length(p_client_email) not between 3 and 120
    or length(coalesce(p_notes,''))>2000 or length(p_join_token) not between 32 and 128 then
    return jsonb_build_object('error','invalid_customer');
  end if;
  select * into cfg from public.consultation_settings where id=1 for share;
  if not found or cfg.base_price_usd<=0 or cfg.discount_percent>=100 then
    return jsonb_build_object('error','pricing_unavailable');
  end if;
  if jsonb_build_object('session_duration_minutes',cfg.session_duration_minutes,
    'base_price_usd',cfg.base_price_usd,'discount_percent',cfg.discount_percent) <> p_expected_settings then
    return jsonb_build_object('error','pricing_changed');
  end if;
  price := round(cfg.base_price_usd * (1-cfg.discount_percent/100),2);
  if price<=0 then return jsonb_build_object('error','pricing_unavailable'); end if;
  select * into s from public.time_slots where id=p_slot_id for update;
  if not found or s.date<>p_date or s.start_time<>p_start_time
    or (s.date+s.start_time) at time zone 'Europe/Istanbul' <= clock_timestamp() then
    return jsonb_build_object('error','invalid_slot');
  end if;
  -- Expire only unpaid holds. Never modify existing confirmed/unpaid bookings.
  update public.appointments set status='cancelled',payment_status='failed'
    where slot_id=s.id and status='pending_payment' and payment_status='unpaid'
    and payment_expires_at<=clock_timestamp();
  if exists(select 1 from public.appointments where slot_id=s.id
    and status in ('pending_payment','confirmed','in_progress')) then
    return jsonb_build_object('error','slot_unavailable');
  end if;
  insert into public.appointments(slot_id,client_name,client_email,notes,join_token,
    status,payment_status,payment_expires_at,session_duration_minutes,base_price_usd,discount_percent,final_price_usd)
    values(s.id,p_client_name,p_client_email,p_notes,p_join_token,'pending_payment','unpaid',
      clock_timestamp()+interval '15 minutes',cfg.session_duration_minutes,cfg.base_price_usd,cfg.discount_percent,price)
    returning * into a;
  update public.time_slots set is_booked=true where id=s.id;
  return jsonb_build_object('appointment',to_jsonb(a)||jsonb_build_object('time_slots',to_jsonb(s)));
end $$;

create function public.cancel_booking(p_appointment_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare sid uuid;
begin
  select slot_id into sid from public.appointments where id=p_appointment_id;
  if sid is null then return false; end if;
  perform 1 from public.time_slots where id=sid for update;
  update public.appointments set status='cancelled',
    payment_status=case when payment_status='paid' then 'paid' else 'failed' end
    where id=p_appointment_id;
  update public.time_slots set is_booked=exists(select 1 from public.appointments
    where slot_id=sid and status in ('pending_payment','confirmed','in_progress')) where id=sid;
  return true;
end $$;

create function public.finalize_wayl_payment(p_reference text,p_expected_price numeric,
  p_expected_iqd bigint,p_environment text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare a public.appointments; sid uuid; was_paid boolean;
begin
  if p_environment not in ('test','live') or p_reference !~ '^wayl_(test|live)_[0-9a-f-]{36}_[0-9]+_[0-9]+$'
    or split_part(p_reference,'_',2)<>p_environment
    or split_part(p_reference,'_',4)::numeric<>p_expected_price*100
    or split_part(p_reference,'_',5)::numeric<>p_expected_iqd or p_expected_iqd<1000 then
    return jsonb_build_object('error','payment_mismatch');
  end if;
  select slot_id into sid from public.appointments where payment_reference=p_reference and payment_provider='wayl';
  if sid is null then return jsonb_build_object('error','reference_not_found'); end if;
  perform 1 from public.time_slots where id=sid for update;
  select * into a from public.appointments where payment_reference=p_reference and payment_provider='wayl' for update;
  if a.final_price_usd is distinct from p_expected_price then return jsonb_build_object('error','payment_mismatch'); end if;
  was_paid := a.payment_status='paid';
  if not was_paid then
    if a.status='pending_payment' and a.payment_expires_at is null then
      return jsonb_build_object('error','invalid_hold');
    end if;
    update public.appointments set payment_status='paid',
      status=case when a.status='pending_payment' then
        case when a.payment_expires_at>clock_timestamp() then 'confirmed' else 'cancelled' end else a.status end
      where id=a.id returning * into a;
    update public.time_slots set is_booked=exists(select 1 from public.appointments
      where slot_id=sid and status in ('pending_payment','confirmed','in_progress')) where id=sid;
    -- Only newly verified payments create jobs. No legacy email backfill.
    if a.status in ('confirmed','in_progress') and a.consultation_email_sent_at is null then
      insert into public.consultation_email_jobs(appointment_id) values(a.id) on conflict do nothing;
    end if;
  end if;
  return jsonb_build_object('id',a.id,'status',a.status,'duplicate',was_paid,'manualReview',a.status='cancelled');
end $$;

create function public.queue_consultation_email(p_appointment_id uuid,p_force boolean default false) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare a public.appointments; jid uuid;
begin
  select * into a from public.appointments where id=p_appointment_id for update;
  if not found or a.payment_status<>'paid' or a.status not in ('confirmed','in_progress') then return null; end if;
  -- Reuse pending jobs, including a pending explicit resend.
  select id into jid from public.consultation_email_jobs where appointment_id=a.id
    and status in ('pending','processing') order by created_at desc limit 1;
  if jid is not null then return jid; end if;
  if not p_force then
    if a.consultation_email_sent_at is not null then return null; end if;
    -- Automatic work must have been atomically enqueued by the payment transaction.
    select id into jid from public.consultation_email_jobs where appointment_id=a.id and purpose='invitation';
    return jid;
  end if;
  insert into public.consultation_email_jobs(appointment_id,purpose)
    values(a.id,'resend-'||gen_random_uuid()::text) returning id into jid;
  return jid;
end $$;

create function public.claim_consultation_email(p_job_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare j public.consultation_email_jobs;
begin
  select * into j from public.consultation_email_jobs where id=p_job_id for update;
  if not found or j.status in ('sent','review','skipped') or j.next_attempt_at>clock_timestamp()
    or (j.status='processing' and j.lease_expires_at>clock_timestamp()) then return null; end if;
  -- Resend's idempotency window is 24 hours. Ambiguous sends outside 23h need a human.
  if j.attempts>=5 or j.first_attempt_at<clock_timestamp()-interval '23 hours' then
    update public.consultation_email_jobs set status='review',last_error_code='EMAIL_RETRY_REQUIRES_REVIEW' where id=j.id;
    return null;
  end if;
  update public.consultation_email_jobs set status='processing',attempts=attempts+1,
    lease_token=gen_random_uuid(),lease_expires_at=clock_timestamp()+interval '2 minutes',
    first_attempt_at=coalesce(first_attempt_at,clock_timestamp())
    where id=j.id returning * into j;
  return to_jsonb(j);
end $$;

create function public.finish_consultation_email(p_job_id uuid,p_lease_token uuid,
  p_provider_id text default null,p_error_code text default null,p_skipped boolean default false)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare j public.consultation_email_jobs;
begin
  -- Keep appointment -> job lock order consistent with queue/finalize.
  select * into j from public.consultation_email_jobs where id=p_job_id;
  if not found then return false; end if;
  perform 1 from public.appointments where id=j.appointment_id for update;
  select * into j from public.consultation_email_jobs where id=p_job_id for update;
  if j.status<>'processing' or j.lease_token is distinct from p_lease_token then return false; end if;
  if p_provider_id is not null then
    update public.consultation_email_jobs set status='sent',provider_acceptance_id=p_provider_id,
      lease_token=null,lease_expires_at=null,last_error_code=null where id=j.id;
    update public.appointments set consultation_email_sent_at=clock_timestamp(),consultation_email_last_error=null
      where id=j.appointment_id;
  elsif p_skipped then
    update public.consultation_email_jobs set status='skipped',lease_token=null,lease_expires_at=null,
      last_error_code='EMAIL_BOOKING_NOT_ELIGIBLE' where id=j.id;
  else
    update public.consultation_email_jobs set status=case when attempts>=5 then 'review' else 'pending' end,
      next_attempt_at=clock_timestamp()+interval '1 minute'*power(2,attempts),
      lease_token=null,lease_expires_at=null,last_error_code='EMAIL_DELIVERY_UNAVAILABLE' where id=j.id;
    update public.appointments set consultation_email_last_error='EMAIL_DELIVERY_UNAVAILABLE' where id=j.appointment_id;
  end if;
  return true;
end $$;


-- Paid session transitions also serialize with cancellation using the slot lock.
create function public.start_paid_consultation(p_appointment_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare sid uuid; updated integer;
begin
  select slot_id into sid from public.appointments where id=p_appointment_id;
  perform 1 from public.time_slots where id=sid for update;
  update public.appointments set status='in_progress',started_at=coalesce(started_at,clock_timestamp())
    where id=p_appointment_id and payment_status='paid' and status in ('confirmed','in_progress');
  get diagnostics updated=row_count;
  return updated=1;
end $$;
create function public.complete_consultation(p_appointment_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare sid uuid; updated integer;
begin
  select slot_id into sid from public.appointments where id=p_appointment_id;
  perform 1 from public.time_slots where id=sid for update;
  update public.appointments set status='completed',ended_at=clock_timestamp()
    where id=p_appointment_id and payment_status='paid' and status in ('confirmed','in_progress');
  get diagnostics updated=row_count;
  update public.time_slots set is_booked=exists(select 1 from public.appointments
    where slot_id=sid and status in ('pending_payment','confirmed','in_progress')) where id=sid;
  return updated=1;
end $$;
revoke all on function public.start_paid_consultation(uuid),public.complete_consultation(uuid) from public,anon,authenticated;
grant execute on function public.start_paid_consultation(uuid),public.complete_consultation(uuid) to service_role;

-- No PUBLIC execution defaults, and no SECURITY DEFINER shortcuts.
revoke all on function public.reserve_booking(uuid,date,time,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.expire_booking_holds() from public,anon,authenticated;
revoke all on function public.cancel_booking(uuid) from public,anon,authenticated;
revoke all on function public.finalize_wayl_payment(text,numeric,bigint,text) from public,anon,authenticated;
revoke all on function public.queue_consultation_email(uuid,boolean) from public,anon,authenticated;
revoke all on function public.claim_consultation_email(uuid) from public,anon,authenticated;
revoke all on function public.finish_consultation_email(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_booking(uuid,date,time,text,text,text,text,jsonb),
 public.expire_booking_holds(),public.cancel_booking(uuid),public.finalize_wayl_payment(text,numeric,bigint,text),
 public.queue_consultation_email(uuid,boolean),public.claim_consultation_email(uuid),
 public.finish_consultation_email(uuid,uuid,text,text,boolean) to service_role;

revoke execute on function public.rls_auto_enable() from public,anon,authenticated;

-- Approved repair; protect active unpaid bookings and every sent-email record.
lock table public.time_slots,public.appointments in share row exclusive mode;
select public.expire_booking_holds();
update public.time_slots s set is_booked=exists(select 1 from public.appointments a
  where a.slot_id=s.id and a.status in ('pending_payment','confirmed','in_progress'))
where not exists(select 1 from public.appointments a where a.slot_id=s.id
  and a.status in ('confirmed','in_progress') and a.payment_status<>'paid')
and s.is_booked is distinct from exists(select 1 from public.appointments a
  where a.slot_id=s.id and a.status in ('pending_payment','confirmed','in_progress'));

update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp']
where id='images';
notify pgrst,'reload schema';
