import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ACTIVE_STATUSES, expireExpiredHolds } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  await expireExpiredHolds(db);
  const { data, error } = await db
    .from("appointments")
    .select("*, time_slots(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Unable to load appointments." }, { status: 500 });
  const sanitized = (data || []).map(({ join_token: _joinToken, ...rest }) => rest);
  return NextResponse.json(sanitized);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: appt } = await db.from("appointments").select("id, slot_id").eq("id", id).single();
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const { error: apptError } = await db
    .from("appointments")
    .update({ status: "cancelled", payment_status: "failed" })
    .eq("id", id);
  if (apptError) return NextResponse.json({ error: "Unable to cancel this appointment." }, { status: 500 });

  const { data: blockers } = await db
    .from("appointments")
    .select("id")
    .eq("slot_id", appt.slot_id)
    .in("status", ACTIVE_STATUSES)
    .limit(1);

  if (!blockers?.length) {
    await db.from("time_slots").update({ is_booked: false }).eq("id", appt.slot_id);
  }
  return NextResponse.json({ success: true });
}
