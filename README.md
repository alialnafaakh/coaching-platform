# Maryem coaching website

Canonical local repository: `C:\Users\anafa\Desktop\Maryem's site`.
GitHub: `alialnafaakh/coaching-platform`. Vercel: `coaching-platform`.
Production: https://biopsychosocial.site. Supabase: `cmdkxxkstberbqcnhdjd`.
The OneDrive copy is not authoritative.

## Booking and payments

Available slot → customer details → atomic 15-minute hold with a saved price → Wayl
LIVE checkout → verified signed webhook → paid/confirmed → automatic invitation.
Browser returns only read booking state. Admin approval cannot mark payments paid.
Late verified payments stay cancelled/paid for manual review; they never take a
replacement customer's slot. Payment references and checkout links are not cleared.

Read [Wayl integration](docs/wayl-test-integration.md) for validation and recovery rules.

## Configuration

Configure values securely outside Git. Server-only variables:
`SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_USERNAME`,
`ADMIN_PASSWORD`, `RATE_LIMIT_SECRET`, `DAILY_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
`EMAIL_REPLY_TO`, `WAYL_API_TOKEN`, `WAYL_WEBHOOK_SECRET`, `WAYL_ENV`,
`WAYL_USD_TO_IQD_RATE`, `WAYL_CALLBACK_ORIGIN`, and `CRON_SECRET`.
Public origins: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SITE_URL` (or the existing
`NEXT_PUBLIC_APP_URL`). Production URLs must identify the canonical domain.

Keep the merchant-selected conversion rate. Verify existing Production `WAYL_ENV=live`
and credentials rather than changing settings based on inaccessible connector metadata.
The email retry cron requires a securely generated Production `CRON_SECRET` of at least
32 characters; never use a password, publish it, or commit it.

## Database history

`supabase/migrations/20261004071138_production_reconciliation.sql` is the approved
production reconciliation migration. It adds service-only transaction functions, the
unique payment-reference index, validated positive-price/time constraints, an RLS
invitation outbox, and image MIME/size limits. Repairs expire only unpaid pending holds
and reconcile slot flags while protecting existing confirmed/in-progress unpaid rows.
It preserves bookings, payment evidence, TEST references, and sent-email records.

Historical root SQL files describe different earlier schemas and are not a fresh
production installation sequence. Do not replay them on production. Verify the live
schema and migration history before applying any future migration.

## Development and verification

Run `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
Run `npm run dev` only with authorized secure local configuration. Unit and PostgreSQL
tests do not contact Wayl, Supabase, Daily, or Resend and do not spend money.

## Manual LIVE verification

After production deployment and configuration are verified, the merchant completes
one legitimate payment manually using a new booking. Verify the signed webhook,
paid/confirmed state, invitation acceptance, customer confirmation, and consultation
join window. Do not simulate success in production or manually alter payment status.
Keep the audit's existing active unpaid booking for manual review.

Review pending/review email jobs if automatic delivery fails. Never blindly resend an
ambiguous delivery beyond the provider's deduplication window. The Hobby-compatible
daily cron runs at 03:00 UTC and handles ten jobs; some failed deliveries will require
manual review. Inbox delivery and a two-participant Daily call need human verification.


## Consultant confirmation notifications

Set server-only `CONSULTANT_NOTIFICATION_EMAIL` in Production to the consultant's
recipient address. Newly verified Wayl paid confirmations atomically enqueue one
`consultant_notification` alongside the existing customer invitation. Existing or
historical paid bookings are never backfilled. The notification includes booking
snapshots and the webhook-validated IQD quote, not a conversion at the current rate.
Its consultation link uses the existing authenticated admin route without customer
tokens. Recipient failures have independent job state and cannot change payment,
booking confirmation, or customer invitation delivery records. Both purposes use
stable per-job Resend keys and the existing leased retry/review limits. Daily cron
retries at 03:00 UTC; five attempts or ambiguity outside 23 hours requires review.
