// Isolated tests: no real env files, network, Supabase or email access.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

function load(file, imports, env, fetch, logger) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(js, {
    exports, process: { env }, Buffer, URL, Uint8Array, AbortSignal, Date,
    console: logger || { error() {}, warn() {} },
    fetch: fetch || (() => { throw new Error('Network forbidden'); }),
    require(name) {
      if (name === 'crypto') return crypto;
      if (name === 'server-only') return {};
      if (name in imports) return imports[name];
      throw new Error('Unmocked import: ' + name);
    },
  }, { filename: file });
  return exports;
}

function setup(overrides = {}, envOverrides = {}) {
  const env = {
    WAYL_ENV: 'test', WAYL_API_TOKEN: 'synthetic-token',
    WAYL_WEBHOOK_SECRET: 'synthetic-test-secret', WAYL_USD_TO_IQD_RATE: '100',
    WAYL_CALLBACK_ORIGIN: 'https://example.test',
    NEXT_PUBLIC_SITE_URL: 'https://example.test', RESEND_API_KEY: 'synthetic-email-key',
    EMAIL_FROM: 'coach@example.test', EMAIL_REPLY_TO: 'coach@example.test', ...envOverrides,
  };
  const state = { requests: [], writes: [], reads: 0, emails: new Set(), reply: 'valid', diagnostics: [] };
  const wayl = load('src/lib/wayl.ts', {}, env, async (url, options) => {
    const body = JSON.parse(options.body);
    state.requests.push({ url, options, body });
    if (state.reply === 'timeout') throw new Error('synthetic-private-detail');
    if (state.reply === 'error') return { status: 400, json: async () => ({ message: 'synthetic-private-detail' }) };
    const data = { referenceId: body.referenceId, total: String(body.total), currency: 'IQD' };
    if (state.reply !== 'no-url') data.url = state.reply === 'evil-url' ? 'https://evil.test/pay/x' : 'https://checkout.thewayl.com/payment/action?id=test-link';
    if (state.reply === 'reference') data.referenceId = 'synthetic-private-detail';
    if (state.reply === 'currency') data.currency = 'USD';
    if (state.reply === 'amount') data.total = '1';
    if (state.reply === 'environment') data.env = env.WAYL_ENV === 'live' ? 'test' : 'live';
    if (state.reply === 'url-type') data.url = {};
    if (state.reply === 'url-malformed') data.url = 'synthetic-private-detail';
    if (state.reply === 'url-path') data.url = 'https://checkout.thewayl.com/unexpected';
    if (state.reply === 'live-query-url') data.url = 'https://checkout.thewayl.com/pay?id=synthetic-link';
    return { status: 201, json: async () => {
      if (state.reply === 'invalid-json') throw new Error('synthetic-private-detail');
      if (state.reply === 'shape') return [];
      if (state.reply === 'data') return { data: [] };
      return { data };
    } };
  }, { warn: code => state.diagnostics.push(code) });
  const quote = wayl.quoteWaylPayment(50, 100, env.WAYL_ENV === 'live' ? 'live' : 'test'); // Synthetic fixture rate, never local configuration.
  state.appointments = [{
    id: '11111111-1111-4111-8111-111111111111', slot_id: '22222222-2222-4222-8222-222222222222', join_token: 'synthetic-join',
    status: 'pending_payment', payment_status: 'unpaid', final_price_usd: 50,
    client_name: 'Test Customer', client_email: 'customer@example.test',
    consultation_email_sent_at: null, consultation_email_last_error: null,
    time_slots: { date: '2026-10-02', start_time: '12:00:00', end_time: '12:40:00' },
    base_price_usd: 100, discount_percent: 50, session_duration_minutes: 40,
    payment_expires_at: new Date(Date.now() + 900000).toISOString(),
    payment_reference: quote.referenceId, payment_provider: 'wayl', ...overrides,
  }];
  state.time_slots = [{ id: '22222222-2222-4222-8222-222222222222', is_booked: true }];
  state.jobs = [];
  const db = { async rpc(name, p = {}) {
    const a = state.appointments[0];
    const write = patch => { Object.assign(a, patch); state.writes.push({ table: 'appointments', patch }); };
    if (name === 'reserve_booking') {
      if (state.time_slots[0].is_booked) return { data: { error: 'slot_unavailable' }, error: null };
      const cfg = state.consultation_settings[0];
      const row = { id: '11111111-1111-4111-8111-111111111111', slot_id: p.p_slot_id,
        client_name: p.p_client_name, client_email: p.p_client_email, notes: p.p_notes,
        join_token: p.p_join_token, status: 'pending_payment', payment_status: 'unpaid',
        payment_reference: null, payment_provider: null, consultation_email_sent_at: null,
        ...p.p_expected_settings, final_price_usd: Math.round(Number(cfg.base_price_usd)*(1-Number(cfg.discount_percent)/100)*100)/100,
        payment_expires_at: new Date(Date.now()+900000).toISOString(),time_slots: {...state.time_slots[0]} };
      state.appointments.push(row); state.time_slots[0].is_booked=true;
      return {data:{appointment:row},error:null};
    }
    if (name === 'expire_booking_holds') {
      state.beforeQuery?.({table:'appointments',patch:{payment_status:'failed'},state});
      if (a?.status==='pending_payment' && a.payment_status==='unpaid' && new Date(a.payment_expires_at)<new Date()) {
        write({status:'cancelled',payment_status:'failed'});state.time_slots[0].is_booked=false;
      }
      return {data:0,error:null};
    }
    if (name === 'finalize_wayl_payment') {
      const duplicate=a.payment_status==='paid';
      if (!duplicate) {
        const status=a.status==='pending_payment' ? (new Date(a.payment_expires_at)>new Date()?'confirmed':'cancelled'):a.status;
        write({payment_status:'paid',status});
        state.time_slots[0].is_booked=state.appointments.some(row=>['pending_payment','confirmed','in_progress'].includes(row.status));
        if (['confirmed','in_progress'].includes(status) && !a.consultation_email_sent_at) state.jobs.push({id:'synthetic-job',appointment_id:a.id,status:'pending'});
      }
      return {data:{id:a.id,status:a.status,duplicate,manualReview:a.status==='cancelled'},error:null};
    }
    if (name === 'queue_consultation_email') return {data:state.jobs[0]?.id || null,error:null};
    if (name === 'claim_consultation_email') {
      const job=state.jobs.find(j=>j.id===p.p_job_id);
      if (!job || job.status!=='pending') return {data:null,error:null};
      job.status='processing';job.lease_token='synthetic-lease';return {data:{...job},error:null};
    }
    if (name === 'finish_consultation_email') {
      const job=state.jobs.find(j=>j.id===p.p_job_id);
      if (p.p_provider_id) {job.status='sent';write({consultation_email_sent_at:new Date().toISOString(),consultation_email_last_error:null});}
      else {job.status=p.p_skipped?'skipped':'pending';if(!p.p_skipped) write({consultation_email_last_error:'EMAIL_DELIVERY_UNAVAILABLE'});}
      return {data:true,error:null};
    }
    throw new Error('Unexpected RPC '+name);
  }, from(table) {
    assert.ok(['appointments', 'time_slots', 'consultation_settings'].includes(table));
    let patch = null, insert = null, single = false, cap = Infinity;
    const filters = [];
    const q = {
      select() { return q; }, update(value) { patch = value; return q; },
      insert(value) { insert = value; return q; }, single() { single = true; return q; },
      eq(k, v) { filters.push(r => r[k] === v); return q; },
      is(k, v) { filters.push(r => r[k] === v); return q; },
      gt(k, v) { filters.push(r => r[k] > v); return q; },
      lt(k, v) { filters.push(r => r[k] < v); return q; },
      in(k, values) { filters.push(r => values.includes(r[k])); return q; },
      not(k, op, v) { assert.equal(op, 'is'); filters.push(r => r[k] !== v); return q; },
      limit(n) { cap = n; return q; },
      maybeSingle() { single = true; return q; },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          if (state.beforeQuery) state.beforeQuery({ table, patch, state });
          if (patch?.payment_checkout_url && state.persistFailure) return { data: null, error: {} };
          if (insert) {
            const row = { id: '11111111-1111-4111-8111-111111111111',
              consultation_email_sent_at: null, consultation_email_last_error: null,
              ...insert, time_slots: { ...state.time_slots[0] } };
            state[table].push(row);
            state.writes.push({ table, patch: { ...insert } });
          }
          const rows = state[table].filter(r => filters.every(f => f(r))).slice(0, cap);
          if (patch) for (const r of rows) {
            state.writes.push({ table, patch: { ...patch } }); Object.assign(r, patch);
          }
          else state.reads++;
          const data = rows.map(r => ({ ...r }));
          return { data: single ? data[0] || null : data, error: null };
        }).then(resolve, reject);
      },
    };
    return q;
  } };
  const bookings = load('src/lib/bookings.ts', {}, env);
  const email = load('src/lib/consultationEmail.ts', {
    resend: { Resend: class {
      emails = { send: async message => {
        assert.equal(state.appointments[0].payment_status, 'paid');
        assert.equal(state.appointments[0].status, 'confirmed');
        state.emailAttempts = (state.emailAttempts || 0) + 1;
        if (state.emailFailure) return { error: { message: 'synthetic send failure' } };
        state.emails.add(message.to);
        state.emailMessages = [...(state.emailMessages || []), message];
        return { data: { id: 'synthetic-acceptance-id' }, error: null };
      } };
    } },
    '@/lib/consultationAccess': { resolveSessionDurationMinutes: appt => appt.session_duration_minutes },
  }, env);
  const security = load('src/lib/serverSecurity.ts', {}, env);
  const imports = {
    '@/lib/serverSecurity': security,
    'next/server': { NextResponse: Response }, '@/lib/wayl': wayl,
    'next-auth': { async getServerSession() { return state.session ?? { role: 'admin' }; } },
    '@/lib/auth': { authOptions: {} },
    '@/lib/bookings': bookings, '@/lib/supabase': { getSupabaseAdmin() { state.dbCalls = (state.dbCalls || 0) + 1; return db; } },
    '@/lib/consultationEmail': email,
  };
  const settings = load('src/lib/consultationSettings.ts', {}, env);
  const createBooking = load('src/app/api/bookings/route.ts', {
    ...imports, '@/lib/consultationSettings': settings,
    '@/lib/consultationAccess': { isIstanbulSlotStartInFuture: () => true },
    '@/lib/rateLimit': { getClientIpFromRequest: () => null,
      enforceBookingIpRateLimit: async () => ({ action: 'allow' }) },
  }, env).POST;
  const checkout = load('src/app/api/payments/checkout/route.ts', imports, env, undefined, { warn: code => state.diagnostics.push(code) }).POST;
  const webhook = load('src/app/api/payments/webhook/route.ts', imports, env).POST;
  const requestCheckout = (token = 'synthetic-join') => checkout(new Request('https://example.test/api/payments/checkout', {
    method: 'POST', body: JSON.stringify({ appointment_id: state.appointments[0].id, token, total: 1 }),
  }));
  const event = (changes = {}, header = 'x-wayl-signature-256', signature) => {
    const body = JSON.stringify({ referenceId: state.appointments[0].payment_reference, paymentStatus: 'Paid', total: 5000, ...changes });
    const signed = signature ?? crypto.createHmac('sha256', env.WAYL_WEBHOOK_SECRET).update(body).digest('hex');
    return webhook(new Request('https://example.test/api/payments/webhook', { method: 'POST', body, headers: header ? { [header]: signed } : {} }));
  };
  const adminConfirm = load('src/app/api/appointments/[id]/confirm/route.ts', imports, env).POST;
  const requestAdminConfirm = () => adminConfirm(new Request('https://example.test'), { params: Promise.resolve({ id: state.appointments[0].id }) });
  return { state, env, wayl, bookings, db, requestCheckout, event, requestAdminConfirm, email, createBooking };
}

test('checkout uses the existing snapshot/hold, official TEST body and returned URL', async () => {
  const s = setup({ payment_reference: null, payment_provider: null });
  const before = { ...s.state.appointments[0] };
  const response = await s.requestCheckout();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).url, 'https://checkout.thewayl.com/payment/action?id=test-link');
  assert.equal(s.state.appointments.length, 1);
  assert.equal(s.state.requests.length, 1);
  const { body, options } = s.state.requests[0];
  assert.equal(body.env, 'test'); assert.equal(body.total, 5000); assert.equal(body.currency, 'IQD');
  assert.deepEqual(body.lineItem, [{ label: 'Maryem coaching session', amount: 5000, type: 'increase' }]);
  assert.equal(body.customParameter, ''); assert.equal(options.redirect, 'error');
  assert.ok(parseInt(body.linkExpiresIn) <= 15);
  const returnUrl = new URL(body.redirectionUrl);
  assert.equal(returnUrl.searchParams.get('id'), before.id);
  assert.equal(returnUrl.searchParams.get('token'), before.join_token);
  for (const k of Object.keys(before).filter(k => !['payment_reference', 'payment_provider'].includes(k))) {
    assert.equal(s.state.appointments[0][k], before[k]);
  }
  assert.deepEqual(s.state.time_slots, [{ id: '22222222-2222-4222-8222-222222222222', is_booked: true }]);
});

test('invalid/missing rate and unsupported mode fail before mutation or network', async () => {
  for (const settings of [{ WAYL_USD_TO_IQD_RATE: undefined }, { WAYL_USD_TO_IQD_RATE: 'bad' },
    { WAYL_USD_TO_IQD_RATE: '0' }, { WAYL_USD_TO_IQD_RATE: '-1' }, { WAYL_ENV: 'sandbox' }, { WAYL_ENV: undefined }]) {
    const s = setup({ payment_reference: null }, settings);
    assert.equal((await s.requestCheckout()).status, 503);
    assert.equal(s.state.requests.length, 0); assert.equal(s.state.writes.length, 0);
  }
});

test('callback origin is trimmed and used for webhook and browser return', async () => {
  const s = setup({ payment_reference: null }, {
    WAYL_CALLBACK_ORIGIN: '  https://callback.example.test \n',
    NEXT_PUBLIC_APP_URL: 'https://ignored.example.test',
  });
  assert.equal((await s.requestCheckout()).status, 200);
  const { body } = s.state.requests[0];
  assert.equal(body.webhookUrl, 'https://callback.example.test/api/payments/webhook');
  assert.equal(new URL(body.redirectionUrl).origin, 'https://callback.example.test');
  assert.equal(body.env, 'test');
});

test('missing or invalid callback origin fails without public URL fallback, mutation or network', async () => {
  for (const origin of [undefined, '', '   ', 'not-a-url', 'http://example.test',
    'https://localhost', 'https://127.0.0.1', 'https://[::1]',
    'https://user:pass@example.test', 'https://example.test/path',
    'https://example.test/?query=1', 'https://example.test/#fragment']) {
    const s = setup({ payment_reference: null }, {
      WAYL_CALLBACK_ORIGIN: origin,
      NEXT_PUBLIC_APP_URL: 'https://example.test',
      NEXT_PUBLIC_SITE_URL: 'https://example.test',
    });
    const response = await s.requestCheckout();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).message, 'Payment callback URL is not configured.');
    assert.equal(s.state.requests.length, 0);
    assert.equal(s.state.writes.length, 0);
  }
});

test('unauthorized, paid, cancelled, expired, invalid snapshot and repeated checkout cannot create links', async () => {
  const badToken = setup({ payment_reference: null });
  assert.equal((await badToken.requestCheckout('wrong')).status, 404);
  assert.equal(badToken.state.requests.length, 0);
  for (const patch of [{ status: 'cancelled' }, { payment_status: 'paid' },
    { payment_expires_at: new Date(0).toISOString() }, { payment_expires_at: null }, { final_price_usd: null }]) {
    const s = setup({ payment_reference: null, ...patch });
    assert.notEqual((await s.requestCheckout()).status, 200);
    assert.equal(s.state.requests.length, 0); assert.equal(s.state.writes.length, 0);
  }
  const s = setup({ payment_reference: null });
  const replies = await Promise.all([s.requestCheckout(), s.requestCheckout()]);
  assert.deepEqual(replies.map(r => r.status).sort(), [200, 409]);
  assert.equal(s.state.requests.length, 1);
});

test('upstream errors/timeouts/invalid URLs are sanitized and retain the claimed reference', async () => {
  for (const reply of ['error', 'timeout', 'invalid-json', 'no-url', 'evil-url']) {
    const s = setup({ payment_reference: null }); s.state.reply = reply;
    const response = await s.requestCheckout();
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('synthetic-private-detail'));
    assert.ok(s.state.appointments[0].payment_reference);
    assert.equal((await s.requestCheckout()).status, 409);
    assert.equal(s.state.requests.length, 1);
  }
});

test('only exact signature header and raw bytes authenticate; invalid signatures perform zero DB access', async () => {
  for (const [header, sig] of [[null, undefined], ['x-wayl-signature', undefined],
    ['x-wayl-signature-256', '0'.repeat(64)], ['x-wayl-signature-256', 'sha256=' + '0'.repeat(64)],
    ['x-wayl-signature-256', 'zz'.repeat(32)]]) {
    const s = setup(); assert.equal((await s.event({}, header, sig)).status, 400);
    assert.equal(s.state.dbCalls || 0, 0); assert.equal(s.state.writes.length, 0);
    assert.equal(s.state.emails.size, 0);
    assert.equal(s.state.appointments[0].status, 'pending_payment');
  }
  const s = setup();
  const bytes = Buffer.from('{ "a": 1 }');
  const signature = crypto.createHmac('sha256', s.env.WAYL_WEBHOOK_SECRET).update(bytes).digest('hex');
  assert.equal(s.wayl.verifyWaylSignature(bytes, signature), true);
  assert.equal(s.wayl.verifyWaylSignature(Buffer.from('{"a":1}'), signature), false);
});

test('verified amount/reference/currency/environment mismatches cannot mutate appointments', async () => {
  for (const patch of [{ total: 4999 }, { total: undefined }, { total: null }, { currency: 'USD' },
    { env: 'live' }, { referenceId: 'unknown', customParameter: '{"slot_id":"slot-1"}' },
    { paymentStatus: 'Paid', status: 'Cancelled' }]) {
    const s = setup(); assert.ok((await s.event(patch)).status >= 400);
    assert.equal(s.state.writes.length, 0); assert.equal(s.state.appointments.length, 1);
  }
});

test('successful payment preserves identity, token, slot and pricing; concurrent duplicates and later failures never downgrade', async () => {
  const s = setup(); const before = { ...s.state.appointments[0] };
  const responses = await Promise.all([s.event(), s.event()]);
  assert.ok(responses.every(r => r.status === 200));
  assert.equal(s.state.appointments[0].payment_status, 'paid');
  assert.equal(s.state.appointments[0].status, 'confirmed');
  assert.equal(s.state.emailAttempts, 1);
  assert.equal(s.state.emails.size, 1);
  assert.equal(s.state.writes.filter(w => w.patch.payment_status === 'paid').length, 1);
  for (const k of Object.keys(before).filter(k => !['status', 'payment_status', 'consultation_email_sent_at', 'consultation_email_last_error'].includes(k))) {
    assert.equal(s.state.appointments[0][k], before[k]);
  }
  assert.equal((await s.event({ paymentStatus: 'Rejected' })).status, 200);
  assert.equal(s.state.appointments[0].payment_status, 'paid');
  assert.equal(s.state.writes.filter(w => w.table === 'time_slots').length, 0);
  assert.equal(s.state.requests.length, 0);
  s.state.appointments[0].status = 'completed';
  assert.equal((await s.event()).status, 200);
  assert.equal(s.state.appointments[0].status, 'completed');
});

test('late payment stays cancelled/paid for review, never rebooks or sends consultation email', async () => {
  const s = setup({ payment_expires_at: new Date(Date.now() - 10000).toISOString() });
  const response = await s.event(); assert.equal(response.status, 200);
  assert.equal((await response.json()).manualReview, true);
  assert.equal(s.state.appointments[0].status, 'cancelled');
  assert.equal(s.state.appointments[0].payment_status, 'paid');
  assert.equal(s.state.time_slots[0].is_booked, false);
  assert.equal(s.state.emails.size, 0);
  assert.equal((await s.event()).status, 200);
  assert.equal(s.state.appointments[0].payment_status, 'paid');
  const rebooked = setup({ status: 'cancelled', payment_status: 'failed' });
  rebooked.state.appointments.push({ id: 'other', slot_id: '22222222-2222-4222-8222-222222222222', status: 'confirmed' });
  assert.equal((await rebooked.event()).status, 200);
  assert.equal(rebooked.state.time_slots[0].is_booked, true);
  assert.equal(rebooked.state.writes.filter(w => w.table === 'time_slots').length, 0);
});

test('expiry cannot downgrade a payment that wins between expiry select and update', async () => {
  const s = setup({ payment_expires_at: new Date(0).toISOString() });
  s.state.beforeQuery = ({ table, patch }) => {
    if (table === 'appointments' && patch?.payment_status === 'failed') {
      s.state.appointments[0].payment_status = 'paid';
      s.state.appointments[0].status = 'confirmed';
      s.state.beforeQuery = null;
    }
  };
  await s.bookings.expireExpiredHolds(s.db);
  assert.equal(s.state.appointments[0].payment_status, 'paid');
  assert.equal(s.state.time_slots[0].is_booked, true);
  assert.equal(s.state.writes.length, 0);
});

test('stored quote survives rate changes but rejects altered appointment pricing', async () => {
  const s = setup(); delete s.env.WAYL_USD_TO_IQD_RATE;
  assert.equal((await s.event()).status, 200);
  const altered = setup({ final_price_usd: 51 });
  assert.equal((await altered.event()).status, 409);
  assert.equal(altered.state.writes.length, 0);
});


test('booking success requires paid database state; pending and cancelled payments never show success', () => {
  const { bookingStatusCopy } = load('src/lib/bookingStatus.ts', {}, {});
  const t = key => key;
  assert.equal(bookingStatusCopy(null, t).tone, 'pending');
  for (const status of ['pending_payment', 'confirmed', 'in_progress', 'completed']) {
    for (const payment_status of ['unpaid', 'failed', 'refunded']) {
      assert.equal(bookingStatusCopy({ status, payment_status }, t).tone, 'pending');
    }
  }
  assert.equal(bookingStatusCopy({ status: 'pending_payment', payment_status: 'paid' }, t).tone, 'pending');
  for (const status of ['confirmed', 'in_progress', 'completed']) {
    assert.equal(bookingStatusCopy({ status, payment_status: 'paid' }, t).tone, 'confirmed');
  }
  assert.equal(bookingStatusCopy({ status: 'cancelled', payment_status: 'paid' }, t).tone, 'cancelled');
});


test('manual approval is disabled even for a paid booking', async () => {
  for (const payment_status of ['unpaid', 'paid']) {
    const s = setup({ payment_status });
    assert.equal((await s.requestAdminConfirm()).status, 410);
    assert.equal(s.state.writes.length, 0);
    assert.equal(s.state.emails.size, 0);
  }
});

test('verified payment sends the existing invitation after confirmation exactly once across retries', async () => {
  const s = setup();
  assert.equal((await s.event()).status, 200);
  assert.equal(s.state.appointments[0].status, 'confirmed');
  assert.equal(s.state.emails.size, 1);
  assert.equal(s.state.emailAttempts, 1);
  assert.ok(s.state.emailMessages[0].text.includes('synthetic-join'));
  assert.ok(s.state.appointments[0].consultation_email_sent_at);
  assert.equal((await s.event()).status, 200);
  assert.equal(s.state.emailAttempts, 1);
});

test('email failure preserves paid confirmation and allows a deduplicated retry', async () => {
  const s = setup(); s.state.emailFailure = true;
  assert.equal((await s.event()).status, 200);
  assert.equal(s.state.appointments[0].status, 'confirmed');
  assert.equal(s.state.appointments[0].payment_status, 'paid');
  assert.equal(s.state.appointments[0].consultation_email_sent_at, null);
  assert.ok(s.state.appointments[0].consultation_email_last_error);
  s.state.emailFailure = false;
  assert.equal((await s.event()).status, 200);
  assert.equal(s.state.emails.size, 1);
  assert.equal(s.state.emailAttempts, 2);
  assert.equal((await s.event()).status, 200);
  assert.equal(s.state.emailAttempts, 2);
});

test('failed payments cannot confirm or email; unpaid admin resend is rejected', async () => {
  for (const paymentStatus of ['Rejected', 'Pending', 'Cancelled']) {
    const s = setup();
    assert.equal((await s.event({ paymentStatus })).status, 200);
    assert.equal(s.state.appointments[0].status, 'pending_payment');
    assert.equal(s.state.appointments[0].payment_status, 'unpaid');
    assert.equal(s.state.emails.size, 0);
  }
  const s = setup({ status: 'confirmed', payment_status: 'unpaid' });
  assert.equal((await s.email.sendConsultationInvitationEmail(s.db, s.state.appointments[0].id, { force: true })).ok, false);
  assert.equal(s.state.emails.size, 0);
  assert.equal(s.state.writes.length, 0);
});


test('first checkout: available slot -> configured-price hold -> TEST link -> signed payment -> confirmation and email', async () => {
  const s = setup();
  s.state.appointments = [];
  s.state.time_slots = [{ id: '22222222-2222-4222-8222-222222222222', is_booked: false, date: '2026-10-02', start_time: '12:00:00', end_time: '12:40:00' }];
  s.state.consultation_settings = [{ id: 1, session_duration_minutes: 40, base_price_usd: '83.50', discount_percent: '20.00' }];
  const submit = () => s.createBooking(new Request('https://example.test/api/bookings', {
    method: 'POST', body: JSON.stringify({ slot_id: '22222222-2222-4222-8222-222222222222', date: '2026-10-02',
      start_time: '12:00:00', client_name: 'Test Customer', client_email: 'customer@example.test' }),
  }));
  const booking = await submit();
  assert.equal(booking.status, 201);
  const { appointment, token } = await booking.json();
  assert.equal(appointment.status, 'pending_payment');
  assert.equal(appointment.payment_status, 'unpaid');
  assert.equal(appointment.final_price_usd, 66.8);
  assert.equal(s.state.appointments[0].payment_reference, null);
  assert.equal(s.state.time_slots[0].is_booked, true);
  assert.equal(s.state.requests.length, 0);
  assert.equal(s.state.emails.size, 0);
  assert.equal((await submit()).status, 409);
  const checkout = await s.requestCheckout(token);
  assert.equal(checkout.status, 200);
  assert.match((await checkout.json()).url, /^https:\/\/checkout.thewayl.com\//);
  assert.equal(s.state.requests.length, 1);
  const body = s.state.requests[0].body;
  assert.equal(body.env, 'test');
  assert.equal(body.total, 6680);
  assert.equal(s.state.appointments[0].status, 'pending_payment');
  assert.equal(s.state.appointments[0].payment_status, 'unpaid');
  assert.equal(s.state.emails.size, 0);
  assert.equal((await s.event({ total: 6680 })).status, 200);
  assert.equal(s.state.appointments[0].status, 'confirmed');
  assert.equal(s.state.appointments[0].payment_status, 'paid');
  assert.equal(s.state.time_slots[0].is_booked, true);
  assert.equal(s.state.emailAttempts, 1);
  assert.ok(s.state.emailMessages[0].text.includes(token));
  assert.equal((await s.event({ total: 6680 })).status, 200);
  assert.equal(s.state.emailAttempts, 1);
  assert.equal(s.state.requests.length, 1);
});


test('lost checkout response is recoverable using persisted URL without creating another link', async () => {
  const s = setup({ payment_reference: null });
  const first = await s.requestCheckout();
  const { url } = await first.json();
  const reference = s.state.appointments[0].payment_reference;
  assert.equal(s.state.appointments[0].payment_checkout_url, url);
  assert.ok(Date.parse(s.state.appointments[0].payment_checkout_expires_at) <= Date.parse(s.state.appointments[0].payment_expires_at));
  const responses = await Promise.all([s.requestCheckout(), s.requestCheckout()]);
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal((await response.json()).url, url);
  }
  assert.equal(s.state.requests.length, 1);
  assert.equal(s.state.appointments[0].payment_reference, reference);
  assert.equal(s.state.appointments[0].payment_status, 'unpaid');
  assert.equal(s.state.appointments[0].status, 'pending_payment');
  assert.equal(s.state.emails.size, 0);
  assert.ok(s.state.diagnostics.includes('CHECKOUT_REUSED'));
  assert.ok(s.state.diagnostics.every(code => /^[A-Z_]+$/.test(code)));
});

test('reuse rejects invalid, expired, mismatched and cross-environment checkout state without another request', async () => {
  for (const patch of [{ payment_checkout_url: 'https://evil.test/pay/x' },
    { payment_checkout_expires_at: new Date(0).toISOString() },
    { payment_checkout_expires_at: new Date(Date.now() + 1800000).toISOString() },
    { payment_provider: 'qicard' }, { final_price_usd: 51 }, { status: 'confirmed', payment_status: 'paid' }]) {
    const s = setup({ payment_reference: null });
    assert.equal((await s.requestCheckout()).status, 200);
    Object.assign(s.state.appointments[0], patch);
    assert.equal((await s.requestCheckout()).status, 409);
    assert.equal(s.state.requests.length, 1);
  }
  const s = setup({ payment_reference: null });
  assert.equal((await s.requestCheckout()).status, 200);
  s.env.WAYL_ENV = 'live';
  assert.equal((await s.requestCheckout()).status, 409);
  assert.equal(s.state.requests.length, 1);
});

test('successful link with failed persistence retains claim and blocks ambiguous retries', async () => {
  const s = setup({ payment_reference: null }); s.state.persistFailure = true;
  assert.equal((await s.requestCheckout()).status, 503);
  assert.ok(s.state.appointments[0].payment_reference);
  assert.equal(s.state.appointments[0].payment_checkout_url, undefined);
  assert.equal((await s.requestCheckout()).status, 409);
  assert.equal(s.state.requests.length, 1);
  assert.ok(s.state.diagnostics.includes('CHECKOUT_PERSIST_FAILED'));
});

test('first-request diagnostics distinguish request, HTTP, JSON and validation failures using codes only', async () => {
  for (const [reply, code] of [['timeout', 'WAYL_CREATE_REQUEST_FAILED'],
    ['error', 'WAYL_CREATE_HTTP_REJECTED'], ['invalid-json', 'WAYL_CREATE_JSON_INVALID'],
    ['no-url', 'WAYL_CREATE_URL_FIELD_INVALID'], ['evil-url', 'WAYL_CREATE_URL_ORIGIN_INVALID'],
    ['shape', 'WAYL_CREATE_RESPONSE_SHAPE_INVALID'], ['data', 'WAYL_CREATE_DATA_OBJECT_INVALID'],
    ['reference', 'WAYL_CREATE_REFERENCE_MISMATCH'], ['currency', 'WAYL_CREATE_CURRENCY_MISMATCH'],
    ['amount', 'WAYL_CREATE_AMOUNT_MISMATCH'], ['environment', 'WAYL_CREATE_ENVIRONMENT_MISMATCH'],
    ['url-type', 'WAYL_CREATE_URL_FIELD_INVALID'], ['url-malformed', 'WAYL_CREATE_URL_MALFORMED'],
    ['url-path', 'WAYL_CREATE_URL_PATH_INVALID']]) {
    const s = setup({ payment_reference: null }, { WAYL_ENV: 'live' }); s.state.reply = reply;
    assert.equal((await s.requestCheckout()).status, 502);
    assert.ok(s.state.diagnostics.includes('WAYL_CREATE_REQUEST_STARTED'));
    assert.ok(s.state.diagnostics.includes(code));
    assert.ok(s.state.diagnostics.every(code => /^[A-Z_]+$/.test(code)));
    assert.equal((await s.requestCheckout()).status, 409);
    assert.equal(s.state.requests.length, 1);
  }
});


test('LIVE checkout, recovery, webhook confirmation and email use configured environment without external access', async () => {
  const s = setup({ payment_reference: null }, { WAYL_ENV: 'live' });
  assert.equal((await s.requestCheckout()).status, 200);
  assert.equal(s.state.requests[0].body.env, 'live');
  assert.match(s.state.appointments[0].payment_reference, /^wayl_live_/);
  assert.equal((await s.requestCheckout()).status, 200);
  assert.equal(s.state.requests.length, 1);
  assert.equal((await s.event({ env: 'test' })).status, 409);
  assert.equal(s.state.appointments[0].payment_status, 'unpaid');
  assert.equal((await s.event({ env: 'live' })).status, 200);
  assert.equal(s.state.appointments[0].status, 'confirmed');
  assert.equal(s.state.appointments[0].payment_status, 'paid');
  assert.equal(s.state.emailAttempts, 1);
  assert.equal((await s.event({ env: 'live' })).status, 200);
  assert.equal(s.state.emailAttempts, 1);
});

test('trusted Wayl checkout paths support query and code formats without permitting unrelated destinations', async () => {
  const s = setup({ payment_reference: null }, { WAYL_ENV: 'live' });
  for (const path of ['/pay?id=synthetic-link', '/en/pay?id=synthetic-link&lang=en',
    '/payment/action?id=synthetic-link', '/pay/SYNTHETIC_CODE']) {
    assert.equal(s.wayl.validWaylCheckoutUrl('https://checkout.thewayl.com' + path), true);
  }
  for (const url of ['http://checkout.thewayl.com/pay?id=synthetic-link',
    'https://evil.test/pay?id=synthetic-link', 'https://checkout.thewayl.com.evil.test/pay?id=synthetic-link',
    'https://user:pass@checkout.thewayl.com/pay?id=synthetic-link',
    'https://checkout.thewayl.com:444/pay?id=synthetic-link',
    'https://checkout.thewayl.com/pay?id=synthetic-link#fragment',
    'https://checkout.thewayl.com/login?id=synthetic-link',
    'https://checkout.thewayl.com/pay', 'https://checkout.thewayl.com/pay?id=',
    'https://checkout.thewayl.com/pay/', 'https://checkout.thewayl.com/pay/code/unrelated',
    'https://checkout.thewayl.com/en/pay/unrelated?id=synthetic-link']) {
    assert.equal(s.wayl.validWaylCheckoutUrl(url), false);
  }
  s.state.reply = 'live-query-url';
  assert.equal((await s.requestCheckout()).status, 200);
  assert.equal((await s.requestCheckout()).status, 200);
  assert.equal(s.state.requests.length, 1);
  assert.ok(s.state.appointments[0].payment_checkout_url);
  assert.equal(s.state.appointments[0].payment_status, 'unpaid');
});

test('LIVE webhook cannot confirm an old TEST reference even when event omits environment', async () => {
  const s = setup(); s.env.WAYL_ENV = 'live';
  assert.equal((await s.event()).status, 409);
  assert.equal(s.state.writes.length, 0);
  assert.equal(s.state.emails.size, 0);
});


test('admin approval endpoint rejects ordinary authenticated sessions', async () => {
  const s=setup(); s.state.session={user:{name:'Ordinary user'},role:'customer'};
  assert.equal((await s.requestAdminConfirm()).status,401);
  assert.equal(s.state.writes.length,0);
});
test('oversized and malformed checkout requests cannot mutate or contact Wayl', async () => {
  const env={}; const security=load('src/lib/serverSecurity.ts',{},env);
  await assert.rejects(security.boundedJson(new Request('https://example.test',{method:'POST',body:'x'.repeat(20000)})));
  await assert.rejects(security.boundedJson(new Request('https://example.test',{method:'POST',body:'[]'})));
});
test('admin role, same-origin writes and cron authorization fail closed', () => {
  const security=load('src/lib/serverSecurity.ts',{}, { CRON_SECRET:'synthetic-secret-'.repeat(3) });
  for(const s of [null,{}, {user:{}}, {role:'customer'}]) assert.equal(security.isAdminSession(s),false);
  assert.equal(security.isAdminSession({role:'admin'}),true);
  for(const headers of [{},{origin:'https://evil.test'},{origin:'https://example.test','sec-fetch-site':'cross-site'}]) {
    assert.equal(security.isSameOrigin(new Request('https://example.test/api',{headers})),false);
  }
  assert.equal(security.isSameOrigin(new Request('https://example.test/api',{headers:{origin:'https://example.test'}})),true);
  assert.equal(security.authorizedCron(new Request('https://example.test/api')),false);
  assert.equal(security.authorizedCron(new Request('https://example.test/api',{headers:{authorization:'Bearer '+'synthetic-secret-'.repeat(3)}})),true);
});

test('invitation origins reject insecure, credential-bearing or non-origin configuration', () => {
  for (const origin of ['http://example.test','https://user:pass@example.test','https://example.test/path','https://example.test/?x=1','https://example.test/#fragment','https://localhost','https://127.0.0.1','https://[::1]']) {
    const s=setup({}, { NEXT_PUBLIC_SITE_URL:origin });
    assert.throws(()=>s.email.getPublicSiteUrl());
  }
  assert.equal(setup({}, { NEXT_PUBLIC_SITE_URL:' https://example.test/ ' }).email.getPublicSiteUrl(),'https://example.test');
});

test('booking prerequisite failures expose only fixed codes and never reserve or contact Wayl', async () => {
  for (const [patch,code] of [[{WAYL_ENV:undefined},'WAYL_ENV_MISSING'],[{WAYL_ENV:'invalid'},'WAYL_ENV_INVALID'],[{WAYL_USD_TO_IQD_RATE:'invalid'},'WAYL_RATE_INVALID'],[{WAYL_API_TOKEN:undefined},'WAYL_CREDENTIALS_UNAVAILABLE'],[{WAYL_CALLBACK_ORIGIN:'invalid'},'WAYL_CALLBACK_INVALID'],[{WAYL_USD_TO_IQD_RATE:'1'},'WAYL_QUOTE_INVALID']]) {
    const s=setup({},patch);
    s.state.consultation_settings=[{id:1,session_duration_minutes:40,base_price_usd:50,discount_percent:0}];
    const response=await s.createBooking(new Request('https://example.test/api/bookings',{method:'POST',body:JSON.stringify({slot_id:'00000000-0000-4000-8000-000000000000',date:'2026-10-05',start_time:'12:00',client_name:'Diagnostic Probe',client_email:'diagnostic@example.invalid'})}));
    assert.equal(response.status,503);assert.equal((await response.json()).error,code);
    assert.equal(s.state.requests.length,0);assert.equal(s.state.writes.length,0);
  }
});
