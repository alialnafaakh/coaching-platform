import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Admin: list all consultation reviews with appointment context. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("consultation_reviews")
    .select(
      "id, appointment_id, rating, comment, moderation_status, created_at, reviewed_at, appointments(client_name, time_slots(date, start_time))"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin reviews list error:", error.message);
    return NextResponse.json({ error: "Unable to load reviews." }, { status: 500 });
  }

  const rows = (data || []).map((row) => {
    const apptRaw = row.appointments;
    const apptRow = Array.isArray(apptRaw) ? apptRaw[0] : apptRaw;
    const appt = apptRow as { client_name?: string; time_slots?: unknown } | null;
    const slotRaw = appt?.time_slots;
    const slotRow = Array.isArray(slotRaw) ? slotRaw[0] : slotRaw;
    const slot = slotRow as { date?: string; start_time?: string } | undefined;
    return {
      id: row.id,
      appointment_id: row.appointment_id,
      rating: row.rating,
      comment: row.comment,
      moderation_status: row.moderation_status,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      client_name: appt?.client_name ?? "",
      consultation_date: slot?.date ?? "",
      consultation_start_time: slot?.start_time?.slice(0, 5) ?? "",
    };
  });

  return NextResponse.json(rows);
}
