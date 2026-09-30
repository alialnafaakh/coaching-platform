import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { tokensMatch } from "@/lib/bookings";
import { createPaymentLink, getWaylCheckoutConfig, quoteWaylPayment, WaylError } from "@/lib/wayl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function failure(message: string, status: number) {
  return NextResponse.json({ error: "checkout_unavailable", message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const id = body?.appointment_id;
    const token = body?.token;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) ||
        typeof token !== "string" || !token || token.length > 128) {
      return failure("Booking access is required.", 400);
    }
    const db = getSupabaseAdmin();
    const { data: appointment, error } = await db.from("appointments")
      .select("id, join_token, status, payment_status, payment_expires_at, payment_reference, final_price_usd")
      .eq("id", id).maybeSingle();
    if (error) return failure("Unable to load this booking.", 503);
    if (!appointment?.join_token || !tokensMatch(token, appointment.join_token)) {
      return failure("Booking access is required.", 404);
    }
    const expiry = Date.parse(appointment.payment_expires_at || "");
    if (appointment.status !== "pending_payment" || appointment.payment_status !== "unpaid" ||
        !Number.isFinite(expiry) || expiry - Date.now() < 60000) {
      return failure("This booking is no longer available for checkout.", 409);
    }
    if (appointment.payment_reference) {
      return failure("Checkout has already been requested. Contact support if you cannot complete it.", 409);
    }
    // Validate configuration and pricing before reference mutation or API requests.
    const config = getWaylCheckoutConfig();
    const quote = quoteWaylPayment(appointment.final_price_usd, config.rate);
    const { data: claimed, error: claimError } = await db.from("appointments")
      .update({ payment_provider: "wayl", payment_reference: quote.referenceId })
      .eq("id", id).eq("join_token", appointment.join_token)
      .eq("status", "pending_payment").eq("payment_status", "unpaid")
      .eq("final_price_usd", appointment.final_price_usd)
      .gt("payment_expires_at", new Date(Date.now() + 60000).toISOString())
      .is("payment_reference", null).select("id").maybeSingle();
    if (claimError) return failure("Unable to prepare checkout.", 503);
    if (!claimed) return failure("Checkout is already requested or the hold has ended.", 409);
    // Retain the reference on errors/timeouts: Wayl may have accepted the request.
    // Never erase a possible charge or issue a second link for this appointment.
    const url = await createPaymentLink({
      ...quote, appointmentId: id, joinToken: appointment.join_token,
      expiresAt: appointment.payment_expires_at,
    });
    return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return error instanceof WaylError ? failure(error.message, error.status) :
      failure("Unable to prepare checkout.", 503);
  }
}
