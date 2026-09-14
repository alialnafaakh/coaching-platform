import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { tokensMatch } from "@/lib/bookings";
import {
  buildJoinWindow,
  evaluateJoinAccess,
} from "@/lib/consultationAccess";
import {
  createDailyMeetingToken,
  DailyApiError,
  ensureDailyRoom,
  getDailyRoom,
} from "@/lib/daily";
import type { Appointment } from "@/types";

export const dynamic = "force-dynamic";

type ApptRow = Appointment & {
  time_slots: { date: string; start_time: string; end_time: string } | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = Boolean(session);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const token = typeof body.token === "string" ? body.token : "";

  if (!id) {
    return NextResponse.json({ error: "not_found", message: "Appointment not found." }, { status: 404 });
  }
  if (!isAdmin && !token) {
    return NextResponse.json(
      { error: "unauthorized", message: "A valid access token is required." },
      { status: 401 }
    );
  }

  const db = getSupabaseAdmin();
  const { data: appt, error } = await db
    .from("appointments")
    .select("*, time_slots(date, start_time, end_time)")
    .eq("id", id)
    .maybeSingle();

  if (error || !appt || !appt.time_slots) {
    return NextResponse.json({ error: "not_found", message: "Appointment not found." }, { status: 404 });
  }

  const row = appt as ApptRow;

  if (!isAdmin) {
    if (!row.join_token || !tokensMatch(token, row.join_token)) {
      return NextResponse.json({ error: "not_found", message: "Appointment not found." }, { status: 404 });
    }
  }

  const window = buildJoinWindow(row, row.time_slots);
  const access = evaluateJoinAccess({ status: row.status, window });
  if (!access.ok) {
    return NextResponse.json(
      {
        error: access.code,
        message: access.message,
        available_at: "availableAt" in access ? access.availableAt : undefined,
        appointment: {
          id: row.id,
          status: row.status,
          join_opens_at: window.joinOpensAtIso,
          join_closes_at: window.joinClosesAtIso,
          scheduled_start: window.scheduledStartIso,
          session_duration_minutes: window.sessionDurationMinutes,
        },
      },
      { status: 403 }
    );
  }

  try {
    let room = await ensureDailyRoom(row.room_id, row.id);

    // Claim room_id only when still null to avoid clobbering a concurrent winner.
    if (!row.room_id) {
      const { data: claimed } = await db
        .from("appointments")
        .update({ room_id: room.name })
        .eq("id", row.id)
        .is("room_id", null)
        .select("room_id")
        .maybeSingle();

      if (!claimed) {
        const { data: fresh } = await db
          .from("appointments")
          .select("room_id")
          .eq("id", row.id)
          .maybeSingle();
        if (fresh?.room_id) {
          const winner = await getDailyRoom(fresh.room_id);
          if (winner) room = winner;
        }
      }
    } else if (row.room_id !== room.name) {
      // Keep the stored room_id as source of truth if Daily still has it.
      const stored = await getDailyRoom(row.room_id);
      if (stored) {
        room = stored;
      } else {
        await db.from("appointments").update({ room_id: room.name }).eq("id", row.id);
      }
    }

    // First valid join: confirmed → in_progress, set started_at once (never overwrite).
    if (row.status === "confirmed") {
      await db
        .from("appointments")
        .update({
          status: "in_progress",
          started_at: row.started_at || new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("status", "confirmed");
    } else if (row.status === "in_progress" && !row.started_at) {
      await db
        .from("appointments")
        .update({ started_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", "in_progress")
        .is("started_at", null);
    }

    const userName = isAdmin ? "Maryem" : row.client_name || "Guest";
    const closesAt = Math.floor(new Date(window.joinClosesAtIso).getTime() / 1000);
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresInSeconds = Math.max(60, Math.min(60 * 60 * 3, closesAt - nowSec + 60));

    const meetingToken = await createDailyMeetingToken({
      roomName: room.name,
      userName,
      isOwner: isAdmin,
      expiresInSeconds,
    });

    return NextResponse.json({
      role: isAdmin ? "coach" : "customer",
      room_url: room.url,
      token: meetingToken,
      user_name: userName,
      appointment: {
        id: row.id,
        status: row.status === "confirmed" ? "in_progress" : row.status,
        session_duration_minutes: window.sessionDurationMinutes,
        scheduled_start: window.scheduledStartIso,
        join_closes_at: window.joinClosesAtIso,
      },
    });
  } catch (err) {
    // Do not log tokens or request bodies.
    console.error(
      "Consultation join error:",
      err instanceof DailyApiError
        ? { name: err.name, status: err.status, message: err.message }
        : { name: err instanceof Error ? err.name : "Error" }
    );
    if (err instanceof DailyApiError) {
      const message =
        err.message.includes("not configured")
          ? "Video consultations are not configured yet."
          : "Unable to connect to the consultation room. Please try again.";
      return NextResponse.json(
        { error: "daily_error", message },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "server_error", message: "Unable to join the consultation." },
      { status: 500 }
    );
  }
}
