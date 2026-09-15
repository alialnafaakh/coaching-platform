import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  fetchApprovedPublicReviews,
  parseReviewLanguage,
  summarizePublicReviews,
} from "@/lib/reviews";

export const dynamic = "force-dynamic";

const ROLE_EN = "Verified consultation client";
const ROLE_AR = "عميل استشارة موثّقة";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

/**
 * Public approved reviews for one site language only (ar | en).
 * Never returns the other language, pending/rejected, or private fields.
 */
export async function GET(req: NextRequest) {
  const lang = parseReviewLanguage(req.nextUrl.searchParams.get("lang")) ?? "en";
  const offsetRaw = Number(req.nextUrl.searchParams.get("offset") ?? "0");
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "6");
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
  const limit = Math.min(
    50,
    Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 6)
  );

  try {
    const db = getSupabaseAdmin();
    const all = await fetchApprovedPublicReviews(db, ROLE_EN, ROLE_AR, lang);
    const summary = summarizePublicReviews(all);
    const page = all.slice(offset, offset + limit);

    return NextResponse.json(
      {
        language: lang,
        reviews: page.map(({ created_at: _c, ...pub }) => pub),
        average_rating: summary.average_rating,
        review_count: summary.review_count,
        total_approved: all.length,
        offset,
        limit,
        has_more: offset + page.length < all.length,
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error("Public reviews fetch error:", err instanceof Error ? err.name : "Error");
    return NextResponse.json(
      { error: "Unable to load reviews." },
      { status: 500, headers: NO_STORE }
    );
  }
}
