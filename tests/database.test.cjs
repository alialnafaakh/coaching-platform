const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

const migration = fs.readFileSync('supabase/migrations/20261004071138_production_reconciliation.sql', 'utf8');
const schema = `
create role anon; create role authenticated; create role service_role bypassrls;
create schema storage;
create table storage.buckets(id text primary key,file_size_limit bigint,allowed_mime_types text[]);
insert into storage.buckets values('images',null,null);
create function public.rls_auto_enable() returns event_trigger language plpgsql as $$ begin return; end $$;
create table public.time_slots(id uuid primary key default gen_random_uuid(),date date not null,start_time time not null,end_time time not null,is_booked boolean not null default false);
create table public.consultation_settings(id integer primary key,session_duration_minutes integer,base_price_usd numeric,discount_percent numeric);
insert into public.consultation_settings values(1,40,50,0);
create table public.appointments(id uuid primary key default gen_random_uuid(),slot_id uuid not null references public.time_slots,
 client_name text,client_email text,notes text,join_token text unique, status text not null default 'pending_payment',
 payment_status text not null default 'unpaid',payment_expires_at timestamptz,payment_provider text,payment_reference text,
 session_duration_minutes integer,base_price_usd numeric,discount_percent numeric,final_price_usd numeric,
 consultation_email_sent_at timestamptz,consultation_email_last_error text,started_at timestamptz,ended_at timestamptz);
create unique index active_slot on public.appointments(slot_id) where status in ('pending_payment','confirmed','in_progress');
grant usage on schema public to service_role;
grant all on public.appointments,public.time_slots,public.consultation_settings to service_role;
`;

async function setup() {
  const db = new PGlite();
  await db.exec(schema);
  await db.transaction(async tx => { await tx.exec(migration); });
  return db;
}
async function scalar(db, sql, args=[]) { return (await db.query(sql,args)).rows[0].result; }
async function slot(db) { return scalar(db,"insert into time_slots(date,start_time,end_time) values(current_date+10,'12:00','12:40') returning id as result"); }
async function reserve(db,id,token='x'.repeat(40)) {
  return scalar(db,`select reserve_booking($1,current_date+10,'12:00','Synthetic Customer','synthetic@example.test',null,$2,
    '{"session_duration_minutes":40,"base_price_usd":50,"discount_percent":0}') as result`,[id,token]);
}
async function attach(db,id) {
  const ref='wayl_live_11111111-1111-4111-8111-111111111111_5000_65000';
  await db.query("update appointments set payment_provider='wayl',payment_reference=$1 where id=$2",[ref,id]);
  return ref;
}
const paid = (db,ref) => scalar(db,"select finalize_wayl_payment($1,50,65000,'live') as result",[ref]);

test('SQL migration installs with private invoker functions and unique payment references', async () => {
  const db=await setup();
  try {
    const f=await db.query("select proname,prosecdef,has_function_privilege('anon',oid,'execute') as anon from pg_proc where proname in ('reserve_booking','finalize_wayl_payment','claim_consultation_email')");
    assert.equal(f.rows.length,3); assert.ok(f.rows.every(x=>!x.prosecdef&&!x.anon));
    assert.equal(await scalar(db,"select relrowsecurity as result from pg_class where relname='consultation_email_jobs'"),true);
    assert.equal(await scalar(db,"select has_table_privilege('anon','consultation_email_jobs','select') as result"),false);
    assert.equal(await scalar(db,"select count(*)::int as result from pg_indexes where indexname='appointments_payment_reference_unique'"),1);
  } finally { await db.close(); }
});

test('reservation is exclusive, pricing is authoritative, and insert failure rolls back slot mutation', async () => {
  const db=await setup();
  try {
    const id=await slot(db);
    const results=await Promise.all([reserve(db,id),reserve(db,id,'y'.repeat(40))]);
    assert.equal(results.filter(x=>x.appointment).length,1);
    assert.equal(results.filter(x=>x.error==='slot_unavailable').length,1);
    const id2=await slot(db);
    await assert.rejects(reserve(db,id2)); // duplicate token -> entire transaction rolls back
    assert.equal(await scalar(db,'select is_booked as result from time_slots where id=$1',[id2]),false);
    await assert.rejects(db.exec('update consultation_settings set base_price_usd=0'));
    await assert.rejects(db.exec('update consultation_settings set discount_percent=100'));
    assert.equal(await scalar(db,'select is_booked as result from time_slots where id=$1',[id2]),false);
  } finally { await db.close(); }
});

test('verified transition queues once, paid cancellation preserves evidence, late payments never rebook', async () => {
  const db=await setup();
  try {
    const id=await slot(db), a=(await reserve(db,id)).appointment, ref=await attach(db,a.id);
    assert.equal((await scalar(db,"select finalize_wayl_payment($1,51,65000,'live') as result",[ref])).error,'payment_mismatch');
    const first=await paid(db,ref); assert.equal(first.status,'confirmed');
    assert.equal((await paid(db,ref)).duplicate,true);
    assert.equal(await scalar(db,'select count(*)::int as result from consultation_email_jobs'),1);
    await scalar(db,'select cancel_booking($1) as result',[a.id]);
    assert.equal(await scalar(db,'select payment_status as result from appointments where id=$1',[a.id]),'paid');
    assert.equal((await paid(db,ref)).manualReview,true);
    const id2=await slot(db), b=(await reserve(db,id2,'z'.repeat(40))).appointment;
    const late=ref.replace('11111111','22222222');
    await db.query("update appointments set payment_expires_at=now()-interval '1 minute',payment_provider='wayl',payment_reference=$1 where id=$2",[late,b.id]);
    assert.equal((await paid(db,late)).status,'cancelled');
    assert.equal(await scalar(db,'select is_booked as result from time_slots where id=$1',[id2]),false);
    assert.equal(await scalar(db,'select count(*)::int as result from consultation_email_jobs'),1);
  } finally { await db.close(); }
});

test('email leases recover interruptions and require review outside provider deduplication window', async () => {
  const db=await setup();
  try {
    const a=(await reserve(db,await slot(db))).appointment;
    await paid(db,await attach(db,a.id));
    const jid=await scalar(db,'select id as result from consultation_email_jobs');
    const claims=await Promise.all([scalar(db,'select claim_consultation_email($1) as result',[jid]),scalar(db,'select claim_consultation_email($1) as result',[jid])]);
    assert.equal(claims.filter(Boolean).length,1);
    assert.equal(await scalar(db,'select consultation_email_sent_at as result from appointments where id=$1',[a.id]),null);
    const old=claims.find(Boolean);
    await db.exec("update consultation_email_jobs set lease_expires_at=now()-interval '1 minute'");
    const fresh=await scalar(db,'select claim_consultation_email($1) as result',[jid]);
    assert.notEqual(fresh.lease_token,old.lease_token);
    assert.equal(await scalar(db,"select finish_consultation_email($1,$2,'accepted') as result",[jid,old.lease_token]),false);
    assert.equal(await scalar(db,"select finish_consultation_email($1,$2,'accepted') as result",[jid,fresh.lease_token]),true);
    assert.ok(await scalar(db,'select consultation_email_sent_at as result from appointments where id=$1',[a.id]));
    assert.equal(await scalar(db,'select claim_consultation_email($1) as result',[jid]),null);
    const resend=await scalar(db,'select queue_consultation_email($1,true) as result',[a.id]);
    await scalar(db,'select claim_consultation_email($1) as result',[resend]);
    await db.query("update consultation_email_jobs set lease_expires_at=now()-interval '1 minute', first_attempt_at=now()-interval '24 hours' where id=$1",[resend]);
    assert.equal(await scalar(db,'select claim_consultation_email($1) as result',[resend]),null);
    assert.equal(await scalar(db,'select status as result from consultation_email_jobs where id=$1',[resend]),'review');
  } finally { await db.close(); }
});

test('expiry and session gates never alter or admit an active unpaid legacy booking', async () => {
  const db=await setup();
  try {
    const a=(await reserve(db,await slot(db))).appointment;
    await db.query("update appointments set status='confirmed' where id=$1",[a.id]);
    const before=await scalar(db,'select to_jsonb(a) as result from appointments a where id=$1',[a.id]);
    await scalar(db,'select expire_booking_holds() as result');
    assert.equal(await scalar(db,'select start_paid_consultation($1) as result',[a.id]),false);
    assert.equal(await scalar(db,'select complete_consultation($1) as result',[a.id]),false);
    assert.deepEqual(await scalar(db,'select to_jsonb(a) as result from appointments a where id=$1',[a.id]),before);
  } finally { await db.close(); }
});
