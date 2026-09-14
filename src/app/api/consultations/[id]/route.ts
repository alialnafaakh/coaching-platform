import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { tokensMatch } from "@/lib/bookings";
import {
  buildJoinWindow,
  evaluateJoinAccess,
} from "@/lib/consultationAccess";
import type { Appointment } from "@/types";

export const dynamic = "force-dynamic";

type ApptRow = Appointment & {
  time_slots: { date: string; start_time: string; end_time: string } | null;
};

async function loadAppointment(id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("appointments")
    .select("*, time_slots(date, start_time, end_time)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as ApptRow;
}

function publicDetails(appt: ApptRow, window: ReturnType<typeof buildJoinWindow>) {
  return {
    id: appt.id,
    status: appt.status,
    client_name: appt.client_name,
    date: appt.time_slots?.date || "",
    start_time: appt.time_slots?.start_time || "",
    end_time: appt.time_slots?.end_time || "",
    session_duration_minutes: window.sessionDurationMinutes,
    scheduled_start: window.scheduledStartIso,
    scheduled_end: window.scheduledEndIso,
    join_opens_at: window.joinOpensAtIso,
    join_closes_at: window.joinClosesAtIso,
  };
}

/**
 * GET /api/consultations/[id]?token=...
 * Customer: token required.
 * Admin: authenticated session, no token.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token") || "";
  const session = await getServerSession(authOptions);
  const isAdmin = Boolean(session);

  if (!id) {
    return NextResponse.json({ error: "not_found", message: "Appointment not found." }, { status: 404 });
  }
  if (!isAdmin && !token) {
    return NextResponse.json(
      { error: "unauthorized", message: "A valid access token is required." },
      { status: 401 }
    );
  }

  const appt = await loadAppointment(id);
  if (!appt || !appt.time_slots) {
    return NextResponse.json({ error: "not_found", message: "Appointment not found." }, { status: 404 });
  }

  if (!isAdmin) {
    if (!appt.join_token || !tokensMatch(token, appt.join_token)) {
      return NextResponse.json({ error: "not_found", message: "Appointment not found." }, { status: 404 });
    }
  }

  const window = buildJoinWindow(appt, appt.time_slots);
  const access = evaluateJoinAccess({ status: appt.status, window });

  return NextResponse.json({
    role: isAdmin ? "coach" : "customer",
    appointment: publicDetails(appt, window),
    can_join: access.ok,
    denial: access.ok
      ? null
      : {
          code: access.code,
          message: access.message,
          available_at: "availableAt" in access ? access.availableAt : undefined,
        },
  });
}
