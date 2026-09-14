import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { findWaylSignature, isWaylPaid, verifyWaylSignature } from "@/lib/wayl";
import { notifyConsultationConfirmed } from "@/lib/consultationEmail";

export const dynamic = "force-dynamic";

type WaylWebhookPayload = {
  id?: string;
  referenceId?: string;
  reference_id?: string;
  paymentStatus?: string;
  status?: string;
  customParameter?: string;
  custom_parameter?: string;
};

function parseCustomParameter(raw: string | undefined): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = findWaylSignature(req.headers);

  if (!verifyWaylSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: WaylWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WaylWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isWaylPaid(payload)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const referenceId = payload.referenceId || payload.reference_id;
  if (!referenceId) {
    return NextResponse.json({ error: "Missing referenceId" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: byReference } = await db
    .from("appointments")
    .select("id, status, slot_id")
    .eq("payment_reference", referenceId)
    .maybeSingle();

  const existing =
    byReference ??
    (
      await db
        .from("appointments")
        .select("id, status, slot_id")
        .eq("stripe_session_id", referenceId)
        .maybeSingle()
    ).data;

  if (existing) {
    if (existing.status !== "confirmed" && existing.status !== "in_progress") {
      await db.from("appointments").update({ status: "confirmed" }).eq("id", existing.id);
      await db.from("time_slots").update({ is_booked: true }).eq("id", existing.slot_id);
      // WayL remains inactive in product flow; hook kept for when payment is enabled.
      await notifyConsultationConfirmed(db, existing.id);
    }
    return NextResponse.json({ received: true });
  }

  const meta = parseCustomParameter(payload.customParameter || payload.custom_parameter);
  if (!meta?.slot_id || !meta.client_name || !meta.client_email) {
    console.error("Wayl webhook: paid but no matching appointment", referenceId);
    return NextResponse.json({ received: true, unmatched: true });
  }

  await db.from("time_slots").update({ is_booked: true }).eq("id", meta.slot_id);
  const row = {
    slot_id: meta.slot_id,
    client_name: meta.client_name,
    client_email: meta.client_email,
    notes: meta.notes || null,
    stripe_session_id: referenceId,
    payment_reference: referenceId,
    payment_provider: "wayl",
    status: "confirmed",
  };
  const inserted = await db.from("appointments").insert(row).select("id").maybeSingle();
  if (inserted.error || !inserted.data) {
    const fallback = await db
      .from("appointments")
      .insert({
        slot_id: meta.slot_id,
        client_name: meta.client_name,
        client_email: meta.client_email,
        notes: meta.notes || null,
        stripe_session_id: referenceId,
        status: "confirmed",
      })
      .select("id")
      .maybeSingle();
    if (fallback.data?.id) {
      await notifyConsultationConfirmed(db, fallback.data.id);
    }
  } else if (inserted.data.id) {
    await notifyConsultationConfirmed(db, inserted.data.id);
  }

  return NextResponse.json({ received: true });
}
