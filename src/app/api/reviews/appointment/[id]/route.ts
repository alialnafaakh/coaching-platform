import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  getReviewByAppointmentId,
  loadAppointmentWithToken,
  parseComment,
  parseRating,
} from "@/lib/reviews";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function tokenFromRequest(req: NextRequest, body?: Record<string, unknown>): string {
  const fromQuery = req.nextUrl.searchParams.get("token") || "";
  if (fromQuery) return fromQuery;
  return typeof body?.token === "string" ? body.token : "";
}

/** Customer: review eligibility (appointment id + join_token). */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const token = tokenFromRequest(req);

  if (!id || !token) {
    return NextResponse.json(
      { error: "unauthorized", message: "A valid access token is required." },
      { status: 401 }
    );
  }

  const db = getSupabaseAdmin();
  const appt = await loadAppointmentWithToken(db, id, token);
  if (!appt) {
    return NextResponse.json(
      { error: "not_found", message: "Appointment not found." },
      { status: 404 }
    );
  }

  if (appt.status !== "completed") {
    return NextResponse.json({
      eligible: false,
      message: "Reviews are only available after a completed consultation.",
      client_name: appt.client_name,
      consultation_date: appt.time_slots?.date ?? "",
      consultation_start_time: appt.time_slots?.start_time?.slice(0, 5) ?? "",
      existing_review: null,
    });
  }

  const existing = await getReviewByAppointmentId(db, id);

  return NextResponse.json({
    eligible: true,
    client_name: appt.client_name,
    consultation_date: appt.time_slots?.date ?? "",
    consultation_start_time: appt.time_slots?.start_time?.slice(0, 5) ?? "",
    existing_review: existing
      ? {
          moderation_status: existing.moderation_status,
          rating: existing.rating,
          comment: existing.comment,
          created_at: existing.created_at,
        }
      : null,
  });
}

/** Customer: submit one review per completed appointment. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request", message: "Invalid request." }, { status: 400 });
  }

  const token = tokenFromRequest(req, body);
  if (!id || !token) {
    return NextResponse.json(
      { error: "unauthorized", message: "A valid access token is required." },
      { status: 401 }
    );
  }

  const rating = parseRating(body.rating);
  if (rating == null) {
    return NextResponse.json(
      { error: "invalid_rating", message: "Please choose a rating from 1 to 5." },
      { status: 400 }
    );
  }

  const comment = parseComment(body.comment);
  if (body.comment != null && body.comment !== "" && comment == null) {
    return NextResponse.json(
      { error: "invalid_comment", message: "Your review comment is too long." },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();
  const appt = await loadAppointmentWithToken(db, id, token);
  if (!appt) {
    return NextResponse.json(
      { error: "not_found", message: "Appointment not found." },
      { status: 404 }
    );
  }

  if (appt.status !== "completed") {
    return NextResponse.json(
      {
        error: "not_eligible",
        message: "Only completed consultations can receive a review.",
      },
      { status: 403 }
    );
  }

  const existing = await getReviewByAppointmentId(db, id);
  if (existing) {
    return NextResponse.json(
      {
        error: "already_submitted",
        message: "A review has already been submitted for this consultation.",
        moderation_status: existing.moderation_status,
      },
      { status: 409 }
    );
  }

  const { data: created, error: insertError } = await db
    .from("consultation_reviews")
    .insert({
      appointment_id: id,
      rating,
      comment,
      // Always pending — customer cannot set moderation_status.
      moderation_status: "pending",
    })
    .select("id, rating, comment, moderation_status, created_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          error: "already_submitted",
          message: "A review has already been submitted for this consultation.",
        },
        { status: 409 }
      );
    }
    console.error("Review insert error:", insertError.message);
    return NextResponse.json(
      { error: "server_error", message: "Unable to submit your review." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      review: created,
      message: "pending_approval",
    },
    { status: 201 }
  );
}
