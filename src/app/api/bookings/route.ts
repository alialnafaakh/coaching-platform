import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { newJoinToken, toPublicAppointment, validateCustomer } from "@/lib/bookings";
import { getWaylCheckoutConfig, quoteWaylPayment } from "@/lib/wayl";
import { calculateFinalPrice, getConsultationSettings } from "@/lib/consultationSettings";
import { enforceBookingIpRateLimit, getClientIpFromRequest } from "@/lib/rateLimit";
import { boundedJson, PRIVATE_HEADERS } from "@/lib/serverSecurity";
import type { Appointment } from "@/types";

export const dynamic = "force-dynamic";

function failure(code: string, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status, headers: PRIVATE_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await boundedJson(req); }
  catch { return failure("invalid_request", "Invalid booking request.", 400); }
  const customer = validateCustomer(body);
  if ("error" in customer) return failure("invalid_customer", customer.error, 400);
  if (typeof body.slot_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.slot_id) ||
      typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) ||
      typeof body.start_time !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.start_time)) {
    return failure("invalid_slot", "Please select a valid date and time.", 400);
  }
  const limit = await enforceBookingIpRateLimit(getClientIpFromRequest(req));
  if (limit.action === "deny") return NextResponse.json({ error: "rate_limited", message: "Too many booking attempts." },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(Math.max(1, limit.decision.retryAfterSeconds)) } });
  if (limit.action === "skip" && (limit.reason !== "missing_ip" || process.env.VERCEL_ENV === "production")) {
    return failure("temporarily_unavailable", "Booking is temporarily unavailable. Please try again later.", 503);
  }
  try {
    const db = getSupabaseAdmin();
    const settings = await getConsultationSettings(db);
    const config = getWaylCheckoutConfig();
    // Validate minimum charge before holding inventory; never calls Wayl here.
    quoteWaylPayment(calculateFinalPrice(settings.base_price_usd, settings.discount_percent), config.rate, config.environment);
    const token = newJoinToken();
    const { data, error } = await db.rpc("reserve_booking", {
      p_slot_id: body.slot_id, p_date: body.date, p_start_time: body.start_time,
      p_client_name: customer.client_name, p_client_email: customer.client_email,
      p_notes: customer.notes, p_join_token: token, p_expected_settings: settings,
    });
    if (error) { console.error("SERVER_OPERATION_FAILED"); return failure("server_error", "Unable to reserve this time.", 503); }
    if (!data?.appointment) return failure(data?.error || "slot_unavailable", "This time or pricing has changed. Please refresh and try again.", 409);
    return NextResponse.json({ appointment: toPublicAppointment(data.appointment as Appointment), token },
      { status: 201, headers: PRIVATE_HEADERS });
  } catch {
    console.error("SERVER_OPERATION_FAILED");
    return failure("server_error", "Booking is temporarily unavailable. Please contact support.", 503);
  }
}
