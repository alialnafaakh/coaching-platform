import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendConsultationInvitationEmail } from "@/lib/consultationEmail";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admin-only resend. Recipient is always the stored client_email.
 * join_token is never returned to the client.
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
  const { data: appt } = await db
    .from("appointments")
    .select("id, status, client_email")
    .eq("id", id)
    .maybeSingle();

  if (!appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (appt.status !== "confirmed" && appt.status !== "in_progress") {
    return NextResponse.json(
      { error: "Resend is only available for confirmed or in-progress appointments." },
      { status: 409 }
    );
  }

  const result = await sendConsultationInvitationEmail(db, id, { force: true });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "Unable to resend consultation email." },
      { status: 502 }
    );
  }

  const { data: after } = await db
    .from("appointments")
    .select("consultation_email_sent_at, consultation_email_last_error, client_email")
    .eq("id", id)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    sent_to: after?.client_email ?? appt.client_email,
    consultation_email_sent_at: after?.consultation_email_sent_at ?? null,
  });
}
