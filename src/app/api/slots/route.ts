import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { expireExpiredHolds } from "@/lib/bookings";
import {
  endTimeFromStart,
  getConsultationSettings,
} from "@/lib/consultationSettings";
import { isIstanbulSlotStartInFuture } from "@/lib/consultationAccess";

export const dynamic = "force-dynamic";

type SlotInput = { date?: string; start_time?: string; end_time?: string };

function padTime(value: string): string {
  const [h = "00", m = "00", s = "00"] = value.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`;
}

function slotKey(date: string, start: string) {
  return `${date}|${padTime(start).slice(0, 5)}`;
}

function normalizeSlots(body: SlotInput & { slots?: SlotInput[] }): SlotInput[] {
  if (Array.isArray(body.slots) && body.slots.length > 0) return body.slots;
  return [{ date: body.date, start_time: body.start_time, end_time: body.end_time }];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const admin = searchParams.get("admin");
  const db = getSupabaseAdmin();
  try {
    await expireExpiredHolds(db);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
      .from("time_slots")
      .select("*")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (date) query = query.eq("date", date);
    if (!admin) query = query.eq("is_booked", false);

    const { data, error } = await query;
    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json({ error: "Unable to load available times." }, { status: 500 });
    }

    // Public list: hide slots whose Istanbul start time has already passed (same-day OK if still future).
    const rows = admin
      ? data || []
      : (data || []).filter((slot: { date: string; start_time: string }) =>
          isIstanbulSlotStartInFuture(slot.date, slot.start_time)
        );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Unexpected error during Supabase fetch:", err);
    return NextResponse.json({ error: "Unable to load available times." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const db = getSupabaseAdmin();
  const settings = await getConsultationSettings(db);
  const duration = settings.session_duration_minutes;

  const items = normalizeSlots(body)
    .filter((item) => item.date && item.start_time)
    .map((item) => {
      const start = padTime(item.start_time as string);
      const end = padTime(endTimeFromStart(start.slice(0, 5), duration));
      return {
        date: item.date as string,
        start_time: start,
        end_time: end,
        is_booked: false,
      };
    });

  if (items.length === 0) {
    return NextResponse.json(
      { error: "date and start_time are required" },
      { status: 400 }
    );
  }

  try {
    const dates = Array.from(new Set(items.map((item) => item.date)));
    const { data: existing, error: existingError } = await db
      .from("time_slots")
      .select("date, start_time")
      .in("date", dates);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const taken = new Set(
      (existing || []).map((row: { date: string; start_time: string }) =>
        slotKey(row.date, row.start_time)
      )
    );
    const toInsert = items.filter((item) => !taken.has(slotKey(item.date, item.start_time)));

    if (toInsert.length === 0) {
      return NextResponse.json({
        created: [],
        skipped: items.length,
        session_duration_minutes: duration,
      });
    }

    const { data, error } = await db.from("time_slots").insert(toInsert).select();
    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        created: data || [],
        skipped: items.length - (data?.length || 0),
        session_duration_minutes: duration,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Unexpected error during Supabase insert:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  let ids: string[] = id ? [id] : [];

  if (ids.length === 0) {
    try {
      const body = await req.json();
      if (Array.isArray(body?.ids)) ids = body.ids.filter(Boolean);
    } catch {
      ids = [];
    }
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: slots, error: fetchError } = await db
    .from("time_slots")
    .select("id, is_booked")
    .in("id", ids);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const deletable = (slots || []).filter((slot) => !slot.is_booked).map((slot) => slot.id);
  const blocked = (slots || []).length - deletable.length;

  if (deletable.length === 0) {
    return NextResponse.json(
      { error: blocked > 0 ? "Cannot delete a booked slot" : "No slots to delete" },
      { status: 409 }
    );
  }

  const { error } = await db.from("time_slots").delete().in("id", deletable);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, deleted: deletable.length, blocked });
}
