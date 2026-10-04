# Wayl payment integration

This implementation uses the [official create-link schema](https://api.thewayl.com/openapi.v1.json)
and [webhook guide](https://wayl.io/docs). It accepts only explicitly configured `WAYL_ENV=test` or `WAYL_ENV=live`;
missing or unsupported values fail closed.

Configure these server variables manually; keep all secret values out of source control:

- `WAYL_API_TOKEN`: merchant token sent only from the server.
- `WAYL_WEBHOOK_SECRET`: the same 10–255 character secret used for signing webhook bodies.
- `WAYL_ENV`: `live` for production payments, or `test` for isolated testing. No default.
- `WAYL_USD_TO_IQD_RATE`: a positive decimal conversion rate selected by the merchant. No default is supplied.
- `WAYL_CALLBACK_ORIGIN`: server-only public HTTPS origin of the **selected deployment**, where the callback can reach `/api/payments/webhook`. Leading/trailing whitespace is trimmed; paths, query strings, fragments, credentials and localhost are rejected. This origin also supplies the browser return URL. There is no fallback to `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL`.

Keep test and live deployments/credentials isolated. Existing NextAuth, Supabase,
Daily and Resend configuration is unchanged.

## Vercel production configuration

- Verify the existing Production `WAYL_ENV=live`; do not recreate it based on an incomplete connector view.
- Bind `WAYL_API_TOKEN` to the merchant credential authorized for live link creation.
  If the existing merchant token supports both modes, it need not be replaced.
- Configure `WAYL_WEBHOOK_SECRET` for the live integration; use the same secret for
  link creation and webhook verification. Its value is never published or logged.
- Verify `WAYL_USD_TO_IQD_RATE` is the merchant's intended positive production rate.
- Keep `WAYL_CALLBACK_ORIGIN=https://biopsychosocial.site`. The webhook stays at
  `/api/payments/webhook`, and the browser return remains `/booking-confirmed`.

The API base and authentication header remain `https://api.thewayl.com/api/v1`
and `X-WAYL-AUTHENTICATION`; no separate endpoint or new secret variable is introduced.
Existing TEST references remain stored but cannot be reused or confirmed in LIVE mode.
Finish or reconcile outstanding test holds before switching modes. Never clear their
references or convert them to live references. No new migration is required for mode
support; checkout recovery still requires its existing URL/expiry migration.

## Booking and checkout

`POST /api/bookings` remains the only booking creation path. Its atomic slot reservation,
15-minute hold, join token and pricing snapshot are retained. The frontend submits the
resulting appointment ID and token to `POST /api/payments/checkout`.

Checkout validates the existing hold and derives the amount from `final_price_usd`.
USD cents multiplied by the configured rate are rounded to the nearest whole IQD;
Wayl's minimum total of 1000 IQD is enforced. Missing/invalid configuration fails
before reference mutation or a Wayl request.

An atomic conditional update claims one unique reference per appointment. The reference
format is `wayl_<test|live>_<random UUID>_<USD cents>_<IQD total>`. Persisting this quote in
the existing `payment_reference` column avoids a migration and prevents later rate
changes from invalidating an earlier payment. A webhook must match that exact stored
reference and the appointment's USD snapshot. Its embedded environment must match
`WAYL_ENV`, including when the webhook omits its optional environment field.

Only Wayl's `data.url` is accepted, with an HTTPS Wayl checkout origin and recognized
checkout path. No URL is synthesized from a code. Requests use the configured `WAYL_ENV`, `lineItem`,
IQD, the signed webhook callback, and a return URL containing appointment ID and token.
The link expiry is rounded down to the remaining whole minutes of the booking hold.

Duplicate/concurrent checkout attempts cannot issue another link. A validated successful
checkout URL and conservative expiry are saved before the response. Authorized retries
reuse that URL only while the unpaid hold and link are valid, the provider/reference
match, and the reference environment matches the configured mode. On an API error,
timeout, or invalid response, the reference stays attached because Wayl may already
have created the link. Contact support for reconciliation instead of clearing the
reference and risking a second charge. The hold retains its original expiry.

## Webhook and browser return

Only `x-wayl-signature-256` is accepted: a 64-character hexadecimal HMAC-SHA256 over
the original body bytes, compared in constant time. Invalid signatures cause no
database access. Only the existing Wayl appointment identified by `payment_reference`
can be updated; webhook metadata cannot create appointments.

Successful status (`Paid`, `Complete`, or `Delivered`) must include the exact expected
`total`. Currency and environment are checked when present (the documented webhook
example does not include them). Conflicting status fields are rejected. Other statuses
are acknowledged without mutating payment state, so an out-of-order failure cannot
downgrade an already-paid appointment. Conditional database updates handle concurrent
duplicate deliveries; the existing email claim guard handles duplicate email attempts.

For a valid, unexpired pending hold, the webhook changes only `payment_status=paid`
and `status=confirmed`. Identity, join token, slot and pricing remain unchanged.
It uses the existing consultation email function after confirmation. Admin-confirmed,
in-progress and completed appointments retain their lifecycle status when payment arrives.

**Late or cancelled payment:** an expired pending hold is cancelled/released using the
existing expiry flow, then the existing appointment is recorded as `paid/cancelled`.
Already-cancelled appointments also stay cancelled. No slot is reserved or recreated,
and no consultation invitation is sent. The webhook reports `manualReview=true`, the
booking page displays a support message, and the existing admin appointment table
exposes the paid/cancelled state. A human must reconcile the payment/refund and schedule;
the integration does not initiate refunds. An invalid hold timestamp fails for review.

The form creates the existing temporary hold in the background and immediately redirects
into Wayl checkout. Before verified payment, the UI displays only payment/setup states,
never booking success. Checkout failure returns to the existing access link with a
payment setup error, preserving the hold without claiming confirmation.

The browser return only reads/polls booking state; URL parameters are never proof of
payment. A pending return shows “Verifying payment” and does not offer another checkout.
Confirmation and consultation links require both a paid database state and a confirmed
(or later active/completed) lifecycle state. Transient status-read failures are retried;
polling stops at paid confirmation or cancellation. No manual consultant approval is required: the verified webhook confirms the
appointment and invokes the existing invitation email immediately. The obsolete admin
confirmation action is disabled; session start/end and email resend remain available.
Email delivery errors do not undo payment or confirmation. Payment confirmation and an
invitation outbox job commit in one server-only database transaction. Leased jobs use
one stable Resend idempotency key; the sent timestamp is written only after provider
acceptance. Interrupted sends retry with that same key. Jobs older than 23 hours since
the first attempt, or with five attempts, stop for manual review rather than risk duplicate
email beyond Resend's 24-hour idempotency window. Explicit admin resends are separate
intentional deliveries and require a paid confirmed/in-progress booking.

The daily Vercel cron at 03:00 UTC requires a Production `CRON_SECRET` of at least
32 characters. It processes at most ten jobs per run. On a daily schedule some failed
jobs can reach the safety window before retry; a human must review those jobs. A more
frequent cron requires an eligible Vercel plan and separate scheduling approval.

## Validation without payment requests

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
Tests use synthetic configuration, HTTP/provider mocks, and isolated PostgreSQL, never
load `.env.local`, and cannot contact Wayl, Supabase or Resend. Mock rates are fixture
values only; they do not configure the application. Real checkout remains blocked
until the merchant supplies a valid exchange rate and a public HTTPS callback origin.

The public Wayl documentation does not specify a complete webhook schema or its
paymentStatus enum. A real signed TEST fixture should be checked against the strict
parser before enabling any customer testing. No real payment request was sent during
implementation. Apply `supabase-migration-wayl-checkout-recovery.sql` manually before deploying
checkout recovery. It adds nullable private URL/expiry columns; it does not change
existing payment references or booking records. Never auto-apply it to production.


## First-attempt checkout diagnosis

The former payment-free booking flow (introduced in `c1263d6`) redirected straight
from hold creation to the booking page. It was replaced by immediate TEST checkout
in `8c1e203`; manual admin confirmation was disabled in `7b55248`. The current
booking endpoint creates a pending/unpaid hold with a NULL payment reference. Only
the checkout endpoint claims the reference, immediately before requesting the link.

The full-flow test exercises the actual booking, settings, checkout, webhook and
email implementations against an in-memory database and mocked providers. It checks
slot exclusion, configured discounted pricing, the FIRST checkout, confirmation,
invitation delivery and retry deduplication. It does not establish production readiness.

For a production first-attempt 409, use the existing short diagnostic code or JSON
response message to identify the failing branch before changing behavior. State,
pricing, an existing reference, a claim conflict and an invalid remaining hold can
all reject before Wayl is contacted. In particular, settings currently permit a zero
base price or 100% discount, whereas Wayl requires a positive snapshot and at least
1000 IQD. Do not substitute a default charge for an invalid configured price, clear a
claimed reference, or bypass validation to make checkout succeed. A missing diagnostic
or production state is insufficient evidence to identify the production root cause.


## Creation and recovery diagnostics

The atomic reference claim happens before Wayl is contacted. Any request failure,
unexpected HTTP response, malformed JSON or rejected response fields retains that
claim because upstream creation may have succeeded. The form then navigates to
`payment=unavailable`; without a saved valid checkout, retries remain blocked.
Previously, even successful URLs were not persisted, so a lost response or failed
browser navigation had no recovery path. Saving validated links closes that gap;
ambiguous creation and persistence failures still require reconciliation.

Vercel server logs now receive only fixed diagnostic codes: `WAYL_CREATE_REQUEST_STARTED`,
`WAYL_CREATE_REQUEST_FAILED`, `WAYL_CREATE_HTTP_REJECTED`, `WAYL_CREATE_JSON_INVALID`,
`WAYL_CREATE_RESPONSE_INVALID`, `WAYL_CREATE_RESPONSE_VALID`, `CHECKOUT_PERSIST_FAILED`,
`CHECKOUT_READY` and `CHECKOUT_REUSED`. Inspect the ORIGINAL checkout invocation, not
only retries. A missing external fetch span does not establish that no request occurred;
the earlier implementation caught and sanitized every failure without logging its stage.
No response bodies, URLs, references, tokens, customer data or environment values are logged.
`CHECKOUT_ALREADY_REQUESTED` alone cannot identify the initial upstream failure.

## Booking prerequisite diagnostics

The reservation endpoint validates current pricing and Wayl configuration before
holding inventory. Fixed diagnostic codes identify the failing prerequisite without
returning environment values, secrets, provider responses or customer details.
`WAYL_ENV_MISSING` means the deployed runtime has no mode; a Preview-scoped variable
does not configure Production. Configure Production `WAYL_ENV=live` and deploy again.
Do not add a default mode or bypass preflight. Rate and credential errors have separate
codes and must be corrected in configuration without inventing a conversion rate.

A diagnostic request with a verified nonexistent slot ID can validate these
prerequisites and reach `invalid_slot` from the transactional reservation function
without inserting a booking or contacting Wayl. A rolled-back server-role SQL check
can independently verify function execution. Neither check proves merchant checkout
acceptance; a legitimate checkout/payment remains a manual customer action.
