import { NextRequest, NextResponse } from "next/server";
import { stripe, SESSION_PRICE_CENTS } from "@/lib/stripe";
import { BookingFormData } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body: BookingFormData = await req.json();
  const { slot_id, client_name, client_email, notes, date, start_time, end_time } = body;

  if (!slot_id || !client_name || !client_email || !date || !start_time) {
    return NextResponse.json(
      { error: "Missing required booking fields" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Biopsychosocial Relationship Coaching Session",
            description: `${date} at ${start_time} – ${end_time} · 60 min · with Maryem`,
            images: [],
          },
          unit_amount: SESSION_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: client_email,
    metadata: {
      slot_id,
      client_name,
      client_email,
      notes: notes ?? "",
      date,
      start_time,
      end_time,
    },
    success_url: `${appUrl}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/book`,
  });

  return NextResponse.json({ url: session.url });
}
