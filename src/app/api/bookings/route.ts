import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  expireExpiredHolds,
  newJoinToken,
  paymentExpiresAt,
  toPublicAppointment,
  validateCustomer,
} from "@/lib/bookings";

export const dynamic = "force-dynamic";

function clientError(code: string, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return clientError("invalid_request", "Invalid booking request.", 400);
  }

  const customer = validateCustomer(body);
  if ("error" in customer) {
    return clientError("invalid_customer", customer.error, 400);
  }

  const slot_id = typeof body.slot_id === "string" ? body.slot_id : "";
  const date = typeof body.date === "string" ? body.date : "";
  const start_time = typeof body.start_time === "string" ? body.start_time : "";
  const end_time = typeof body.end_time === "string" ? body.end_time : "";

  if (!slot_id || !date || !start_time) {
    return clientError("invalid_slot", "Please select a valid date and time.", 400);
  }

  const db = getSupabaseAdmin();

  try {
    await expireExpiredHolds(db);

    const { data: reserved, error: reserveError } = await db
      .from("time_slots")
      .update({ is_booked: true })
      .eq("id", slot_id)
      .eq("is_booked", false)
      .select("id, date, start_time, end_time")
      .maybeSingle();

    if (reserveError) {
      console.error("Slot reserve error:", reserveError);
      return clientError("server_error", "Unable to complete your booking. Please try again.", 500);
    }

    if (!reserved) {
      return clientError("slot_unavailable", "This time is no longer available.", 409);
    }

    const reservedDate = String(reserved.date);
    const reservedStart = String(reserved.start_time).slice(0, 5);
    const requestedStart = start_time.slice(0, 5);
    if (reservedDate !== date || reservedStart !== requestedStart) {
      await db.from("time_slots").update({ is_booked: false }).eq("id", slot_id);
      return clientError("invalid_slot", "Please select a valid date and time.", 400);
    }

    const joinToken = newJoinToken();
    const appointmentRow = {
      slot_id,
      client_name: customer.client_name,
      client_email: customer.client_email,
      notes: customer.notes,
      status: "pending_payment",
      payment_status: "unpaid",
      payment_provider: null,
      payment_reference: null,
      payment_expires_at: paymentExpiresAt(),
      join_token: joinToken,
      room_id: null,
      started_at: null,
      ended_at: null,
    };

    const { data: created, error: insertError } = await db
      .from("appointments")
      .insert(appointmentRow)
      .select("*, time_slots(*)")
      .single();

    if (insertError || !created) {
      await db.from("time_slots").update({ is_booked: false }).eq("id", slot_id);
      if (insertError?.code === "23505") {
        return clientError("slot_unavailable", "This time is no longer available.", 409);
      }
      console.error("Appointment insert error:", insertError);
      return clientError("server_error", "Unable to complete your booking. Please try again.", 500);
    }

    return NextResponse.json(
      {
        appointment: toPublicAppointment(created, {
          date: reservedDate,
          start_time: reserved.start_time,
          end_time: end_time || reserved.end_time,
        }),
        token: joinToken,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create booking error:", err);
    return clientError("server_error", "Unable to complete your booking. Please try again.", 500);
  }
}
