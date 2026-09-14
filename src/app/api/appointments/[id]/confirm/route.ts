import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { notifyConsultationConfirmed } from "@/lib/consultationEmail";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admin: pending_payment → confirmed.
 * Email is sent after a successful transition (never for pending_payment itself).
 * Confirmation is not rolled back if email fails.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: updated, error } = await db
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("status", "pending_payment")
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("Confirm appointment failed", { appointmentId: id, message: error.message });
    return NextResponse.json({ error: "Unable to confirm this appointment." }, { status: 500 });
  }

  if (!updated) {
    const { data: existing } = await db
      .from("appointments")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    if (existing.status === "confirmed" || existing.status === "in_progress") {
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        email: "not_sent_duplicate_guard",
      });
    }
    return NextResponse.json(
      { error: "Only pending payment appointments can be confirmed." },
      { status: 409 }
    );
  }

  await notifyConsultationConfirmed(db, updated.id);

  const { data: after } = await db
    .from("appointments")
    .select("consultation_email_sent_at, consultation_email_last_error")
    .eq("id", updated.id)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    status: "confirmed",
    consultation_email_sent_at: after?.consultation_email_sent_at ?? null,
    consultation_email_last_error: after?.consultation_email_last_error ?? null,
  });
}
