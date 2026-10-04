import { isAdminSession, isSameOrigin } from "@/lib/serverSecurity";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Coach/admin only: mark consultation completed. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(_req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "not_found", message: "Appointment not found." }, { status: 404 });
  }

  const db = getSupabaseAdmin();
  const { data: appt, error } = await db
    .from("appointments")
    .select("id, status, payment_status")
    .eq("id", id)
    .maybeSingle();

  if (error || !appt) {
    return NextResponse.json({ error: "not_found", message: "Appointment not found." }, { status: 404 });
  }

  if (appt.payment_status !== "paid") return NextResponse.json({ error: "Verified payment required" }, { status: 403 });

  if (appt.status === "completed") {
    return NextResponse.json({ success: true, status: "completed" });
  }

  if (appt.status !== "in_progress" && appt.status !== "confirmed") {
    return NextResponse.json(
      { error: "invalid_status", message: "This consultation cannot be ended." },
      { status: 403 }
    );
  }

  const { data: completed, error: updateError } = await db.rpc("complete_consultation", { p_appointment_id: id });

  if (updateError || !completed) {
    console.error("SERVER_OPERATION_FAILED");
    return NextResponse.json(
      { error: "server_error", message: "Unable to end the consultation." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, status: "completed" });
}
