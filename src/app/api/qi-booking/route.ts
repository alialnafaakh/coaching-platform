import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slot_id, client_name, client_email, notes, date, start_time, end_time } = body;

    if (!slot_id || !client_name || !client_email || !date || !start_time) {
      return NextResponse.json(
        { error: "Missing required booking fields" },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();

    // Check the slot is still available
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

    // Mark slot as tentatively booked
    await db.from("time_slots").update({ is_booked: true }).eq("id", slot_id);

    // Create appointment with pending status — admin must verify QI transfer manually
    const { error: insertError } = await db.from("appointments").insert({
      slot_id,
      client_name,
      client_email,
      notes: notes || null,
      stripe_session_id: null,
      status: "pending_qi_payment",
    });

    if (insertError) {
      // Roll back the slot reservation if appointment creation fails
      await db.from("time_slots").update({ is_booked: false }).eq("id", slot_id);
      console.error("QI Booking insert error:", insertError);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("QI Booking Error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
