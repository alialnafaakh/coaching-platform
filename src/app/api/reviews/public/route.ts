import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchApprovedPublicReviews } from "@/lib/reviews";

export const dynamic = "force-dynamic";

const ROLE_EN = "Verified consultation client";
const ROLE_AR = "عميل استشارة موثّقة";

/**
 * Public approved reviews only. Never returns pending/rejected rows.
 */
export async function GET(req: NextRequest) {
  const langParam = req.nextUrl.searchParams.get("lang");
  const lang = langParam === "ar" ? "ar" : "en";

  try {
    const db = getSupabaseAdmin();
    const reviews = await fetchApprovedPublicReviews(db, ROLE_EN, ROLE_AR, lang);
    return NextResponse.json({ reviews });
  } catch (err) {
    console.error("Public reviews fetch error:", err instanceof Error ? err.name : "Error");
    return NextResponse.json({ error: "Unable to load reviews." }, { status: 500 });
  }
}
