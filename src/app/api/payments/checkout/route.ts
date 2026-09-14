import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  createPaymentLink,
  getWaylAmountIqd,
  newPaymentReference,
  WaylError,
} from "@/lib/wayl";
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
  const referenceId = newPaymentReference();
  const db = getSupabaseAdmin();

  const { data: slot, error: slotError } = await db
    .from("time_slots")
    .select("id, is_booked")
    .eq("id", slot_id)
    .single();

  if (slotError || !slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }
  if (slot.is_booked) {
    return NextResponse.json({ error: "This slot has already been booked" }, { status: 409 });
  }

  await db.from("time_slots").update({ is_booked: true }).eq("id", slot_id);

  const appointment = {
    slot_id,
    client_name,
    client_email,
    notes: notes || null,
    stripe_session_id: referenceId,
    payment_reference: referenceId,
    payment_provider: "wayl",
    status: "pending",
  };

  let { error: insertError } = await db.from("appointments").insert(appointment);
  if (insertError) {
    const fallback = await db.from("appointments").insert({
      slot_id,
      client_name,
      client_email,
      notes: notes || null,
      stripe_session_id: referenceId,
      status: "pending",
    });
    insertError = fallback.error;
  }

  if (insertError) {
    await db.from("time_slots").update({ is_booked: false }).eq("id", slot_id);
    console.error("Wayl checkout insert error:", insertError);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  try {
    const link = await createPaymentLink({
      referenceId,
      totalIqd: getWaylAmountIqd(),
      description: `Coaching session ${date} ${start_time}–${end_time}`,
      redirectionUrl: `${appUrl}/booking-confirmed?method=wayl&referenceId=${referenceId}`,
      webhookUrl: `${appUrl}/api/payments/webhook`,
      customParameter: JSON.stringify({
        slot_id,
        client_name,
        client_email,
        notes: notes ?? "",
        date,
        start_time,
        end_time,
      }),
    });

    return NextResponse.json({ url: link.checkoutUrl, referenceId: link.referenceId });
  } catch (error: unknown) {
    await db.from("appointments").delete().eq("stripe_session_id", referenceId);
    await db.from("time_slots").update({ is_booked: false }).eq("id", slot_id);
    const message = error instanceof WaylError ? error.message : "Failed to create checkout session";
    console.error("Wayl Checkout Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
