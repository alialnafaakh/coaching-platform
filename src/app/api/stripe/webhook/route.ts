import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { slot_id, client_name, client_email, notes } = session.metadata!;
    const db = getSupabaseAdmin();

    await db.from("time_slots").update({ is_booked: true }).eq("id", slot_id);
    await db.from("appointments").insert({
      slot_id,
      client_name,
      client_email,
      notes: notes || null,
      stripe_session_id: session.id,
      status: "confirmed",
    });
  }

  return NextResponse.json({ received: true });
}
