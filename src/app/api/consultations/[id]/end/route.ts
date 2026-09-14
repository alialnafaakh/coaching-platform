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
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "not_found", message: "Appointment not found." }, { status: 404 });
  }

  const db = getSupabaseAdmin();
  const { data: appt, error } = await db
    .from("appointments")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (error || !appt) {
    return NextResponse.json({ error: "not_found", message: "Appointment not found." }, { status: 404 });
  }

  if (appt.status === "completed") {
    return NextResponse.json({ success: true, status: "completed" });
  }

  if (appt.status !== "in_progress" && appt.status !== "confirmed") {
    return NextResponse.json(
      { error: "invalid_status", message: "This consultation cannot be ended." },
      { status: 403 }
    );
  }

  const { error: updateError } = await db
    .from("appointments")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["confirmed", "in_progress"]);

  if (updateError) {
    console.error("End consultation error:", updateError);
    return NextResponse.json(
      { error: "server_error", message: "Unable to end the consultation." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, status: "completed" });
}
