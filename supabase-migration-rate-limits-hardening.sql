-- =============================================================================
-- Rate-limit SECURITY DEFINER hardening (search_path)
-- =============================================================================
-- Apply manually in Supabase SQL Editor AFTER supabase-migration-rate-limits.sql
-- has already been run.
--
-- This migration ONLY replaces the four rate-limit functions to use:
--   SET search_path = ''
-- with fully qualified public.rate_limit_buckets references.
--
-- Does NOT drop/recreate the table.
-- Does NOT delete rate-limit data.
-- Does NOT modify business tables.
-- Does NOT change function signatures or rate-limit semantics.
-- =============================================================================

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_hit_count integer;
  v_window_end timestamptz;
  v_retry_after integer;
begin
  if p_bucket_key is null or length(trim(p_bucket_key)) = 0 then
    raise exception 'bucket_key required';
  end if;
  if p_max_attempts is null or p_max_attempts < 1 then
    raise exception 'max_attempts must be >= 1';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'window_seconds must be >= 1';
  end if;

  insert into public.rate_limit_buckets (bucket_key, window_started_at, hit_count, updated_at)
  values (p_bucket_key, v_now, 0, v_now)
  on conflict (bucket_key) do nothing;

  select window_started_at, hit_count
    into v_window_start, v_hit_count
  from public.rate_limit_buckets
  where bucket_key = p_bucket_key
  for update;

  v_window_end := v_window_start + make_interval(secs => p_window_seconds);

  -- Expired window → reset and count this attempt as 1
  if v_window_end <= v_now then
    update public.rate_limit_buckets
    set
      window_started_at = v_now,
      hit_count = 1,
      updated_at = v_now
    where bucket_key = p_bucket_key;

    return jsonb_build_object(
      'allowed', true,
      'remaining', greatest(p_max_attempts - 1, 0),
      'reset_at', (v_now + make_interval(secs => p_window_seconds)),
      'retry_after_seconds', 0
    );
  end if;

  -- Active window already at/over limit → deny without increment
  if v_hit_count >= p_max_attempts then
    v_retry_after := greatest(0, ceil(extract(epoch from (v_window_end - v_now)))::integer);
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_window_end,
      'retry_after_seconds', v_retry_after
    );
  end if;

  -- Allow and consume one attempt
  update public.rate_limit_buckets
  set
    hit_count = hit_count + 1,
    updated_at = v_now
  where bucket_key = p_bucket_key
  returning hit_count into v_hit_count;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(p_max_attempts - v_hit_count, 0),
    'reset_at', v_window_end,
    'retry_after_seconds', 0
  );
end;
$$;

create or replace function public.peek_rate_limit(
  p_bucket_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_hit_count integer;
  v_window_end timestamptz;
  v_retry_after integer;
begin
  if p_bucket_key is null or length(trim(p_bucket_key)) = 0 then
    raise exception 'bucket_key required';
  end if;
  if p_max_attempts is null or p_max_attempts < 1 then
    raise exception 'max_attempts must be >= 1';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'window_seconds must be >= 1';
  end if;

  select window_started_at, hit_count
    into v_window_start, v_hit_count
  from public.rate_limit_buckets
  where bucket_key = p_bucket_key;

  -- No row or expired window → allowed
  if not found then
    return jsonb_build_object(
      'allowed', true,
      'remaining', p_max_attempts,
      'reset_at', null,
      'retry_after_seconds', 0
    );
  end if;

  v_window_end := v_window_start + make_interval(secs => p_window_seconds);

  if v_window_end <= v_now then
    return jsonb_build_object(
      'allowed', true,
      'remaining', p_max_attempts,
      'reset_at', null,
      'retry_after_seconds', 0
    );
  end if;

  if v_hit_count >= p_max_attempts then
    v_retry_after := greatest(0, ceil(extract(epoch from (v_window_end - v_now)))::integer);
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_window_end,
      'retry_after_seconds', v_retry_after
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(p_max_attempts - v_hit_count, 0),
    'reset_at', v_window_end,
    'retry_after_seconds', 0
  );
end;
$$;

create or replace function public.reset_rate_limit(
  p_bucket_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_bucket_key is null or length(trim(p_bucket_key)) = 0 then
    return;
  end if;
  delete from public.rate_limit_buckets where bucket_key = p_bucket_key;
end;
$$;

create or replace function public.cleanup_expired_rate_limits(
  p_max_age_seconds integer default 86400,
  p_batch_size integer default 500
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_max_age_seconds is null or p_max_age_seconds < 60 then
    p_max_age_seconds := 86400;
  end if;
  if p_batch_size is null or p_batch_size < 1 then
    p_batch_size := 500;
  end if;
  if p_batch_size > 5000 then
    p_batch_size := 5000;
  end if;

  with doomed as (
    select bucket_key
    from public.rate_limit_buckets
    where updated_at < clock_timestamp() - make_interval(secs => p_max_age_seconds)
    order by updated_at asc
    limit p_batch_size
  )
  delete from public.rate_limit_buckets b
  using doomed d
  where b.bucket_key = d.bucket_key;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
