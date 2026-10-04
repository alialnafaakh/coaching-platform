import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isWaylPaid, referenceAmount, getWaylEnvironment, validateWaylPayment, verifyWaylSignature } from "@/lib/wayl";
import { notifyConsultationConfirmed } from "@/lib/consultationEmail";
import { PRIVATE_HEADERS } from "@/lib/serverSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: PRIVATE_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const reader = req.body?.getReader();
    if (!reader) return failure("Invalid payment event.", 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 65536) { await reader.cancel(); return failure("Invalid payment event.", 413); }
      chunks.push(value);
    }
    const rawBody = Buffer.concat(chunks);
    if (!verifyWaylSignature(rawBody, req.headers.get("x-wayl-signature-256"))) return failure("Invalid signature.", 400);
    const environment = getWaylEnvironment();
    let parsed: unknown;
    try { parsed = JSON.parse(rawBody.toString("utf8")); }
    catch { return failure("Invalid payment event.", 400); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return failure("Invalid payment event.", 400);
    const payload = parsed as Record<string, unknown>;
    if (!isWaylPaid(payload)) return NextResponse.json({ received: true, ignored: true }, { headers: PRIVATE_HEADERS });
    const reference = payload.referenceId;
    if (typeof reference !== "string" || reference.length > 255) return failure("Invalid payment reference.", 400);
    const db = getSupabaseAdmin();
    const { data: appointment, error } = await db.from("appointments")
      .select("id, payment_reference, final_price_usd")
      .eq("payment_reference", reference).eq("payment_provider", "wayl").maybeSingle();
    if (error) return failure("Unable to process payment event.", 503);
    if (!appointment) return failure("Payment reference was not found.", 404);
    let amount: number;
    try { amount = referenceAmount(appointment.payment_reference, appointment.final_price_usd); }
    catch { return failure("Payment does not match booking.", 409); }
    if (!validateWaylPayment(payload, amount)) return failure("Payment does not match booking.", 409);
    // This server-only RPC is called ONLY after signature and quote validation.
    // Confirmation, inventory reconciliation and invitation enqueue commit together.
    const { data: result, error: updateError } = await db.rpc("finalize_wayl_payment", {
      p_reference: reference, p_expected_price: appointment.final_price_usd,
      p_expected_iqd: amount, p_environment: environment,
    });
    if (updateError) return failure("Unable to record payment event.", 503);
    if (!result || result.error) return failure("Booking requires manual review.", 409);
    if (["confirmed", "in_progress"].includes(result.status)) {
      await notifyConsultationConfirmed(db, result.id);
    }
    return NextResponse.json({ received: true, duplicate: result.duplicate, manualReview: result.manualReview },
      { headers: PRIVATE_HEADERS });
  } catch {
    return failure("Unable to process payment event.", 503);
  }
}
