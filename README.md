# Maryem — Biopsychosocial Relationship Coaching Site

A full-stack Next.js coaching website with:
- **Landing page** (Hero, About, Services, Testimonials, Pricing, CTA)
- **Booking flow** (Date picker → Time slot → Contact form → pending payment hold)
- **Admin dashboard** (Slot management + Appointment tracking)
- **Supabase** (PostgreSQL) database
- **NextAuth** credentials-based admin auth

Online payment (WayL) will be connected in a later phase. Bookings currently reserve a slot as `pending_payment` / `unpaid`.

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
│   ├── book/page.tsx               # Booking flow
│   ├── booking-confirmed/page.tsx  # Booking confirmation / pending payment
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
│       └── bookings/               # Create + fetch bookings
├── components/
│   ├── layout/                     # Navbar, Footer
│   ├── landing/                    # All landing sections
│   ├── booking/                    # DatePicker, TimeSlotPicker, BookingForm
│   └── admin/                      # SlotManager, AppointmentTable
├── lib/
│   ├── supabase.ts
│   ├── bookings.ts
│   └── auth.ts
└── types/index.ts
```
