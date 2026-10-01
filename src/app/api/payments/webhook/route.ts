import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { expireExpiredHolds } from "@/lib/bookings";
import { isWaylPaid, referenceAmount, getWaylEnvironment, validateWaylPayment, verifyWaylSignature } from "@/lib/wayl";
import { notifyConsultationConfirmed } from "@/lib/consultationEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = new Uint8Array(await req.arrayBuffer());
    if (!verifyWaylSignature(rawBody, req.headers.get("x-wayl-signature-256"))) {
      return failure("Invalid signature.", 400);
    }
    getWaylEnvironment();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(Buffer.from(rawBody).toString("utf8"));
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error();
    } catch {
      return failure("Invalid payment event.", 400);
    }
    if (!isWaylPaid(payload)) return NextResponse.json({ received: true, ignored: true });
    const reference = payload.referenceId;
    if (typeof reference !== "string" || reference.length > 255) {
      return failure("Invalid payment reference.", 400);
    }
    const db = getSupabaseAdmin();
    // No metadata/stripe/id fallbacks. Only the server-persisted Wayl reference.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: appointment, error } = await db.from("appointments")
        .select("id, status, payment_status, payment_expires_at, payment_reference, final_price_usd")
        .eq("payment_reference", reference).eq("payment_provider", "wayl").maybeSingle();
      if (error) return failure("Unable to process payment event.", 503);
      if (!appointment) return failure("Payment reference was not found.", 404);
      let expected: number;
      try { expected = referenceAmount(appointment.payment_reference, appointment.final_price_usd); }
      catch { return failure("Payment does not match booking.", 409); }
      if (!validateWaylPayment(payload, expected)) return failure("Payment does not match booking.", 409);
      if (appointment.payment_status === "paid") {
        // Retry interrupted emails using the existing email claim guard.
        if (["confirmed", "in_progress"].includes(appointment.status)) {
          await notifyConsultationConfirmed(db, appointment.id);
        }
        return NextResponse.json({ received: true, duplicate: true,
          manualReview: appointment.status === "cancelled" });
      }
      const expiry = Date.parse(appointment.payment_expires_at || "");
      const now = new Date();
      if (appointment.status === "pending_payment" && (!Number.isFinite(expiry) || expiry <= now.getTime())) {
        if (!Number.isFinite(expiry)) return failure("Booking hold is invalid. Manual review required.", 409);
        // Cancel/release via the existing expiry flow before recording payment.
        // Never reacquire a slot that another customer may now occupy.
        await expireExpiredHolds(db);
        continue;
      }
      if (!["pending_payment", "confirmed", "in_progress", "completed", "cancelled"].includes(appointment.status)) {
        return failure("Booking requires manual review.", 409);
      }
      const nextStatus = appointment.status === "pending_payment" ? "confirmed" : appointment.status;
      let update = db.from("appointments")
        .update({ payment_status: "paid", status: nextStatus })
        .eq("id", appointment.id).eq("payment_reference", reference).eq("payment_provider", "wayl")
        .eq("status", appointment.status).eq("payment_status", appointment.payment_status)
        .eq("final_price_usd", appointment.final_price_usd);
      if (appointment.status === "pending_payment") {
        update = update.gt("payment_expires_at", now.toISOString());
      }
      const { data: updated, error: updateError } = await update.select("id").maybeSingle();
      if (updateError) return failure("Unable to record payment event.", 503);
      if (!updated) continue; // Competing event/admin/expiry won: reload, never overwrite.
      if (["confirmed", "in_progress"].includes(nextStatus)) {
        await notifyConsultationConfirmed(db, appointment.id);
      }
      return NextResponse.json({ received: true, manualReview: nextStatus === "cancelled" });
    }
    return failure("Payment processing must be retried.", 503);
  } catch {
    return failure("Unable to process payment event.", 503);
  }
}
