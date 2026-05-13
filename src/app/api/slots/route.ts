import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CreateSlotPayload } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const admin = searchParams.get("admin");
  const db = getSupabaseAdmin();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
      .from("time_slots")
      .select("*")
      .order("start_time", { ascending: true });

    if (date) query = query.eq("date", date);
    if (!admin) query = query.eq("is_booked", false);

    const { data, error } = await query;
    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Unexpected error during Supabase fetch:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateSlotPayload = await req.json();
  const { date, start_time, end_time } = body;

  if (!date || !start_time || !end_time) {
    return NextResponse.json({ error: "date, start_time, and end_time are required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  try {
    const { data, error } = await db
      .from("time_slots")
      .insert({ date, start_time, end_time, is_booked: false })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Unexpected error during Supabase insert:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: slot } = await db.from("time_slots").select("is_booked").eq("id", id).single();

  if (slot?.is_booked) {
    return NextResponse.json({ error: "Cannot delete a booked slot" }, { status: 409 });
  }

  const { error } = await db.from("time_slots").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
