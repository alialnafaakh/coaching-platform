import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  fetchApprovedPublicReviews,
  summarizePublicReviews,
} from "@/lib/reviews";

export const dynamic = "force-dynamic";

const ROLE_EN = "Verified consultation client";
const ROLE_AR = "عميل استشارة موثّقة";

/**
 * Public approved reviews only. Never returns pending/rejected rows.
 * Aggregate average is derived from the same public rows (one DB query).
 * Response never includes appointment ids, email, join_token, or other private fields.
 */
export async function GET(req: NextRequest) {
  const langParam = req.nextUrl.searchParams.get("lang");
  const lang = langParam === "ar" ? "ar" : "en";

  try {
    const db = getSupabaseAdmin();
    const reviews = await fetchApprovedPublicReviews(db, ROLE_EN, ROLE_AR, lang);
    const summary = summarizePublicReviews(reviews);
    return NextResponse.json({
      reviews,
      average_rating: summary.average_rating,
      review_count: summary.review_count,
    });
  } catch (err) {
    console.error("Public reviews fetch error:", err instanceof Error ? err.name : "Error");
    return NextResponse.json({ error: "Unable to load reviews." }, { status: 500 });
  }
}
