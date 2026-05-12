import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("appointments")
    .select("*, time_slots(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: appt } = await db.from("appointments").select("slot_id").eq("id", id).single();
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const { error: apptError } = await db.from("appointments").update({ status: "cancelled" }).eq("id", id);
  if (apptError) return NextResponse.json({ error: apptError.message }, { status: 500 });

  await db.from("time_slots").update({ is_booked: false }).eq("id", appt.slot_id);
  return NextResponse.json({ success: true });
}
