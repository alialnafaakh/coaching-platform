import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { tokensMatch } from "@/lib/bookings";
import { createPaymentLink, getWaylCheckoutConfig, quoteWaylPayment, referenceAmount, requireWaylTestMode, validWaylCheckoutUrl, WaylError } from "@/lib/wayl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function failure(message: string, status: number) {
  return NextResponse.json({ error: "checkout_unavailable", message }, { status });
}

export async function POST(req: NextRequest) {
  let conflictDiagnostic: "CHECKOUT_INVALID_PRICE" | "CHECKOUT_HOLD_INVALID" = "CHECKOUT_INVALID_PRICE";
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
      .select("id, join_token, status, payment_status, payment_expires_at, payment_reference, payment_provider, final_price_usd, payment_checkout_url, payment_checkout_expires_at")
      .eq("id", id).maybeSingle();
    if (error) return failure("Unable to load this booking.", 503);
    if (!appointment?.join_token || !tokensMatch(token, appointment.join_token)) {
      return failure("Booking access is required.", 404);
    }
    const expiry = Date.parse(appointment.payment_expires_at || "");
    if (appointment.status !== "pending_payment" || appointment.payment_status !== "unpaid" ||
        !Number.isFinite(expiry) || expiry - Date.now() < 60000) {
      console.warn("CHECKOUT_INVALID_STATE");
      return failure("This booking is no longer available for checkout.", 409);
    }
    if (appointment.payment_reference) {
      requireWaylTestMode();
      const checkoutExpiry = Date.parse(appointment.payment_checkout_expires_at || "");
      if (appointment.payment_provider === "wayl" &&
          validWaylCheckoutUrl(appointment.payment_checkout_url) &&
          Number.isFinite(checkoutExpiry) && checkoutExpiry > Date.now() && checkoutExpiry <= expiry) {
        referenceAmount(appointment.payment_reference, appointment.final_price_usd);
        console.warn("CHECKOUT_REUSED");
        return NextResponse.json({ url: appointment.payment_checkout_url }, { headers: { "Cache-Control": "no-store" } });
      }
      console.warn("CHECKOUT_ALREADY_REQUESTED");
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
    if (!claimed) {
      console.warn("CHECKOUT_CLAIM_CONFLICT");
      return failure("Checkout is already requested or the hold has ended.", 409);
    }
    // Retain the reference on errors/timeouts: Wayl may have accepted the request.
    // Never erase a possible charge or issue a second link for this appointment.
    conflictDiagnostic = "CHECKOUT_HOLD_INVALID";
    const checkout = await createPaymentLink({
      ...quote, appointmentId: id, joinToken: appointment.join_token,
      expiresAt: appointment.payment_expires_at,
    });
    const { data: saved, error: saveError } = await db.from("appointments")
      .update({ payment_checkout_url: checkout.url, payment_checkout_expires_at: checkout.expiresAt })
      .eq("id", id).eq("join_token", appointment.join_token)
      .eq("payment_reference", quote.referenceId).eq("payment_provider", "wayl")
      .eq("status", "pending_payment").eq("payment_status", "unpaid")
      .gt("payment_expires_at", new Date().toISOString())
      .select("id").maybeSingle();
    if (saveError || !saved) {
      console.warn("CHECKOUT_PERSIST_FAILED");
      return failure("Unable to save checkout access. Please contact support before retrying.", 503);
    }
    console.warn("CHECKOUT_READY");
    return NextResponse.json({ url: checkout.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WaylError && error.status === 409) {
      console.warn(conflictDiagnostic);
    }
    return error instanceof WaylError ? failure(error.message, error.status) :
      failure("Unable to prepare checkout.", 503);
  }
}
