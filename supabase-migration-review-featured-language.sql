-- =============================================================================
-- FINAL MANUAL MIGRATION: consultation_reviews featured + language
-- =============================================================================
-- Run ONCE in Supabase SQL Editor. Do NOT auto-apply from the app.
--
-- Do NOT also run:
--   supabase-migration-review-featured.sql
--   supabase-migration-review-language.sql
-- Those files are superseded by this combined migration.
--
-- Prerequisites:
--   supabase-migration-consultation-reviews.sql already applied
--   (table public.consultation_reviews exists with RLS enabled, no public policies)
--
-- This migration:
--   - Adds is_featured (boolean NOT NULL DEFAULT false)
--   - Adds language (nullable text; NULL = legacy unclassified)
--   - Constrains non-null language to 'ar' | 'en' only
--   - Clears featured on non-approved rows
--   - Adds useful indexes
--   - Does NOT guess language for existing rows
--   - Does NOT touch appointments / bookings / payments / Daily / email
--   - Does NOT add RLS policies (service-role access only, unchanged)
-- =============================================================================

-- ── 1) Featured flag ─────────────────────────────────────────────────────────
alter table public.consultation_reviews
  add column if not exists is_featured boolean not null default false;

comment on column public.consultation_reviews.is_featured is
  'Admin homepage feature flag. Max 6 featured per language (ar/en) enforced in application code.';

-- Non-approved reviews must never stay featured.
update public.consultation_reviews
set is_featured = false
where moderation_status is distinct from 'approved'
  and is_featured = true;

-- ── 2) Language (nullable for legacy; no guessing) ───────────────────────────
alter table public.consultation_reviews
  add column if not exists language text;

comment on column public.consultation_reviews.language is
  'Site language for this review: ar | en. NULL = legacy unclassified; admin must classify before public display. Never infer from customer name.';

-- Non-null values must be ar or en; NULL remains valid for legacy rows.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'consultation_reviews_language_check'
      and conrelid = 'public.consultation_reviews'::regclass
  ) then
    alter table public.consultation_reviews
      add constraint consultation_reviews_language_check
      check (language is null or language in ('ar', 'en'));
  end if;
end $$;

-- ── 3) Indexes (idempotent; avoid redundant duplicates) ─────────────────────
-- Existing from original table migration (do not recreate):
--   consultation_reviews_moderation_status_idx
--   consultation_reviews_created_at_idx

-- Public approved list / average by language (newest first).
create index if not exists consultation_reviews_approved_lang_created_idx
  on public.consultation_reviews (language, created_at desc)
  where moderation_status = 'approved' and language in ('ar', 'en');

-- Featured count / listing per language (max 6 enforced in app).
create index if not exists consultation_reviews_lang_featured_idx
  on public.consultation_reviews (language)
  where is_featured = true
    and moderation_status = 'approved'
    and language in ('ar', 'en');

-- Admin filter helper when browsing by language (includes NULL unclassified).
create index if not exists consultation_reviews_language_idx
  on public.consultation_reviews (language);

-- ── 4) RLS confirmation (no public policies) ─────────────────────────────────
-- Keep RLS on; do not create SELECT/INSERT/UPDATE/DELETE policies for anon/authenticated.
-- All access remains via server-side service role (bypasses RLS).
alter table public.consultation_reviews enable row level security;

-- =============================================================================
-- OPTIONAL (run ONLY after every legacy row has language set by admin):
--
--   -- Verify first:
--   -- select count(*) from public.consultation_reviews where language is null;
--
--   alter table public.consultation_reviews
--     alter column language set not null;
--
--   alter table public.consultation_reviews
--     drop constraint consultation_reviews_language_check;
--
--   alter table public.consultation_reviews
--     add constraint consultation_reviews_language_check
--     check (language in ('ar', 'en'));
-- =============================================================================
