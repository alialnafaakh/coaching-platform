import { isAdminSession, isSameOrigin } from "@/lib/serverSecurity";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { expireExpiredHolds } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  await expireExpiredHolds(db);
  const { data, error } = await db
    .from("appointments")
    .select("*, time_slots(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Unable to load appointments." }, { status: 500 });
  const sanitized = (data || []).map((row) => {
    const safe = { ...row };
    delete safe.join_token; delete safe.payment_reference; delete safe.payment_checkout_url;
    return safe;
  });
  return NextResponse.json(sanitized);
}

export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("cancel_booking", { p_appointment_id: id });
  if (error) return NextResponse.json({ error: "Unable to cancel this appointment." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
