# Maryem — Biopsychosocial Relationship Coaching Site

A full-stack Next.js 15 coaching website with:
- **Landing page** (Hero, About, Services, Testimonials, Pricing, CTA)
- **Booking flow** (Date picker → Time slot → Contact form → Stripe Checkout)
- **Admin dashboard** (Slot management + Appointment tracking)
- **Stripe** payments ($50 after 50% discount)
- **Supabase** (PostgreSQL) database
- **NextAuth** credentials-based admin auth

---

## 🚀 Local Development

```bash
cd coaching-app
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Environment Setup

Copy `.env.local` and fill in all values:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks (after creating endpoint) |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Vercel URL (e.g. `https://maryem.vercel.app`) |
| `ADMIN_USERNAME` | Your choice |
| `ADMIN_PASSWORD` | Your choice |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL` |

---

## 🗄️ Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Run the contents of `supabase-schema.sql`
4. Copy your **Project URL** and **anon key** from Settings → API

---

## 💳 Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Get your **test** API keys from Developers → API keys
3. After deploying, create a webhook endpoint:
   - URL: `https://your-domain.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`
4. Copy the **Webhook Signing Secret** → `STRIPE_WEBHOOK_SECRET`

> For local webhook testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli):
> ```bash
> stripe listen --forward-to localhost:3000/api/stripe/webhook
> ```

---

## 🚢 Deploy to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add all environment variables in Vercel → Project → Settings → Environment Variables
4. Deploy!

---

## 🔑 Admin Dashboard

Visit `/admin/login` (or click "Admin ↗" in the footer).

Use the `ADMIN_USERNAME` and `ADMIN_PASSWORD` values from your `.env.local`.

**Dashboard features:**
- `/admin` — Overview with stats
- `/admin/slots` — Add/remove available time slots
- `/admin/appointments` — View all bookings, cancel appointments

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Public landing page
│   ├── book/page.tsx               # 3-step booking flow
│   ├── booking-confirmed/page.tsx  # Post-payment success
│   ├── admin/                      # Protected admin area
│   │   ├── layout.tsx              # Auth guard
│   │   ├── page.tsx                # Overview
│   │   ├── slots/page.tsx          # Slot management
│   │   ├── appointments/page.tsx   # Appointment list
│   │   └── login/page.tsx          # Login form
│   └── api/
│       ├── auth/[...nextauth]/     # NextAuth handler
│       ├── slots/                  # GET/POST/DELETE slots
│       ├── appointments/           # GET/PATCH appointments
│       └── stripe/
│           ├── checkout/           # Create Stripe session
│           └── webhook/            # Handle payment events
├── components/
│   ├── layout/                     # Navbar, Footer
│   ├── landing/                    # All landing sections
│   ├── booking/                    # DatePicker, TimeSlotPicker, BookingForm
│   └── admin/                      # SlotManager, AppointmentTable
├── lib/
│   ├── supabase.ts
│   ├── stripe.ts
│   └── auth.ts
└── types/index.ts
```
