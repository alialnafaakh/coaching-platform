// Isolated tests: no real env files, network, Supabase or email access.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

function load(file, imports, env, fetch) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(js, {
    exports, process: { env }, Buffer, URL, Uint8Array, AbortSignal, Date,
    console: { error() {} },
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
  const state = { requests: [], writes: [], reads: 0, emails: new Set(), reply: 'valid' };
  const wayl = load('src/lib/wayl.ts', {}, env, async (url, options) => {
    const body = JSON.parse(options.body);
    state.requests.push({ url, options, body });
    if (state.reply === 'timeout') throw new Error('synthetic-private-detail');
    if (state.reply === 'error') return { status: 400, json: async () => ({ message: 'synthetic-private-detail' }) };
    const data = { referenceId: body.referenceId, total: String(body.total), currency: 'IQD' };
    if (state.reply !== 'no-url') data.url = state.reply === 'evil-url' ? 'https://evil.test/pay/x' : 'https://checkout.thewayl.com/payment/action?id=test-link';
    return { status: 201, json: async () => ({ data }) };
  });
  const quote = wayl.quoteWaylPayment(50, 100); // Synthetic fixture rate, never local configuration.
  state.appointments = [{
    id: '11111111-1111-4111-8111-111111111111', slot_id: 'slot-1', join_token: 'synthetic-join',
    status: 'pending_payment', payment_status: 'unpaid', final_price_usd: 50,
    client_name: 'Test Customer', client_email: 'customer@example.test',
    consultation_email_sent_at: null, consultation_email_last_error: null,
    time_slots: { date: '2026-10-02', start_time: '12:00:00', end_time: '12:40:00' },
    base_price_usd: 100, discount_percent: 50, session_duration_minutes: 40,
    payment_expires_at: new Date(Date.now() + 900000).toISOString(),
    payment_reference: quote.referenceId, payment_provider: 'wayl', ...overrides,
  }];
  state.time_slots = [{ id: 'slot-1', is_booked: true }];
  const db = { from(table) {
    assert.ok(['appointments', 'time_slots'].includes(table));
    let patch = null, single = false, cap = Infinity;
    const filters = [];
    const q = {
      select() { return q; }, update(value) { patch = value; return q; },
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
        return { error: null };
      } };
    } },
    '@/lib/consultationAccess': { resolveSessionDurationMinutes: appt => appt.session_duration_minutes },
  }, env);
  const imports = {
    'next/server': { NextResponse: Response }, '@/lib/wayl': wayl,
    'next-auth': { async getServerSession() { return { role: 'admin' }; } },
    '@/lib/auth': { authOptions: {} },
    '@/lib/bookings': bookings, '@/lib/supabase': { getSupabaseAdmin() { state.dbCalls = (state.dbCalls || 0) + 1; return db; } },
    '@/lib/consultationEmail': email,
  };
  const checkout = load('src/app/api/payments/checkout/route.ts', imports, env).POST;
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
  return { state, env, wayl, bookings, db, requestCheckout, event, requestAdminConfirm, email };
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
  assert.deepEqual(s.state.time_slots, [{ id: 'slot-1', is_booked: true }]);
});

test('invalid/missing rate and live mode fail before mutation or network', async () => {
  for (const settings of [{ WAYL_USD_TO_IQD_RATE: undefined }, { WAYL_USD_TO_IQD_RATE: 'bad' },
    { WAYL_USD_TO_IQD_RATE: '0' }, { WAYL_USD_TO_IQD_RATE: '-1' }, { WAYL_ENV: 'live' }]) {
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
  for (const reply of ['error', 'timeout', 'no-url', 'evil-url']) {
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
  rebooked.state.appointments.push({ id: 'other', slot_id: 'slot-1', status: 'confirmed' });
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
