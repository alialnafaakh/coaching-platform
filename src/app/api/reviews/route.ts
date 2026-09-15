import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  countFeaturedByLanguage,
  FEATURED_REVIEW_MAX,
  parseReviewLanguage,
} from "@/lib/reviews";

export const dynamic = "force-dynamic";

/** Admin: list all consultation reviews with appointment context. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();

  let data: unknown[] | null = null;
  let featuredSupported = true;
  let languageSupported = true;

  const full = await db
    .from("consultation_reviews")
    .select(
      "id, appointment_id, rating, comment, moderation_status, language, is_featured, created_at, reviewed_at, appointments(client_name, time_slots(date, start_time))"
    )
    .order("created_at", { ascending: false });

  if (full.error) {
    languageSupported = false;
    const withFeatured = await db
      .from("consultation_reviews")
      .select(
        "id, appointment_id, rating, comment, moderation_status, is_featured, created_at, reviewed_at, appointments(client_name, time_slots(date, start_time))"
      )
      .order("created_at", { ascending: false });

    if (withFeatured.error) {
      featuredSupported = false;
      const fallback = await db
        .from("consultation_reviews")
        .select(
          "id, appointment_id, rating, comment, moderation_status, created_at, reviewed_at, appointments(client_name, time_slots(date, start_time))"
        )
        .order("created_at", { ascending: false });
      if (fallback.error) {
        console.error("Admin reviews list error:", fallback.error.message);
        return NextResponse.json({ error: "Unable to load reviews." }, { status: 500 });
      }
      data = fallback.data || [];
    } else {
      data = withFeatured.data || [];
    }
  } else {
    data = full.data || [];
  }

  const rows = (data || []).map((rowUnknown) => {
    const row = rowUnknown as Record<string, unknown>;
    const apptRaw = row.appointments;
    const apptRow = Array.isArray(apptRaw) ? apptRaw[0] : apptRaw;
    const appt = apptRow as { client_name?: string; time_slots?: unknown } | null;
    const slotRaw = appt?.time_slots;
    const slotRow = Array.isArray(slotRaw) ? slotRaw[0] : slotRaw;
    const slot = slotRow as { date?: string; start_time?: string } | undefined;
    const language = languageSupported ? parseReviewLanguage(row.language) : null;
    return {
      id: row.id,
      appointment_id: row.appointment_id,
      rating: row.rating,
      comment: row.comment,
      moderation_status: row.moderation_status,
      language,
      is_featured: featuredSupported ? row.is_featured === true : false,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      client_name: appt?.client_name ?? "",
      consultation_date: slot?.date ?? "",
      consultation_start_time: slot?.start_time?.slice(0, 5) ?? "",
    };
  });

  const featured = await countFeaturedByLanguage(db);

  return NextResponse.json({
    reviews: rows,
    featured_count_ar: featured.ar,
    featured_count_en: featured.en,
    featured_max: FEATURED_REVIEW_MAX,
    featured_supported: featuredSupported && featured.supported,
    language_supported: languageSupported,
  });
}
