-- New confirmations only: no backfill, row repair, or payment evidence changes.
-- Replace functions in place, preserving invoker mode and existing service-only grants.
set lock_timeout = '5s';
set statement_timeout = '60s';

create or replace function public.finalize_wayl_payment(p_reference text,p_expected_price numeric,
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
    if a.status in ('confirmed','in_progress') then
      insert into public.consultation_email_jobs(appointment_id,purpose)
        values(a.id,'consultant_notification') on conflict do nothing;
    end if;
  end if;
  return jsonb_build_object('id',a.id,'status',a.status,'duplicate',was_paid,'manualReview',a.status='cancelled');
end $$;

create or replace function public.queue_consultation_email(p_appointment_id uuid,p_force boolean default false) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare a public.appointments; jid uuid;
begin
  select * into a from public.appointments where id=p_appointment_id for update;
  if not found or a.payment_status<>'paid' or a.status not in ('confirmed','in_progress') then return null; end if;
  -- Reuse pending jobs, including a pending explicit resend.
  select id into jid from public.consultation_email_jobs where appointment_id=a.id
    and (purpose='invitation' or purpose like 'resend-%')
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

create or replace function public.finish_consultation_email(p_job_id uuid,p_lease_token uuid,
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
      where id=j.appointment_id and (j.purpose='invitation' or j.purpose like 'resend-%');
  elsif p_skipped then
    update public.consultation_email_jobs set status='skipped',lease_token=null,lease_expires_at=null,
      last_error_code='EMAIL_BOOKING_NOT_ELIGIBLE' where id=j.id;
  else
    update public.consultation_email_jobs set status=case when attempts>=5 then 'review' else 'pending' end,
      next_attempt_at=clock_timestamp()+interval '1 minute'*power(2,attempts),
      lease_token=null,lease_expires_at=null,last_error_code='EMAIL_DELIVERY_UNAVAILABLE' where id=j.id;
    update public.appointments set consultation_email_last_error='EMAIL_DELIVERY_UNAVAILABLE' where id=j.appointment_id and (j.purpose='invitation' or j.purpose like 'resend-%');
  end if;
  return true;
end $$;
